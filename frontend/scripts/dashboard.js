const API_URL = window.API_URL;
const REFRESH_INTERVAL_MS = 30000;
let refreshTimer = null;
let currentFetchController = null;
const ALLOWED_DASHBOARD_ROLES = ["admin", "manager", "dispatcher"];
let allVisits = [];

document.addEventListener("DOMContentLoaded", () => {
  const loadingMessage = document.getElementById("loading-message");
  if (!canViewDashboard()) {
    loadingMessage.textContent =
      "Access denied: insufficient permissions to view the dashboard.";
    loadingMessage.style.color = "orangered";
    return;
  }

  const statusFilter = document.getElementById("status-filter");
  const technicianFilter = document.getElementById("technician-filter");

  statusFilter?.addEventListener("change", renderVisitList);
  technicianFilter?.addEventListener("change", renderVisitList);

  startAutoRefresh();
});

function canViewDashboard() {
  const role = localStorage.getItem("userRole") || "admin";
  return ALLOWED_DASHBOARD_ROLES.includes(role);
}

function startAutoRefresh() {
  fetchAllVisits();
  refreshTimer = setInterval(fetchAllVisits, REFRESH_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    } else if (!refreshTimer) {
      refreshTimer = setInterval(fetchAllVisits, REFRESH_INTERVAL_MS);
    }
  });
}

