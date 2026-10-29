const PROJECT_STATUSES = ["planned", "in-progress", "completed"];

function validateRegistration(input) {
  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  const errors = [];

  if (name.length < 2 || name.length > 60) errors.push("Name must be between 2 and 60 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
  if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    errors.push("Password must be at least 10 characters and include upper-case, lower-case, and a number.");
  }

  return { errors, value: { name, email, password } };
}

function validateLogin(input) {
  const email = String(input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  const errors = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
  if (!password) errors.push("Password is required.");
  return { errors, value: { email, password } };
}

function validateProject(input) {
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  const status = String(input.status || "planned");
  const errors = [];

  if (title.length < 3 || title.length > 80) errors.push("Project title must be between 3 and 80 characters.");
  if (description.length < 10 || description.length > 1000) {
    errors.push("Description must be between 10 and 1,000 characters.");
  }
  if (!PROJECT_STATUSES.includes(status)) errors.push("Choose a valid project status.");
  return { errors, value: { title, description, status } };
}

module.exports = { PROJECT_STATUSES, validateLogin, validateProject, validateRegistration };
