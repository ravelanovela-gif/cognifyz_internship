const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateLogin,
  validateProject,
  validateRegistration
} = require("../src/lib/validation");

test("registration validation normalizes name and email and accepts a strong password", () => {
  const result = validateRegistration({
    name: "  Alex Doe  ",
    email: "  ALEX@example.com ",
    password: "StrongPass9"
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.name, "Alex Doe");
  assert.equal(result.value.email, "alex@example.com");
});

test("registration rejects weak passwords and malformed email", () => {
  const result = validateRegistration({ name: "A", email: "bad", password: "short" });
  assert.equal(result.errors.length, 3);
});

test("project validation enforces field limits and known statuses", () => {
  const result = validateProject({ title: "AI Dashboard", description: "A useful portfolio project.", status: "completed" });
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.status, "completed");
  assert.equal(validateProject({ title: "x", description: "tiny", status: "unknown" }).errors.length, 3);
});

test("login validation requires a valid email and a password", () => {
  assert.equal(validateLogin({ email: "me@example.com", password: "secret" }).errors.length, 0);
  assert.equal(validateLogin({ email: "nope", password: "" }).errors.length, 2);
});
