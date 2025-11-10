const API_URL = window.API_URL;
const REFRESH_INTERVAL_MS = 30000;
let refreshTimer = null;
let currentFetchController = null;
const ALLOWED_DASHBOARD_ROLES = ["admin", "manager", "dispatcher"];
let allVisits = [];

const allElements = {};

document.addEventListener("DOMContentLoaded", () => {
  allElements.loadingMessage = document.getElementById("loading-message");
  allElements.statusFilter = document.getElementById("status-filter");
  allElements.technicianFilter = document.getElementById("technician-filter");
  allElements.cardViewContainer = document.getElementById(
    "card-view-container"
  );
  allElements.calendarViewContainer = document.getElementById(
    "calendar-view-container"
  );
  allElements.viewToggleList = document.getElementById("view-toggle-list");
  allElements.viewToggleCalendar = document.getElementById(
    "view-toggle-calendar"
  );
  allElements.visitListContainer = document.getElementById("visit-list");
  allElements.spinner = document.getElementById("loading-spinner");
  allElements.calendarDaysContainer = document.getElementById("calendar-days");

  // Mini-card is created dynamically; no static modal elements needed.

  if (!canViewDashboard()) {
    allElements.loadingMessage.textContent =
      "Access denied: insufficient permissions to view the dashboard.";
    allElements.loadingMessage.style.color = "orangered";
    return;
  }

  allElements.statusFilter?.addEventListener("change", renderActiveView);
  allElements.technicianFilter?.addEventListener("change", renderActiveView);
  allElements.viewToggleList?.addEventListener("click", () =>
    toggleView("list")
  );
  allElements.viewToggleCalendar?.addEventListener("click", () =>
    toggleView("calendar")
  );

  // Global handler to close mini-card with Escape.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideMiniCard();
    }
  });

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

function toggleView(view) {
  if (view === "list") {
    allElements.cardViewContainer.classList.remove("hidden");
    allElements.calendarViewContainer.classList.add("hidden");
    allElements.viewToggleList.classList.add("active");
    allElements.viewToggleCalendar.classList.remove("active");
    allElements.viewToggleList.setAttribute("aria-pressed", "true");
    allElements.viewToggleCalendar.setAttribute("aria-pressed", "false");
    renderListView();
  } else {
    allElements.cardViewContainer.classList.add("hidden");
    allElements.calendarViewContainer.classList.remove("hidden");
    allElements.viewToggleList.classList.remove("active");
    allElements.viewToggleCalendar.classList.add("active");
    allElements.viewToggleList.setAttribute("aria-pressed", "false");
    allElements.viewToggleCalendar.setAttribute("aria-pressed", "true");
    renderCalendarView();
  }
}

function renderActiveView() {
  if (allElements.calendarViewContainer.classList.contains("hidden")) {
    renderListView();
  } else {
    renderCalendarView();
  }
}

async function fetchAllVisits() {
  try {
    if (currentFetchController) {
      currentFetchController.abort();
    }
    currentFetchController = new AbortController();

    allElements.loadingMessage.style.display = "block";
    allElements.loadingMessage.textContent = "Loading visits...";
    allElements.loadingMessage.style.color = "";
    allElements.spinner?.classList.add("visible");

    allVisits = await window.API.getVisits(currentFetchController.signal);

    allElements.loadingMessage.style.display = "none";
    renderActiveView();
  } catch (error) {
    console.error("Error fetching visits:", error);
    if (error.name === "AbortError") {
      return;
    }
    allElements.loadingMessage.textContent =
      "Error loading visits. Is the API running?";
    allElements.loadingMessage.style.color = "orangered";
  } finally {
    allElements.spinner?.classList.remove("visible");
  }
}

function getFilteredVisits() {
  const selectedStatus = allElements.statusFilter?.value || "All";
  const selectedTechnician = allElements.technicianFilter?.value || "All";

  let filtered = allVisits;

  if (selectedStatus !== "All") {
    filtered = filtered.filter((v) => v.status === selectedStatus);
  }

  if (selectedTechnician !== "All") {
    filtered = filtered.filter(
      (v) => v.assigned_technician === selectedTechnician
    );
  }
  return filtered;
}

function renderListView() {
  const filtered = getFilteredVisits();
  allElements.visitListContainer.innerHTML = "";

  if (filtered.length === 0) {
    allElements.loadingMessage.textContent =
      allVisits.length === 0
        ? "No visits found."
        : "No visits match the selected filter.";
    allElements.loadingMessage.style.display = "block";
    return;
  }

  allElements.loadingMessage.style.display = "none";
  filtered.forEach(renderVisitCard);
}

