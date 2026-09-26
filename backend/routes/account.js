const express = require("express");
const { setUserRole } = require("../services/db");

const router = express.Router();

// GET /api/account — profile + whether a role still needs to be picked
router.get("/", (req, res) => {
  const u = req.dbUser;
  res.json({ sub: u.auth0_sub, email: u.email, role: u.role, roleSelected: !!u.role_selected });
});

// POST /api/account/role  { role: "student" | "parent" | "teacher" }
router.post("/role", (req, res) => {
  const { role } = req.body;
  if (!["student", "parent", "teacher"].includes(role)) {
    return res.status(400).json({ error: "role must be student, parent, or teacher" });
  }
  if (req.dbUser.role_selected) {
    return res.status(400).json({ error: "Role already set for this account" });
  }
  const updated = setUserRole(req.dbUser.auth0_sub, role);
  res.json({ sub: updated.auth0_sub, role: updated.role });
});

module.exports = router;