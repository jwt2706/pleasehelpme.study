const express = require("express");
const { getPersonas } = require("../config/personas");
const { upsertUser, getUser } = require("../services/db");

const router = express.Router();

// GET /api/personas — list personas (comprehension levels) + this user's streak
router.get("/", (req, res) => {
  const sub = req.auth.payload.sub;
  const email = req.auth.payload.email;
  const user = upsertUser(sub, email) || getUser(sub);

  res.json({
    personas: getPersonas(),
    sessionsCompleted: user.sessions_completed,
    streak: user.streak_count,
  });
});

module.exports = router;