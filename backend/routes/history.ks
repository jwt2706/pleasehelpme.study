const express = require("express");
const { getSessionHistory } = require("../services/db");
const { getPersonaById } = require("../config/personas");

const router = express.Router();

// GET /api/history — every past session for this user, plus aggregate stats
router.get("/", (req, res) => {
  const sub = req.auth.payload.sub;
  const sessions = getSessionHistory(sub);

  const byPersonaCount = {};
  const gapsOverTime = [];
  let totalGaps = 0;
  let totalFlashcards = 0;
  const allFlashcards = [];

  for (const s of sessions) {
    byPersonaCount[s.personaId] = (byPersonaCount[s.personaId] || 0) + 1;

    const gaps = s.gapReport?.gaps || [];
    const flashcards = s.gapReport?.flashcards || [];
    totalGaps += gaps.length;
    totalFlashcards += flashcards.length;

    gapsOverTime.push({
      date: s.createdAt,
      topic: s.topic,
      gapCount: gaps.length,
    });

    for (const card of flashcards) {
      allFlashcards.push({ ...card, topic: s.topic, sessionId: s.id });
    }
  }

  const personaBreakdown = Object.entries(byPersonaCount).map(([personaId, count]) => {
    const persona = getPersonaById(personaId);
    return { personaId, name: persona?.name || personaId, count };
  });

  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      topic: s.topic,
      personaId: s.personaId,
      createdAt: s.createdAt,
      nailed: s.gapReport?.nailed || [],
      gaps: s.gapReport?.gaps || [],
      flashcards: s.gapReport?.flashcards || [],
    })),
    stats: {
      totalSessions: sessions.length,
      totalGaps,
      totalFlashcards,
      personaBreakdown,
      gapsOverTime: gapsOverTime.slice().reverse(), // chronological order for charting
    },
    allFlashcards,
  });
});

module.exports = router;