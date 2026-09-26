const { auth } = require("express-oauth2-jwt-bearer");
const { getUser, upsertUser } = require("../services/db");

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: "RS256",
});

// Loads (or creates) the local user row for every authenticated request,
// so route handlers can trust req.dbUser.role instead of anything the client sends.
function attachUser(req, res, next) {
  const sub = req.auth?.payload?.sub;
  const email = req.auth?.payload?.email;
  let user = getUser(sub);
  if (!user) user = upsertUser(sub, email);
  req.dbUser = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.dbUser || !roles.includes(req.dbUser.role)) {
      return res.status(403).json({ error: "Not authorized for this action" });
    }
    next();
  };
}

module.exports = { checkJwt, attachUser, requireRole };