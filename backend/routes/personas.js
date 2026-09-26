const express = require("express");
const { getUnlockedPersonas } = require("../config/personas");
const { upsertUser, getUser } = require("../services/db");

const router = express.Router();

// GET /api/personas — list personas with lock state for this user
router.get("/", (req, res) => {
  const sub = req.auth.payload.sub;
  const email = req.auth.payload.email;
  const user = upsertUser(sub, email) || getUser(sub);

  const personas = getUnlockedPersonas(user.sessions_completed).map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    locked: p.locked,
  }));

  res.json({ personas, sessionsCompleted: user.sessions_completed, streak: user.streak_count });
});

module.exports = router;
