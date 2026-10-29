(() => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  const projectForm = document.querySelector("#project-form");
  const projectList = document.querySelector("[data-project-list]");
  const announcement = document.querySelector("[data-announcement]");

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.method && options.method !== "GET" ? { "X-CSRF-Token": csrfToken } : {}),
        ...options.headers
      }
    });
    if (response.status === 204) return null;
    const data = await response.json();
    if (!response.ok) throw new Error(data.errors?.join(" ") || data.error || "Request failed.");
    return data;
  }

  function announce(message) {
    if (!announcement) return;
    announcement.textContent = message;
    announcement.hidden = false;
    window.setTimeout(() => {
      announcement.hidden = true;
    }, 3500);
  }

  function createProjectCard(project) {
    const article = document.createElement("article");
    article.className = "project-card";
    article.dataset.projectId = project.id;
    const header = document.createElement("div");
    header.className = "d-flex justify-content-between gap-3 align-items-start";
    const title = document.createElement("h3");
    title.className = "h6 fw-bold mb-1 project-title";
    title.textContent = project.title;
    const status = document.createElement("span");
    status.className = `status-pill status-${project.status}`;
    status.textContent = project.status.replace("-", " ");
    header.append(title, status);
    const description = document.createElement("p");
    description.className = "text-secondary small project-description";
    description.textContent = project.description;
    const buttons = document.createElement("div");
    buttons.className = "d-flex gap-2";
    const edit = document.createElement("button");
    edit.className = "btn btn-sm btn-outline-primary";
    edit.type = "button";
    edit.dataset.editProject = project.id;
    edit.textContent = "Edit";
    const remove = document.createElement("button");
    remove.className = "btn btn-sm btn-outline-danger";
    remove.type = "button";
    remove.dataset.deleteProject = project.id;
    remove.textContent = "Delete";
    buttons.append(edit, remove);
    article.append(header, description, buttons);
    return article;
  }

  function resetForm() {
    projectForm.reset();
    projectForm.elements.projectId.value = "";
    projectForm.querySelector("[data-form-heading]").textContent = "Add a project";
    projectForm.querySelector("[data-submit-label]").textContent = "Save project";
    projectForm.querySelector("[data-cancel-edit]").classList.add("d-none");
    updateCount();
  }

  function updateCount() {
    const description = projectForm?.elements.description;
    const counter = document.querySelector("[data-character-count]");
    if (description && counter) counter.textContent = String(description.value.length);
  }

  projectForm?.elements.description.addEventListener("input", updateCount);
  projectForm?.querySelector("[data-cancel-edit]").addEventListener("click", resetForm);

  projectForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errors = projectForm.querySelector("[data-form-errors]");
    errors.classList.add("d-none");
    const payload = {
      title: projectForm.elements.title.value,
      description: projectForm.elements.description.value,
      status: projectForm.elements.status.value
    };
    const projectId = projectForm.elements.projectId.value;
    try {
      const data = await apiRequest(projectId ? `/api/projects/${projectId}` : "/api/projects", {
        method: projectId ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      const existing = projectList.querySelector(`[data-project-id="${data.project.id}"]`);
      if (existing) existing.replaceWith(createProjectCard(data.project));
      else {
        projectList.querySelector("[data-empty-state]")?.remove();
        projectList.prepend(createProjectCard(data.project));
      }
      resetForm();
      announce(projectId ? "Project updated." : "Project created.");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      errors.textContent = error.message;
      errors.classList.remove("d-none");
    }
  });

  projectList?.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-project]");
    const deleteButton = event.target.closest("[data-delete-project]");
    if (editButton) {
      try {
        const { project } = await apiRequest(`/api/projects/${editButton.dataset.editProject}`);
        projectForm.elements.projectId.value = project.id;
        projectForm.elements.title.value = project.title;
        projectForm.elements.description.value = project.description;
        projectForm.elements.status.value = project.status;
        projectForm.querySelector("[data-form-heading]").textContent = "Edit project";
        projectForm.querySelector("[data-submit-label]").textContent = "Update project";
        projectForm.querySelector("[data-cancel-edit]").classList.remove("d-none");
        updateCount();
        projectForm.elements.title.focus();
      } catch (error) {
        announce(error.message);
      }
    }
    if (deleteButton) {
      if (!window.confirm("Delete this project? This cannot be undone.")) return;
      try {
        await apiRequest(`/api/projects/${deleteButton.dataset.deleteProject}`, { method: "DELETE" });
        deleteButton.closest("[data-project-id]").remove();
        announce("Project deleted.");
        window.setTimeout(() => window.location.reload(), 700);
      } catch (error) {
        announce(error.message);
      }
    }
  });

  const weatherForm = document.querySelector("[data-weather-form]");
  weatherForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorBox = document.querySelector("[data-weather-error]");
    const resultBox = document.querySelector("[data-weather-result]");
    errorBox.textContent = "";
    resultBox.replaceChildren();
    const button = weatherForm.querySelector("button");
    button.disabled = true;
    button.textContent = "Loading…";
    try {
      const city = weatherForm.elements.city.value.trim();
      const { weather } = await apiRequest(`/api/weather?city=${encodeURIComponent(city)}`);
      const card = document.createElement("div");
      card.className = "weather-result mt-4";
      const heading = document.createElement("h3");
      heading.className = "h5 fw-bold";
      heading.textContent = `${weather.city}, ${weather.country}`;
      const details = document.createElement("p");
      details.className = "mb-0";
      details.textContent = `${weather.temperature} ${weather.units.temperature_2m} · feels like ${weather.feelsLike} ${weather.units.apparent_temperature} · humidity ${weather.humidity}% · wind ${weather.windSpeed} ${weather.units.wind_speed_10m}`;
      card.append(heading, details);
      resultBox.append(card);
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Check weather";
    }
  });

  const views = [...document.querySelectorAll("[data-view]")];
  const routeLinks = [...document.querySelectorAll("[data-route]")];
  function renderRoute() {
    if (!views.length) return;
    const route = window.location.hash.slice(1) || "projects";
    const selected = views.some((view) => view.dataset.view === route) ? route : "projects";
    views.forEach((view) => view.classList.toggle("d-none", view.dataset.view !== selected));
    routeLinks.forEach((link) => link.classList.toggle("active", link.dataset.route === selected));
  }
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
})();
