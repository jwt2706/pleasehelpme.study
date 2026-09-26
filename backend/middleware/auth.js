const { auth } = require("express-oauth2-jwt-bearer");

// Validates the Auth0-issued JWT on every protected route.
// Frontend gets this token from Auth0 Universal Login / SDK and sends it as:
//   Authorization: Bearer <token>
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: "RS256",
});

module.exports = { checkJwt };
