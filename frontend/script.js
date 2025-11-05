// API Base URL (Good practice to define it once)
const API_URL = 'http://127.0.0.1:8000';

// === 1. GET ALL ELEMENTS ===
// --- Visit Form (Existing) ---
const visitForm = document.getElementById('visit-form');
const visitFormMessage = document.getElementById('form-message');

// --- Resource Allocator (New) ---
const resourceAllocator = document.getElementById('resource-allocator');
const allocatorTitle = document.getElementById('allocator-title');
const resourceForm = document.getElementById('resource-form');
const resourceList = document.getElementById('resource-list');
const resourceMessage = document.getElementById('resource-message');
const currentVisitIdInput = document.getElementById('current_visit_id');
const doneAllocatingBtn = document.getElementById('done-allocating-btn');


// === 2. VISIT FORM SUBMIT HANDLER (Modified) ===
visitForm.addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent default page reload
    const form = event.target;
    visitFormMessage.textContent = 'Sending...';
    visitFormMessage.style.color = 'deepskyblue';

    const data = Object.fromEntries(new FormData(form).entries());

    try {
        const response = await fetch(`${API_URL}/api/visits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const newVisit = await response.json();
            console.log('Visit created:', newVisit);
            
            // --- THIS IS THE KEY CHANGE ---
            // Instead of just showing a message, show the allocator
            showAllocator(newVisit);
            // --- END OF KEY CHANGE ---
            
        } else {
            const errorData = await response.json();
            console.error('Error scheduling:', errorData);
            visitFormMessage.textContent = 'Error scheduling. Please check the data.';
            visitFormMessage.style.color = 'orangered';
        }

    } catch (error) {
        console.error('Connection error:', error);
        visitFormMessage.textContent = 'Unable to connect to the server.';
        visitFormMessage.style.color = 'orangered';
    }
});

// === 3. RESOURCE FORM SUBMIT HANDLER (New) ===
resourceForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    resourceMessage.textContent = '';
    
    const visitId = currentVisitIdInput.value;
    const itemName = document.getElementById('item_name').value;
    const itemType = document.getElementById('item_type').value;

    if (!visitId || !itemName || !itemType) {
        resourceMessage.textContent = 'Please fill out all fields.';
        resourceMessage.style.color = 'orangered';
        return;
    }

    const data = {
        item_name: itemName,
        item_type: itemType
    };

    try {
        const response = await fetch(`${API_URL}/api/visits/${visitId}/resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const newResource = await response.json();
            console.log('Resource added:', newResource);
            renderResource(newResource); // Add to list
            resourceForm.reset(); // Clear the form
        } else {
            const errorData = await response.json();
            console.error('Error adding resource:', errorData);
            resourceMessage.textContent = 'Error adding item.';
            resourceMessage.style.color = 'orangered';
        }
    } catch (error) {
        console.error('Connection error:', error);
        resourceMessage.textContent = 'Unable to connect to the server.';
        resourceMessage.style.color = 'orangered';
    }
});

// === 4. "DONE" BUTTON HANDLER (New) ===
doneAllocatingBtn.addEventListener('click', () => {
    // Hide allocator
    resourceAllocator.classList.remove('visible');
    
    // Show and reset main form
    visitForm.style.display = 'block';
    visitForm.reset();
    visitFormMessage.textContent = 'New appointment successfully created.';
    visitFormMessage.style.color = 'lightgreen';

    // Redirect to dashboard to review the newly created visit
    window.location.href = 'dashboard.html';
});


// === 5. HELPER FUNCTIONS (New) ===

/**
 * Shows the Resource Allocator card and fetches existing resources.
 * @param {object} visit - The visit object returned from the API.
 */
function showAllocator(visit) {
    // 1. Hide the main form
    visitForm.style.display = 'none';
    
    // 2. Set up the allocator card
    allocatorTitle.textContent = `Allocate Resources for Visit #${visit.id}`;
    currentVisitIdInput.value = visit.id;
    resourceList.innerHTML = ''; // Clear any old items
    resourceMessage.textContent = 'Loading existing resources...';

    // 3. Show the allocator card
    resourceAllocator.classList.add('visible');

    // 4. Fetch any resources already associated with this visit
    //    (This uses the new GET /api/visits/{visit_id} endpoint)
    fetchResources(visit.id);
}

/**
 * Fetches and renders all resources for a given visitId.
 * @param {number} visitId - The ID of the visit.
 */
async function fetchResources(visitId) {
    try {
        const response = await fetch(`${API_URL}/api/visits/${visitId}`);
        if (response.ok) {
            const visitData = await response.json();
            resourceList.innerHTML = ''; // Clear "loading" message
            if (visitData.resources && visitData.resources.length > 0) {
                visitData.resources.forEach(renderResource);
            } else {
                resourceMessage.textContent = 'No resources allocated yet.';
            }
        } else {
            resourceMessage.textContent = 'Could not load resources.';
            resourceMessage.style.color = 'orangered';
        }
    } catch (error) {
        console.error('Error fetching resources:', error);
        resourceMessage.textContent = 'Connection error while fetching resources.';
        resourceMessage.style.color = 'orangered';
    }
}

