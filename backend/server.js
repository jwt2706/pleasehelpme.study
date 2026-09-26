require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { checkJwt } = require("./middleware/auth");

const personasRouter = require("./routes/personas");
const sessionRouter = require("./routes/session");

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
app.use(express.json({ limit: "2mb" }));

// Public health check — used to verify the Vultr deploy is actually live
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "say-it-back-api", time: new Date().toISOString() });
});

// Everything below requires a valid Auth0 JWT
app.use("/api/personas", checkJwt, personasRouter);
app.use("/api/session", checkJwt, sessionRouter);

// Auth error handler (bad/missing token → clean 401 instead of a stack trace)
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