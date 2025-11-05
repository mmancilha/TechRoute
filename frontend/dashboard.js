// Define the API URL
const API_URL = 'http://127.0.0.1:8000';
const REFRESH_INTERVAL_MS = 30000; // 30s periodic refresh
let refreshTimer = null;
let currentFetchController = null;
const ALLOWED_DASHBOARD_ROLES = ['admin', 'manager', 'dispatcher'];
let allVisits = []; // holds last fetched visits for filtering

// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    const loadingMessage = document.getElementById('loading-message');
    if (!canViewDashboard()) {
        loadingMessage.textContent = 'Access denied: insufficient permissions to view the dashboard.';
        loadingMessage.style.color = 'orangered';
        return;
    }

    // Attach filter change handler
    const statusFilter = document.getElementById('status-filter');
    statusFilter?.addEventListener('change', renderVisitList);

    startAutoRefresh();
});

function canViewDashboard() {
    const role = localStorage.getItem('userRole') || 'admin';
    return ALLOWED_DASHBOARD_ROLES.includes(role);
}

function startAutoRefresh() {
    fetchAllVisits();
    refreshTimer = setInterval(fetchAllVisits, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
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

/**
 * Fetches all visits from the API and renders them.
 */
async function fetchAllVisits() {
    const listContainer = document.getElementById('visit-list');
    const loadingMessage = document.getElementById('loading-message');
    const spinner = document.getElementById('loading-spinner');

    try {
        // Abort any ongoing request to avoid overlap
        if (currentFetchController) { currentFetchController.abort(); }
        currentFetchController = new AbortController();

        // Show loader
        loadingMessage.style.display = 'block';
        loadingMessage.textContent = 'Loading visits...';
        loadingMessage.style.color = '';
        spinner?.classList.add('visible');

        const response = await fetch(`${API_URL}/api/visits`, { signal: currentFetchController.signal });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const visits = await response.json();
        allVisits = visits;

        // Clear loading message and render via filter
        loadingMessage.style.display = 'none';
        renderVisitList();

    } catch (error) {
        console.error('Error fetching visits:', error);
        if (error.name === 'AbortError') {
            // silently ignore aborted fetches
            return;
        }
        loadingMessage.textContent = 'Error loading visits. Is the API running?';
        loadingMessage.style.color = 'orangered';
    } finally {
        spinner?.classList.remove('visible');
    }
}

/**
 * Creates and appends a single visit card to the list.
 * @param {object} visit - The visit object from the API.
 */
function renderVisitCard(visit) {
    const listContainer = document.getElementById('visit-list');

    // Create the main card element
    const card = document.createElement('div');
    card.className = 'visit-card';
    card.dataset.visitId = visit.id; // Store the ID on the element

    // Helper to format status names into CSS class names (e.g., "In Progress" -> "in_progress")
    const statusClass = visit.status.replace(/\s+/g, '_').toLowerCase();

    // Format date and time (basic formatting)
    const visitDateTime = `${visit.visit_date} at ${visit.visit_time.substring(0, 5)}`;

    card.innerHTML = `
        <div class="card-header">
            <h3>Visit #${visit.id}: ${visit.client_name}</h3>
            <span class="status-badge status-${statusClass}">${visit.status}</span>
        </div>
        <div class="card-body">
            <p><strong>Technician:</strong> ${visit.assigned_technician}</p>
            <p><strong>Date:</strong> ${visitDateTime}</p>
            <p><strong>Service:</strong> ${visit.service_type}</p>
            ${visit.status_reason ? `<p class="status-reason"><strong>Reason:</strong> ${visit.status_reason}</p>` : ''}
        </div>
        <div class="card-footer">
            <select name="status" class="status-select">
                <option value="Scheduled" ${visit.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                <option value="In Progress" ${visit.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Completed" ${visit.status === 'Completed' ? 'selected' : ''}>Completed</option>
                <option value="Canceled" ${visit.status === 'Canceled' ? 'selected' : ''}>Canceled</option>
                <option value="Rescheduled" ${visit.status === 'Rescheduled' ? 'selected' : ''}>Rescheduled</option>
            </select>
            <input type="date" class="reschedule-date" aria-label="Rescheduled date" />
            <input type="time" class="reschedule-time" aria-label="Rescheduled time" />
            <textarea class="reason-input" placeholder="Add reason (required for Canceled/Rescheduled)"></textarea>
            <button class="update-status-btn">Update Status</button>
            <p class="update-message"></p>
        </div>
    `;

    // Append the new card to the list
    listContainer.appendChild(card);

    // --- Add Event Listeners for this new card ---
    
    const statusSelect = card.querySelector('.status-select');
    const reasonInput = card.querySelector('.reason-input');
    const rescheduleDateInput = card.querySelector('.reschedule-date');
    const rescheduleTimeInput = card.querySelector('.reschedule-time');
    const updateBtn = card.querySelector('.update-status-btn');

    // 1. Listener for the <select> to show/hide the reason box
    // (Criterion 2: easily add reasons)
    statusSelect.addEventListener('change', (e) => {
        const selectedStatus = e.target.value;
        if (selectedStatus === 'Canceled' || selectedStatus === 'Rescheduled') {
            reasonInput.classList.add('visible');
            // Show reschedule inputs only for Rescheduled
            if (selectedStatus === 'Rescheduled') {
                rescheduleDateInput.classList.add('visible');
                rescheduleTimeInput.classList.add('visible');
            } else {
                rescheduleDateInput.classList.remove('visible');
                rescheduleTimeInput.classList.remove('visible');
            }
        } else {
            reasonInput.classList.remove('visible');
            rescheduleDateInput.classList.remove('visible');
            rescheduleTimeInput.classList.remove('visible');
        }
    });

    // 2. Trigger the change event once to set the initial state
    statusSelect.dispatchEvent(new Event('change'));

    // 2b. If there is already a saved reason for Canceled/Rescheduled, hide and lock the textarea
    if ((visit.status === 'Canceled' || visit.status === 'Rescheduled') && visit.status_reason) {
        reasonInput.value = visit.status_reason;
        reasonInput.disabled = true;
        reasonInput.classList.add('locked');
        reasonInput.placeholder = 'Reason saved';
        reasonInput.classList.remove('visible');
        reasonInput.style.display = 'none';
        // Hide update button since reason is already saved for final statuses
        updateBtn.style.display = 'none';
        // Hide/lock the status select as the visit is finalized
        statusSelect.disabled = true;
        statusSelect.style.display = 'none';
        rescheduleDateInput.style.display = 'none';
        rescheduleTimeInput.style.display = 'none';
    }

    // 3. Listener for the "Update Status" button
    updateBtn.addEventListener('click', handleStatusUpdate);
}

/**
 * Handles the click event for the "Update Status" button.
 */
async function handleStatusUpdate(event) {
    const button = event.target;
    const card = button.closest('.visit-card');
    const visitId = card.dataset.visitId;
    
    const statusSelect = card.querySelector('.status-select');
    const reasonInput = card.querySelector('.reason-input');
    const messageEl = card.querySelector('.update-message');
    const updateBtn = card.querySelector('.update-status-btn');
    const rescheduleDateInput = card.querySelector('.reschedule-date');
    const rescheduleTimeInput = card.querySelector('.reschedule-time');

    const newStatus = statusSelect.value;
    const reasonText = reasonInput.value;
    const rescheduledDate = rescheduleDateInput?.value || '';
    const rescheduledTime = rescheduleTimeInput?.value || '';

    // (Criterion 2: Validate reason)
    if (newStatus === 'Rescheduled' && !rescheduledDate) {
        messageEl.textContent = 'Please provide the new date for the rescheduled visit.';
        messageEl.style.color = 'orangered';
        return;
    }

    if ((newStatus === 'Canceled' || newStatus === 'Rescheduled') && !reasonText) {
        messageEl.textContent = 'A reason is required for "Canceled" or "Rescheduled".';
        messageEl.style.color = 'orangered';
        return;
    }

    button.disabled = true;
    messageEl.textContent = 'Updating...';
    messageEl.style.color = 'deepskyblue';

    // Compose reason: for Rescheduled, include date/time; else use provided text
    let composedReason = reasonText;
    if (newStatus === 'Rescheduled') {
        const dt = rescheduledDate + (rescheduledTime ? ` ${rescheduledTime}` : '');
        composedReason = reasonText ? `Rescheduled to ${dt} — ${reasonText}` : `Rescheduled to ${dt}`;
    }

    const updateData = {
        status: newStatus,
        reason: composedReason
    };

    try {
        const response = await fetch(`${API_URL}/api/visits/${visitId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const updatedVisit = await response.json();

        if (response.ok) {
            messageEl.textContent = 'Status updated!';
            messageEl.style.color = 'lightgreen';
            
            // (Criterion 1: Update status correctly)
            // Update the UI
            const statusBadge = card.querySelector('.status-badge');
            const statusClass = updatedVisit.status.replace(/\s+/g, '_').toLowerCase();
            statusBadge.textContent = updatedVisit.status;
            statusBadge.className = `status-badge status-${statusClass}`; // Reset classes

            // Update/add the reason text
            let reasonEl = card.querySelector('.status-reason');
            if (updatedVisit.status_reason) {
                if (!reasonEl) {
                    reasonEl = document.createElement('p');
                    reasonEl.className = 'status-reason';
                    card.querySelector('.card-body').appendChild(reasonEl);
                }
                reasonEl.innerHTML = `<strong>Reason:</strong> ${updatedVisit.status_reason}`;
            } else if (reasonEl) {
                // Remove reason if it's no longer relevant
                reasonEl.remove();
            }

            // Lock/unlock textarea based on status and saved reason
            if ((updatedVisit.status === 'Canceled' || updatedVisit.status === 'Rescheduled') && updatedVisit.status_reason) {
                // Persist the saved reason in the textarea and lock it
                reasonInput.value = updatedVisit.status_reason;
                reasonInput.disabled = true;
                reasonInput.classList.add('locked');
                reasonInput.placeholder = 'Reason saved';
            // Hide textarea after save to prevent edits
            reasonInput.classList.remove('visible');
            reasonInput.style.display = 'none';

            // Hide the update button as well in these final states with saved reason
            updateBtn.style.display = 'none';

            // Hide/lock the status select when finalized
            statusSelect.disabled = true;
            statusSelect.style.display = 'none';
        } else {
            // For other statuses, allow editing again
            reasonInput.disabled = false;
            reasonInput.classList.remove('locked');
            if (!updatedVisit.status_reason) {
                reasonInput.value = '';
            }
            reasonInput.placeholder = 'Add reason (required for Canceled/Rescheduled)';
            // Show/Hide based on selected status via class; reset inline style
            reasonInput.classList.remove('visible');
            reasonInput.style.display = '';

            // Show update button again for non-final statuses
            updateBtn.style.display = '';

            // Re-enable/show status select for editable states
            statusSelect.disabled = false;
            statusSelect.style.display = '';
        }

        } else {
            throw new Error(updatedVisit.detail || 'Failed to update status.');
        }

    } catch (error) {
        console.error('Error updating status:', error);
        messageEl.textContent = `Error: ${error.message}`;
        messageEl.style.color = 'orangered';
    } finally {
        button.disabled = false;
        // Clear message after a few seconds
        setTimeout(() => { messageEl.textContent = ''; }, 3000);
    }
}

/**
 * Renders the visit list applying the current status filter.
 */
function renderVisitList() {
    const listContainer = document.getElementById('visit-list');
    const loadingMessage = document.getElementById('loading-message');
    const statusFilter = document.getElementById('status-filter');
    const selected = statusFilter?.value || 'All';

    const filtered = selected === 'All' ? allVisits : allVisits.filter(v => v.status === selected);
    listContainer.innerHTML = '';

    if (filtered.length === 0) {
        loadingMessage.textContent = allVisits.length === 0 ? 'No visits found.' : 'No visits match the selected filter.';
        loadingMessage.style.display = 'block';
        return;
    }

    loadingMessage.style.display = 'none';
    filtered.forEach(renderVisitCard);
}