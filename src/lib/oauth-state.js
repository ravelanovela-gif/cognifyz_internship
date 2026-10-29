const crypto = require("node:crypto");

function isValidOAuthState(expected, supplied) {
  if (typeof expected !== "string" || typeof supplied !== "string") return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

function isFreshOAuthState(savedState, now = Date.now()) {
  return (
    savedState !== null &&
    typeof savedState === "object" &&
    typeof savedState.value === "string" &&
    Number.isFinite(savedState.createdAt) &&
    now >= savedState.createdAt &&
    now - savedState.createdAt <= 10 * 60 * 1000
  );
}

module.exports = { isFreshOAuthState, isValidOAuthState };
