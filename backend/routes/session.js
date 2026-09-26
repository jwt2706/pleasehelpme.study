const express = require("express");
const { getPersonaById } = require("../config/personas");
const { getPersonaTurn, getGapReport } = require("../services/gemini");
const { speak, ENABLED: VOICE_ENABLED } = require("../services/elevenlabs");
const { completeSession } = require("../services/db");

const router = express.Router();

// POST /api/session/turn
// body: { topic, personaId, history: [{role, text}], latestExplanation, detectedGaps: [] }
router.post("/turn", async (req, res) => {
  try {
    const { topic, personaId, history = [], latestExplanation } = req.body;
    const persona = getPersonaById(personaId);
    if (!persona) return res.status(400).json({ error: "Unknown persona" });
    if (!topic || !latestExplanation) {
      return res.status(400).json({ error: "topic and latestExplanation are required" });
    }

    const turn = await getPersonaTurn({
      topic,
      systemPrompt: persona.systemPrompt,
      history,
      latestExplanation,
    });

    let audio = null;
    if (VOICE_ENABLED && persona.voiceId) {
      const buf = await speak(`${turn.reaction} ${turn.follow_up_question}`, persona.voiceId);
      if (buf) audio = buf.toString("base64");
    }

    res.json({ ...turn, audio });
  } catch (err) {
    console.error("Error in /session/turn:", err);
    res.status(500).json({ error: "Failed to generate persona turn" });
  }
});

// POST /api/session/complete
// body: { topic, personaId, history: [{role, text}], detectedGaps: [] }
router.post("/complete", async (req, res) => {
  try {
    const { topic, personaId, history = [], detectedGaps = [] } = req.body;
    if (!topic || !personaId) {
      return res.status(400).json({ error: "topic and personaId are required" });
    }

    const gapReport = await getGapReport({ topic, history, detectedGaps });

    const sub = req.auth.payload.sub;
    const user = completeSession({ sub, topic, personaId, transcript: history, gapReport });

    res.json({ gapReport, sessionsCompleted: user.sessions_completed, streak: user.streak_count });
  } catch (err) {
    console.error("Error in /session/complete:", err);
    res.status(500).json({ error: "Failed to generate gap report" });
  }
});

module.exports = router;
