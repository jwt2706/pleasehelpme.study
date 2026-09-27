const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const TURN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    reaction: { type: SchemaType.STRING },
    follow_up_question: { type: SchemaType.STRING },
    confusion_level: { type: SchemaType.INTEGER },
    detected_gap: { type: SchemaType.STRING },
  },
  required: ["reaction", "follow_up_question", "confusion_level", "detected_gap"],
};

const REPORT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    nailed: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    gaps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    flashcards: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          front: { type: SchemaType.STRING },
          back: { type: SchemaType.STRING },
        },
        required: ["front", "back"],
      },
    },
  },
  required: ["nailed", "gaps", "flashcards"],
};

// Carries a status code so the route can return something more useful
// than a blanket 500, and a message that says WHY rather than just "failed."
class GeminiRequestError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "GeminiRequestError";
    this.statusCode = statusCode;
  }
}

function wrapGeminiError(err) {
  if (!process.env.GEMINI_API_KEY) {
    return new GeminiRequestError(
      "GEMINI_API_KEY is not set on the server — Gemini calls can't run without it.",
      500
    );
  }

  // The SDK's thrown errors usually stringify like
  // "[503 Service Unavailable] The model is overloaded" — pull the HTTP
  // status out of that if it's there.
  const match = /\[(\d{3})\s*([^\]]*)\]/.exec(err?.message || "");
  const httpStatus = match ? Number(match[1]) : err?.status;
  const httpStatusText = match ? match[2].trim() : undefined;

  if (httpStatus === 400) {
    return new GeminiRequestError(
      `Gemini rejected the request as malformed (HTTP 400) — check the server logs for the raw prompt/schema. Raw: ${err.message}`,
      502
    );
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return new GeminiRequestError(
      `Gemini rejected the API key (HTTP ${httpStatus}). Double-check GEMINI_API_KEY is valid and has access to "${MODEL_NAME}".`,
      502
    );
  }
  if (httpStatus === 404) {
    return new GeminiRequestError(
      `Gemini couldn't find the model "${MODEL_NAME}" (HTTP 404). Check GEMINI_MODEL is spelled correctly and available to your key.`,
      502
    );
  }
  if (httpStatus === 429) {
    return new GeminiRequestError(
      "Gemini rate-limited this request (HTTP 429) — you're over your quota or requests-per-minute limit. Try again shortly.",
      503
    );
  }
  if (httpStatus === 500 || httpStatus === 503) {
    return new GeminiRequestError(
      `Gemini's servers had a problem (HTTP ${httpStatus}${httpStatusText ? ` ${httpStatusText}` : ""}) — this is on Google's end, try again in a moment.`,
      503
    );
  }
  if (err instanceof SyntaxError) {
    return new GeminiRequestError(
      "Gemini returned a response that wasn't valid JSON, even in JSON mode — it may have hit a length limit or had an internal hiccup. Try again.",
      502
    );
  }

  return new GeminiRequestError(
    `Gemini request failed${httpStatus ? ` (HTTP ${httpStatus})` : ""}: ${err?.message || "unknown error"}`,
    502
  );
}

/**
 * One turn of persona reaction + follow-up question.
 * history: array of { role: "user"|"assistant", text: string }
 */
async function getPersonaTurn({ topic, systemPrompt, history, latestExplanation }) {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: TURN_SCHEMA,
    },
  });

  const transcript = history
    .map((turn) => `${turn.role === "user" ? "Learner" : "You"}: ${turn.text}`)
    .join("\n");

  const prompt = `Topic the learner is explaining: "${topic}"

Conversation so far:
${transcript || "(this is the first exchange)"}

Learner's latest explanation:
"${latestExplanation}"

Respond in character with your JSON reaction, per the schema.`;

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (err) {
    throw wrapGeminiError(err);
  }

  try {
    return JSON.parse(result.response.text());
  } catch (err) {
    throw wrapGeminiError(err);
  }
}

/**
 * End-of-session Gap Report + flashcards.
 */
async function getGapReport({ topic, history, detectedGaps }) {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: REPORT_SCHEMA,
    },
  });

  const transcript = history
    .map((turn) => `${turn.role === "user" ? "Learner" : "Persona"}: ${turn.text}`)
    .join("\n");

  const prompt = `The learner tried to explain the topic "${topic}" to a persona
across a short conversation, so they could find gaps in their own understanding
(this is the Feynman self-explanation technique).

Full conversation:
${transcript}

Gaps flagged during the conversation:
${detectedGaps.map((g, i) => `${i + 1}. ${g}`).join("\n")}

Produce a Gap Report as JSON: what the learner explained well ("nailed"),
specific gaps in their understanding ("gaps"), and 2-3 flashcards (front =
question, back = answer) built directly from the gaps so they can study them.`;

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (err) {
    throw wrapGeminiError(err);
  }

  try {
    return JSON.parse(result.response.text());
  } catch (err) {
    throw wrapGeminiError(err);
  }
}

/**
 * Transcribes a short audio clip — used as a fallback for browsers (Brave,
 * Firefox) whose built-in Web Speech API either doesn't work or doesn't
 * exist. audioBase64 is raw base64 audio data (no "data:" URL prefix).
 */
async function transcribeAudio({ audioBase64, mimeType }) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `Transcribe the words spoken in this audio clip exactly as
spoken. Return ONLY the transcript text — no labels, quotation marks, or
commentary. If nothing intelligible was said, return an empty string.`;

  let result;
  try {
    result = await model.generateContent([
      { inlineData: { data: audioBase64, mimeType: mimeType || "audio/webm" } },
      { text: prompt },
    ]);
  } catch (err) {
    throw wrapGeminiError(err);
  }

  try {
    return result.response.text().trim();
  } catch (err) {
    throw wrapGeminiError(err);
  }
}

module.exports = { getPersonaTurn, getGapReport, transcribeAudio, GeminiRequestError };