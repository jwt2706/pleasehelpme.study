const express = require("express");
const {
  generateLinkCode,
  redeemLinkCode,
  getLinkedStudents,
  getGuardiansForStudent,
  removeLink,
} = require("../services/db");

const router = express.Router();

// POST /api/link/code — generate an invite code as the current user
router.post("/code", (req, res) => {
  const { code, expiresAt } = generateLinkCode(req.dbUser.auth0_sub, req.dbUser.role);
  res.json({ code, expiresAt });
});

// POST /api/link/redeem  { code }
router.post("/redeem", (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "code is required" });
  try {
    const result = redeemLinkCode(code.trim().toLowerCase(), req.dbUser.auth0_sub, req.dbUser.role);
    res.json({ linked: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/link/students — guardian: list linked students
router.get("/students", (req, res) => {
  if (!["parent", "teacher"].includes(req.dbUser.role)) {
    return res.status(403).json({ error: "Only parent/teacher accounts have students" });
  }
  res.json({ students: getLinkedStudents(req.dbUser.auth0_sub) });
});

// GET /api/link/guardians — student: who currently has access to them
router.get("/guardians", (req, res) => {
  if (req.dbUser.role !== "student") {
    return res.status(403).json({ error: "Only student accounts have guardians" });
  }
  res.json({ guardians: getGuardiansForStudent(req.dbUser.auth0_sub) });
});

// DELETE /api/link/:otherSub — either side can end the relationship
router.delete("/:otherSub", (req, res) => {
  const me = req.dbUser.auth0_sub;
  const other = req.params.otherSub;
  if (req.dbUser.role === "student") removeLink(other, me);
  else removeLink(me, other);
  res.json({ removed: true });
});

module.exports = router;