function renderCalendarView() {
  const filtered = getFilteredVisits();
  allElements.calendarDaysContainer.innerHTML = "";

  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    days.push(day);
  }

  const locale = "en-CA";
  days.forEach((day) => {
    const dayColumn = document.createElement("div");
    dayColumn.className = "calendar-day";

    const dayISO = day.toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const visitsForDay = filtered.filter(
      (visit) => visit.visit_date === dayISO
    );

    let visitsHTML = visitsForDay
      .map((visit) => {
        const statusClass = visit.status.replace(/\s+/g, "_").toLowerCase();
        return `<li class="calendar-visit-item status-${statusClass}" data-visit-id="${
          visit.id
        }">
                    ${visit.visit_time.substring(0, 5)} - ${visit.client_name}
                </li>`;
      })
      .join("");

    dayColumn.innerHTML = `
        <div class="calendar-day-header">
            <span class="day-header-dayname">${day.toLocaleDateString(locale, {
              weekday: "short",
            })}</span>
            <span class="day-header-date">${day.toLocaleDateString(locale, {
              month: "short",
              day: "numeric",
            })}</span>
        </div>
        <ul class="day-visits">
            ${visitsHTML.length > 0 ? visitsHTML : ""}
        </ul>
    `;
    allElements.calendarDaysContainer.appendChild(dayColumn);

    dayColumn.querySelectorAll(".calendar-visit-item").forEach((item) => {
      item.addEventListener("click", () => {
        const visitId = item.dataset.visitId;
        showVisitMiniCard(visitId, item);
      });
    });
  });

  if (filtered.length === 0 && allVisits.length > 0) {
    allElements.loadingMessage.textContent =
      "No visits match the selected filter.";
    allElements.loadingMessage.style.display = "block";
  } else if (allVisits.length === 0) {
    allElements.loadingMessage.textContent = "No visits found.";
    allElements.loadingMessage.style.display = "block";
  } else {
    allElements.loadingMessage.style.display = "none";
  }
}

let currentMiniCard = null;
function showVisitMiniCard(visitId, anchorEl) {
  const visit = allVisits.find((v) => v.id == visitId);
  if (!visit) return;

  hideMiniCard();

  const statusClass = visit.status.replace(/\s+/g, "_").toLowerCase();
  const visitDateTime = `${visit.visit_date} at ${visit.visit_time.substring(
    0,
    5
  )}`;

  const card = document.createElement("div");
  card.className = "mini-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "false");
  card.setAttribute("aria-label", "Visit summary");

  card.innerHTML = `
    <div class="mini-card-header">
      <span class="status-badge status-${statusClass}">${visit.status}</span>
    </div>
    <div class="mini-card-body">
      <h4 class="mini-card-title">${visit.client_name}</h4>
      <p><strong>Time:</strong> ${visitDateTime}</p>
      <p><strong>Service:</strong> ${visit.service_type}</p>
      <p><strong>Status:</strong> ${visit.status}</p>
    </div>
  `;

  document.body.appendChild(card);
  currentMiniCard = card;

  // Position near the anchor element
  const rect = anchorEl.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const top = window.scrollY + rect.top - cardRect.height - 8;
  const left = window.scrollX + rect.left;
  card.style.top = `${Math.max(window.scrollY + 8, top)}px`;
  card.style.left = `${left}px`;

  // Ensure visibility within viewport
  const overflowX = left + cardRect.width - (window.scrollX + window.innerWidth);
  if (overflowX > 0) {
    card.style.left = `${left - overflowX - 12}px`;
  }

  card.classList.add("visible");

  // Close handlers (Esc and clique fora)
  document.addEventListener("click", onGlobalClickClose, { capture: true });
}

function hideMiniCard() {
  if (currentMiniCard) {
    currentMiniCard.remove();
    currentMiniCard = null;
    document.removeEventListener("click", onGlobalClickClose, { capture: true });
  }
}

function onGlobalClickClose(e) {
  if (!currentMiniCard) return;
  if (currentMiniCard.contains(e.target)) return; // clicks inside
  hideMiniCard();
}

async function quickUpdateStatus(visitId, newStatus, opts = {}) {
  try {
    const updateData = { status: newStatus };
    if (typeof opts.reason !== "undefined" && opts.reason !== null) {
      updateData.reason = opts.reason;
    }
    const updatedVisit = await window.API.updateVisitStatus(visitId, updateData);
    // Update local cache
    const idx = allVisits.findIndex((v) => v.id == visitId);
    if (idx !== -1) allVisits[idx] = updatedVisit;
    renderActiveView();
  } catch (error) {
    console.error("Quick action error:", error);
    alert(`Error: ${error.message}`);
  }
}

function focusVisitCard(visitId) {
  const listBtn = document.getElementById("view-toggle-list");
  const calBtn = document.getElementById("view-toggle-calendar");
  // Ensure list view is active
  listBtn.classList.add("active");
  listBtn.setAttribute("aria-pressed", "true");
  calBtn.classList.remove("active");
  calBtn.setAttribute("aria-pressed", "false");
  allElements.cardViewContainer.classList.remove("hidden");
  allElements.calendarViewContainer.classList.add("hidden");

  // After re-render, scroll into view
  setTimeout(() => {
    const card = document.querySelector(`.visit-card[data-visit-id='${visitId}']`);
    if (card) {
      card.classList.add("pulse-highlight");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => card.classList.remove("pulse-highlight"), 1200);
    }
  }, 50);
}

function renderVisitCard(visit) {
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

  allElements.visitListContainer.appendChild(card);

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
    const newNote = await window.API.addPostVisitNote(visitId, { content });

    messageEl.textContent = "Note saved successfully!";
    messageEl.style.color = "lightgreen";
    form.reset();
    renderNewNote(newNote, card);
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
    const updatedVisit = await window.API.updateVisitStatus(
      visitId,
      updateData
    );

    messageEl.textContent = "Status updated!";
    messageEl.style.color = "lightgreen";

    const statusBadge = card.querySelector(".status-badge");
    const statusClass = updatedVisit.status.replace(/\s+/g, "_").toLowerCase();
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
