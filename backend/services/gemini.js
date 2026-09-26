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

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
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

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

module.exports = { getPersonaTurn, getGapReport };
