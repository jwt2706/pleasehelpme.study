const ENABLED =
  process.env.ELEVENLABS_ENABLED === "true" && !!process.env.ELEVENLABS_API_KEY;

class ElevenLabsRequestError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "ElevenLabsRequestError";
    this.statusCode = statusCode;
  }
}

async function errorFromResponse(res) {
  const bodyText = await res.text().catch(() => "");
  let detail = bodyText;
  try {
    const parsed = JSON.parse(bodyText);
    detail = parsed?.detail?.message || parsed?.detail || bodyText;
  } catch (_) {
    /* not JSON, use raw text as-is */
  }

  if (res.status === 401) {
    return new ElevenLabsRequestError(
      "ElevenLabs rejected the API key (HTTP 401). Double-check ELEVENLABS_API_KEY.",
      502
    );
  }
  if (res.status === 403) {
    return new ElevenLabsRequestError(
      `ElevenLabs denied this request (HTTP 403) — the key may not have access to this voice or feature. Detail: ${detail || "none"}`,
      502
    );
  }
  if (res.status === 404) {
    return new ElevenLabsRequestError(
      "ElevenLabs couldn't find that voice ID (HTTP 404). It may have been removed from your account.",
      502
    );
  }
  if (res.status === 422) {
    return new ElevenLabsRequestError(
      `ElevenLabs rejected the request as invalid (HTTP 422). Detail: ${detail || "none"}`,
      502
    );
  }
  if (res.status === 429) {
    return new ElevenLabsRequestError(
      "ElevenLabs rate-limited this request (HTTP 429) — you're over your quota or concurrency limit.",
      503
    );
  }
  if (res.status >= 500) {
    return new ElevenLabsRequestError(
      `ElevenLabs's servers had a problem (HTTP ${res.status}) — try again shortly.`,
      503
    );
  }
  return new ElevenLabsRequestError(
    `ElevenLabs request failed (HTTP ${res.status}): ${detail || res.statusText}`,
    502
  );
}

/**
 * Returns an audio Buffer (mp3) for the given text + voiceId.
 * Throws ElevenLabsRequestError with a specific reason on failure — callers
 * should catch this and surface err.message / err.statusCode, not swallow it.
 */
async function speak(text, voiceId) {
  if (!ENABLED) {
    throw new ElevenLabsRequestError(
      "Voice narration isn't configured on the server — set ELEVENLABS_API_KEY and ELEVENLABS_ENABLED=true.",
      503
    );
  }
  if (!voiceId) {
    throw new ElevenLabsRequestError("No voiceId was provided.", 400);
  }

  let res;
  try {
    res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
      }),
    });
  } catch (err) {
    throw new ElevenLabsRequestError(
      `Couldn't reach ElevenLabs — network error: ${err.message}`,
      502
    );
  }

  if (!res.ok) {
    throw await errorFromResponse(res);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Lists the voices available to this API key, as [{ voice_id, name }].
 */
async function listVoices() {
  if (!ENABLED) return [];

  let res;
  try {
    res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    });
  } catch (err) {
    throw new ElevenLabsRequestError(
      `Couldn't reach ElevenLabs — network error: ${err.message}`,
      502
    );
  }

  if (!res.ok) {
    throw await errorFromResponse(res);
  }

  const data = await res.json();
  return (data.voices || []).map((v) => ({ voice_id: v.voice_id, name: v.name }));
}

module.exports = { speak, listVoices, ENABLED, ElevenLabsRequestError };