/**
 * Creates and appends a new <li> item to the resource list.
 * @param {object} resource - The resource object.
 */
function renderResource(resource) {
    // Clear the "no resources" message if it exists
    if (resourceMessage.textContent) {
        resourceMessage.textContent = '';
    }

    const li = document.createElement('li');
    
    // Item Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = resource.item_name;
    
    // Item Type (styled badge)
    const typeSpan = document.createElement('span');
    typeSpan.className = 'item-type';
    typeSpan.textContent = resource.item_type;

    // Actions (Edit/Delete)
    const actions = document.createElement('div');
    actions.className = 'resource-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'icon-btn edit';
    editBtn.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-btn delete';
    deleteBtn.textContent = 'Delete';

    editBtn.addEventListener('click', () => startEditResource(li, resource));
    deleteBtn.addEventListener('click', () => confirmDeleteResource(resource, li));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(nameSpan);
    li.appendChild(typeSpan);
    li.appendChild(actions);
    
    resourceList.appendChild(li);
}

// === Inline Edit ===
function startEditResource(li, resource) {
    // Snapshot original content
    const original = li.cloneNode(true);
    li.innerHTML = '';

    const form = document.createElement('form');
    form.className = 'inline-edit-form';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = resource.item_name;
    nameInput.placeholder = 'Item name';
    nameInput.required = true;

    const typeSelect = document.createElement('select');
    typeSelect.required = true;
    ['Material','Tool','Equipment'].forEach(optVal => {
        const opt = document.createElement('option');
        opt.value = optVal;
        opt.textContent = optVal;
        if (optVal === resource.item_type) opt.selected = true;
        typeSelect.appendChild(opt);
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'icon-btn save';
    saveBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'icon-btn cancel';
    cancelBtn.textContent = 'Cancel';

    form.appendChild(nameInput);
    form.appendChild(typeSelect);
    form.appendChild(saveBtn);
    form.appendChild(cancelBtn);

    li.appendChild(form);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = nameInput.value.trim();
        const newType = typeSelect.value;

        if (newName.length < 2) {
            resourceMessage.textContent = 'Name must have at least 2 characters.';
            resourceMessage.style.color = 'orangered';
            return;
        }

        // Notify on restrictions
        if (resource.item_type === 'Equipment' && newType !== 'Equipment') {
            // allow change but notify
            console.warn('Changing type from Equipment may affect constraints');
        }

        try {
            const resp = await fetch(`${API_URL}/api/resources/${resource.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_name: newName, item_type: newType })
            });
            if (resp.ok) {
                const updated = await resp.json();
                resourceMessage.textContent = 'Resource updated successfully.';
                resourceMessage.style.color = 'lightgreen';
                // Repaint item
                li.innerHTML = '';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'item-name';
                nameSpan.textContent = updated.item_name;
                const typeSpan = document.createElement('span');
                typeSpan.className = 'item-type';
                typeSpan.textContent = updated.item_type;
                const actions = document.createElement('div');
                actions.className = 'resource-actions';
                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'icon-btn edit';
                editBtn.textContent = 'Edit';
                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'icon-btn delete';
                deleteBtn.textContent = 'Delete';
                editBtn.addEventListener('click', () => startEditResource(li, updated));
                deleteBtn.addEventListener('click', () => confirmDeleteResource(updated, li));
                actions.appendChild(editBtn);
                actions.appendChild(deleteBtn);
                li.appendChild(nameSpan);
                li.appendChild(typeSpan);
                li.appendChild(actions);
            } else {
                const err = await resp.json();
                resourceMessage.textContent = err.detail || 'Update failed.';
                resourceMessage.style.color = 'orangered';
            }
        } catch (error) {
            console.error('Update error:', error);
            resourceMessage.textContent = 'Connection error during update.';
            resourceMessage.style.color = 'orangered';
        }
    });

    cancelBtn.addEventListener('click', () => {
        // Restore original item view
        li.replaceWith(original);
    });
}

// === Delete ===
async function confirmDeleteResource(resource, li) {
    // Client-side guard for essential items
    if (resource.item_type === 'Equipment') {
        resourceMessage.textContent = 'Equipment resources are essential and cannot be deleted.';
        resourceMessage.style.color = 'orangered';
        return;
    }

    const ok = window.confirm('Delete this resource? This action cannot be undone.');
    if (!ok) return;

    try {
        const resp = await fetch(`${API_URL}/api/resources/${resource.id}`, { method: 'DELETE' });
        if (resp.ok) {
            li.remove();
            resourceMessage.textContent = 'Resource deleted.';
            resourceMessage.style.color = 'lightgreen';
        } else {
            const err = await resp.json();
            resourceMessage.textContent = err.detail || 'Delete failed.';
            resourceMessage.style.color = 'orangered';
        }
    } catch (error) {
        console.error('Delete error:', error);
        resourceMessage.textContent = 'Connection error during delete.';
        resourceMessage.style.color = 'orangered';
    }
}