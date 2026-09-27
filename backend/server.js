require("dotenv").config();
const express = require("express");
const cors = require("cors");

const accountRouter = require("./routes/account");
const linkRouter = require("./routes/link");
const { checkJwt, attachUser } = require("./middleware/auth");


const personasRouter = require("./routes/personas");
const sessionRouter = require("./routes/session");
const historyRouter = require("./routes/history");
const voiceRouter = require("./routes/voice");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);
// 20mb (not 2mb) because /api/voice/transcribe accepts base64-encoded audio
// recordings as a fallback for browsers whose native speech recognition
// doesn't work (see routes/voice.js) — base64 inflates the raw size ~33%.
app.use(express.json({ limit: "20mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "say-it-back-api", time: new Date().toISOString() });
});

app.use("/api/account", checkJwt, attachUser, accountRouter);
app.use("/api/personas", checkJwt, attachUser, personasRouter);
app.use("/api/session", checkJwt, attachUser, sessionRouter);
app.use("/api/history", checkJwt, attachUser, historyRouter);
app.use("/api/link", checkJwt, attachUser, linkRouter);
app.use("/api/voice", checkJwt, attachUser, voiceRouter);

app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ error: "Invalid or missing token" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Say It Back API listening on port ${PORT}`);
});