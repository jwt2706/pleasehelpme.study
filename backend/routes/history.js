const express = require("express");
const { getSessionHistory, isLinked } = require("../services/db");
const { getPersonaById } = require("../config/personas");

const router = express.Router();

function buildHistoryPayload(sub) {
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
    gapsOverTime.push({ date: s.createdAt, topic: s.topic, gapCount: gaps.length });
    for (const card of flashcards) allFlashcards.push({ ...card, topic: s.topic, sessionId: s.id });
  }

  const personaBreakdown = Object.entries(byPersonaCount).map(([personaId, count]) => {
    const persona = getPersonaById(personaId);
    return { personaId, name: persona?.name || personaId, count };
  });

  return {
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
      gapsOverTime: gapsOverTime.slice().reverse(),
    },
    allFlashcards,
  };
}

// GET /api/history — my own history
router.get("/", (req, res) => {
  res.json(buildHistoryPayload(req.dbUser.auth0_sub));
});

// GET /api/history/student/:studentSub — a guardian viewing a linked student's history
router.get("/student/:studentSub", (req, res) => {
  if (!["parent", "teacher"].includes(req.dbUser.role)) {
    return res.status(403).json({ error: "Only parent/teacher accounts can view a student's history" });
  }
  if (!isLinked(req.dbUser.auth0_sub, req.params.studentSub)) {
    return res.status(403).json({ error: "You don't have access to this student's reports" });
  }
  res.json(buildHistoryPayload(req.params.studentSub));
});

module.exports = router;