async function fetchAllVisits() {
  const listContainer = document.getElementById("visit-list");
  const loadingMessage = document.getElementById("loading-message");
  const spinner = document.getElementById("loading-spinner");

  try {
    if (currentFetchController) {
      currentFetchController.abort();
    }
    currentFetchController = new AbortController();

    loadingMessage.style.display = "block";
    loadingMessage.textContent = "Loading visits...";
    loadingMessage.style.color = "";
    spinner?.classList.add("visible");

    const response = await fetch(`${API_URL}/api/visits`, {
      signal: currentFetchController.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const visits = await response.json();
    allVisits = visits;

    loadingMessage.style.display = "none";
    renderVisitList();
  } catch (error) {
    console.error("Error fetching visits:", error);
    if (error.name === "AbortError") {
      return;
    }
    loadingMessage.textContent = "Error loading visits. Is the API running?";
    loadingMessage.style.color = "orangered";
  } finally {
    spinner?.classList.remove("visible");
  }
}

function renderVisitCard(visit) {
  const listContainer = document.getElementById("visit-list");

  const card = document.createElement("div");
  card.className = "visit-card";
  card.dataset.visitId = visit.id;

  const statusClass = visit.status.replace(/\s+/g, "_").toLowerCase();
  const visitDateTime = `${visit.visit_date} at ${visit.visit_time.substring(
    0,
    5
  )}`;

  const notesHTML = visit.notes
    .map(
      (note) => `
        <li class="note-item">
            <p class="note-content">${note.content.replace(/\n/g, "<br>")}</p>
            <span class="note-timestamp">At: ${new Date(
              note.created_at
            ).toLocaleString("en-CA", {
              dateStyle: "short",
              timeStyle: "short",
            })}</span>
        </li>
    `
    )
    .join("");

  card.innerHTML = `
        <div class="card-header">
            <h3>Visit #${visit.id}: ${visit.client_name}</h3>
            <span class="status-badge status-${statusClass}">${
    visit.status
  }</span>
        </div>
        <div class="card-body">
            <p><strong>Technician:</strong> ${visit.assigned_technician}</p>
            <p><strong>Date:</strong> ${visitDateTime}</p>
            <p><strong>Service:</strong> ${visit.service_type}</p>
            ${
              visit.status_reason
                ? `<p class="status-reason"><strong>Reason:</strong> ${visit.status_reason}</p>`
                : ""
            }
        </div>
        
        <div class="card-notes-section">
            <h4>Post-Visit Notes</h4>
            <ul class="notes-list">
                ${
                  notesHTML.length > 0
                    ? notesHTML
                    : '<li class="no-notes">No notes added yet.</li>'
                }
            </ul>
            <form class="note-form">
                <textarea class="note-input" name="content" placeholder="Technician observations..." required></textarea>
                <button type="submit" class="btn-dark add-note-btn">Add Note</button>
                <p class="note-message"></p>
            </form>
        </div>

        <div class="card-footer">
            <select name="status" class="status-select">
                <option value="Scheduled" ${
                  visit.status === "Scheduled" ? "selected" : ""
                }>Scheduled</option>
                <option value="In Progress" ${
                  visit.status === "In Progress" ? "selected" : ""
                }>In Progress</option>
                <option value="Completed" ${
                  visit.status === "Completed" ? "selected" : ""
                }>Completed</option>
                <option value="Canceled" ${
                  visit.status === "Canceled" ? "selected" : ""
                }>Canceled</option>
                <option value="Rescheduled" ${
                  visit.status === "Rescheduled" ? "selected" : ""
                }>Rescheduled</option>
            </select>
            <input type="date" class="reschedule-date" aria-label="Rescheduled date" />
            <input type="time" class="reschedule-time" aria-label="Rescheduled time" />
            <textarea class="reason-input" placeholder="Add reason (required for Canceled/Rescheduled)"></textarea>
            <button class="btn-dark update-status-btn">Update Status</button>
            <p class="update-message"></p>
        </div>
    `;

  listContainer.appendChild(card);

  const statusSelect = card.querySelector(".status-select");
  const reasonInput = card.querySelector(".reason-input");
  const rescheduleDateInput = card.querySelector(".reschedule-date");
  const rescheduleTimeInput = card.querySelector(".reschedule-time");
  const updateBtn = card.querySelector(".update-status-btn");

  statusSelect.addEventListener("change", (e) => {
    const selectedStatus = e.target.value;
    if (selectedStatus === "Canceled" || selectedStatus === "Rescheduled") {
      reasonInput.classList.add("visible");
      if (selectedStatus === "Rescheduled") {
        rescheduleDateInput.classList.add("visible");
        rescheduleTimeInput.classList.add("visible");
      } else {
        rescheduleDateInput.classList.remove("visible");
        rescheduleTimeInput.classList.remove("visible");
      }
    } else {
      reasonInput.classList.remove("visible");
      rescheduleDateInput.classList.remove("visible");
      rescheduleTimeInput.classList.remove("visible");
    }
  });
  statusSelect.dispatchEvent(new Event("change"));

  if (
    (visit.status === "Canceled" || visit.status === "Rescheduled") &&
    visit.status_reason
  ) {
    reasonInput.value = visit.status_reason;
    reasonInput.disabled = true;
    reasonInput.classList.add("locked");
    reasonInput.placeholder = "Reason saved";
    reasonInput.classList.remove("visible");
    reasonInput.style.display = "none";
    updateBtn.style.display = "none";
    statusSelect.disabled = true;
    statusSelect.style.display = "none";
    rescheduleDateInput.style.display = "none";
    rescheduleTimeInput.style.display = "none";
  }
  updateBtn.addEventListener("click", handleStatusUpdate);

  const noteForm = card.querySelector(".note-form");
  if (visit.status === "Canceled") {
    noteForm.style.display = "none";
  } else {
    noteForm.addEventListener("submit", handleNoteSubmit);
  }
}

async function handleNoteSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const card = form.closest(".visit-card");
  const visitId = card.dataset.visitId;

  const textarea = form.querySelector(".note-input");
  const messageEl = form.querySelector(".note-message");
  const button = form.querySelector(".add-note-btn");

  const content = textarea.value.trim();

  if (!content) {
    messageEl.textContent = "Note content cannot be empty.";
    messageEl.style.color = "orangered";
    return;
  }

  button.disabled = true;
  messageEl.textContent = "Saving note...";
  messageEl.style.color = "deepskyblue";

  try {
    const response = await fetch(`${API_URL}/api/visits/${visitId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content }),
    });

    const newNote = await response.json();

    if (response.ok) {
      messageEl.textContent = "Note saved successfully!";
      messageEl.style.color = "lightgreen";
      form.reset();
      renderNewNote(newNote, card);
    } else {
      throw new Error(newNote.detail || "Failed to save note.");
    }
  } catch (error) {
    console.error("Error saving note:", error);
    messageEl.textContent = `Error: ${error.message}`;
    messageEl.style.color = "orangered";
  } finally {
    button.disabled = false;
    setTimeout(() => {
      messageEl.textContent = "";
    }, 3000);
  }
}

function renderNewNote(note, card) {
  const notesList = card.querySelector(".notes-list");

  const noNotesEl = notesList.querySelector(".no-notes");
  if (noNotesEl) {
    noNotesEl.remove();
  }

  const li = document.createElement("li");
  li.className = "note-item";
  li.innerHTML = `
        <p class="note-content">${note.content.replace(/\n/g, "<br>")}</p>
        <span class="note-timestamp">At: ${new Date(
          note.created_at
        ).toLocaleString("en-CA", {
          dateStyle: "short",
          timeStyle: "short",
        })}</span>
    `;

  notesList.prepend(li);
}

async function handleStatusUpdate(event) {
  const button = event.target;
  const card = button.closest(".visit-card");
  const visitId = card.dataset.visitId;

  const statusSelect = card.querySelector(".status-select");
  const reasonInput = card.querySelector(".reason-input");
  const messageEl = card.querySelector(".update-message");
  const updateBtn = card.querySelector(".update-status-btn");
  const rescheduleDateInput = card.querySelector(".reschedule-date");
  const rescheduleTimeInput = card.querySelector(".reschedule-time");

  const newStatus = statusSelect.value;
  const reasonText = reasonInput.value;
  const rescheduledDate = rescheduleDateInput?.value || "";
  const rescheduledTime = rescheduleTimeInput?.value || "";

  if (newStatus === "Rescheduled" && !rescheduledDate) {
    messageEl.textContent =
      "Please provide the new date for the rescheduled visit.";
    messageEl.style.color = "orangered";
    return;
  }

  if (
    (newStatus === "Canceled" || newStatus === "Rescheduled") &&
    !reasonText
  ) {
    messageEl.textContent =
      'A reason is required for "Canceled" or "Rescheduled".';
    messageEl.style.color = "orangered";
    return;
  }

  button.disabled = true;
  messageEl.textContent = "Updating...";
  messageEl.style.color = "deepskyblue";

  let composedReason = reasonText;
  if (newStatus === "Rescheduled") {
    const dt = rescheduledDate + (rescheduledTime ? ` ${rescheduledTime}` : "");
    composedReason = reasonText
      ? `Rescheduled to ${dt} — ${reasonText}`
      : `Rescheduled to ${dt}`;
  }

  const updateData = {
    status: newStatus,
    reason: composedReason,
  };

  try {
    const response = await fetch(`${API_URL}/api/visits/${visitId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    const updatedVisit = await response.json();

    if (response.ok) {
      messageEl.textContent = "Status updated!";
      messageEl.style.color = "lightgreen";

      const statusBadge = card.querySelector(".status-badge");
      const statusClass = updatedVisit.status
        .replace(/\s+/g, "_")
        .toLowerCase();
      statusBadge.textContent = updatedVisit.status;
      statusBadge.className = `status-badge status-${statusClass}`;

      let reasonEl = card.querySelector(".status-reason");
      if (updatedVisit.status_reason) {
        if (!reasonEl) {
          reasonEl = document.createElement("p");
          reasonEl.className = "status-reason";
          card.querySelector(".card-body").appendChild(reasonEl);
        }
        reasonEl.innerHTML = `<strong>Reason:</strong> ${updatedVisit.status_reason}`;
      } else if (reasonEl) {
        reasonEl.remove();
      }

      if (
        (updatedVisit.status === "Canceled" ||
          updatedVisit.status === "Rescheduled") &&
        updatedVisit.status_reason
      ) {
        reasonInput.value = updatedVisit.status_reason;
        reasonInput.disabled = true;
        reasonInput.classList.add("locked");
        reasonInput.placeholder = "Reason saved";
        reasonInput.classList.remove("visible");
        reasonInput.style.display = "none";
        updateBtn.style.display = "none";
        statusSelect.disabled = true;
        statusSelect.style.display = "none";
        if (rescheduleDateInput) rescheduleDateInput.style.display = "none";
        if (rescheduleTimeInput) rescheduleTimeInput.style.display = "none";
      } else {
        reasonInput.disabled = false;
        reasonInput.classList.remove("locked");
        if (!updatedVisit.status_reason) {
          reasonInput.value = "";
        }
        reasonInput.placeholder =
          "Add reason (required for Canceled/Rescheduled)";
        reasonInput.classList.remove("visible");
        reasonInput.style.display = "";
        updateBtn.style.display = "";
        statusSelect.disabled = false;
        statusSelect.style.display = "";
        statusSelect.dispatchEvent(new Event("change"));
      }
    } else {
      throw new Error(updatedVisit.detail || "Failed to update status.");
    }
  } catch (error) {
    console.error("Error updating status:", error);
    messageEl.textContent = `Error: ${error.message}`;
    messageEl.style.color = "orangered";
  } finally {
    button.disabled = false;
    setTimeout(() => {
      messageEl.textContent = "";
    }, 3000);
  }
}

function renderVisitList() {
  const listContainer = document.getElementById("visit-list");
  const loadingMessage = document.getElementById("loading-message");

  const statusFilter = document.getElementById("status-filter");
  const technicianFilter = document.getElementById("technician-filter");

  const selectedStatus = statusFilter?.value || "All";
  const selectedTechnician = technicianFilter?.value || "All";

  let filtered = allVisits;

  if (selectedStatus !== "All") {
    filtered = filtered.filter((v) => v.status === selectedStatus);
  }

  if (selectedTechnician !== "All") {
    filtered = filtered.filter(
      (v) => v.assigned_technician === selectedTechnician
    );
  }

  listContainer.innerHTML = "";

  if (filtered.length === 0) {
    loadingMessage.textContent =
      allVisits.length === 0
        ? "No visits found."
        : "No visits match the selected filter.";
    loadingMessage.style.display = "block";
    return;
  }

  loadingMessage.style.display = "none";
  filtered.forEach(renderVisitCard);
}
