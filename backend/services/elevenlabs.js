const ENABLED =
  process.env.ELEVENLABS_ENABLED === "true" && !!process.env.ELEVENLABS_API_KEY;

/**
 * Returns an audio Buffer (mp3) for the given text + voiceId, or null if
 * ElevenLabs is disabled / not configured. Callers should treat null as
 * "no audio for this turn" and continue silently — voice is a bonus, not
 * a requirement for the core loop.
 */
async function speak(text, voiceId) {
  if (!ENABLED || !voiceId) return null;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
      }),
    }
  );

  if (!res.ok) {
    console.error("ElevenLabs TTS failed:", res.status, await res.text());
    return null;
  }

  return Buffer.from(await res.arrayBuffer());
}

module.exports = { speak, ENABLED };
