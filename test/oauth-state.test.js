const test = require("node:test");
const assert = require("node:assert/strict");
const { isFreshOAuthState, isValidOAuthState } = require("../src/lib/oauth-state");

test("OAuth state accepts the matching value and rejects mismatches", () => {
  assert.equal(isValidOAuthState("random-state", "random-state"), true);
  assert.equal(isValidOAuthState("random-state", "other-state"), false);
  assert.equal(isValidOAuthState("random-state", "short"), false);
  assert.equal(isValidOAuthState(undefined, "random-state"), false);
});

test("OAuth state is accepted only during its ten-minute lifetime", () => {
  const savedState = { value: "random-state", createdAt: 1000 };
  assert.equal(isFreshOAuthState(savedState, 1000), true);
  assert.equal(isFreshOAuthState(savedState, 601000), true);
  assert.equal(isFreshOAuthState(savedState, 601001), false);
  assert.equal(isFreshOAuthState(savedState, 999), false);
  assert.equal(isFreshOAuthState(null, 1000), false);
});
