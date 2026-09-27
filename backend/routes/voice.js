const express = require("express");
const { speak, listVoices, ENABLED } = require("../services/elevenlabs");

const router = express.Router();

// GET /api/voice/status — is narration configured, and what voices exist
router.get("/status", async (req, res) => {
  if (!ENABLED) {
    return res.json({ available: false, voices: [] });
  }
  try {
    const voices = await listVoices();
    res.json({ available: true, voices });
  } catch (err) {
    console.error("Error in /voice/status:", err);
    res.status(err.statusCode || 500).json({
      available: false,
      voices: [],
      error: err.message || "Failed to fetch voices",
    });
  }
});

// POST /api/voice/speak  { text, voiceId } -> audio/mpeg
router.post("/speak", async (req, res) => {
  const { text, voiceId } = req.body;
  if (!text || !voiceId) {
    return res.status(400).json({ error: "text and voiceId are required" });
  }
  try {
    const audio = await speak(text, voiceId);
    res.set("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (err) {
    console.error("Error in /voice/speak:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to generate narration",
    });
  }
});

module.exports = router;