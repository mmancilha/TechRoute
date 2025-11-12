const API_URL = window.API_URL;

const visitForm = document.getElementById('visit-form');
const visitFormMessage = document.getElementById('form-message');

const resourceAllocator = document.getElementById('resource-allocator');
const allocatorTitle = document.getElementById('allocator-title');
const resourceForm = document.getElementById('resource-form');
const resourceList = document.getElementById('resource-list');
const resourceMessage = document.getElementById('resource-message');
const currentVisitIdInput = document.getElementById('current_visit_id');
const doneAllocatingBtn = document.getElementById('done-allocating-btn');


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
            showAllocator(newVisit);
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
            renderResource(newResource);
            resourceForm.reset();
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

doneAllocatingBtn.addEventListener('click', () => {
    resourceAllocator.classList.remove('visible');
    visitForm.style.display = 'block';
    visitForm.reset();
    visitFormMessage.textContent = 'New appointment successfully created.';
    visitFormMessage.style.color = 'lightgreen';
    window.location.href = '/dashboard';
});

function showAllocator(visit) {
    visitForm.style.display = 'none';
    
    allocatorTitle.textContent = `Allocate Resources for Visit #${visit.id}`;
    currentVisitIdInput.value = visit.id;
    resourceList.innerHTML = '';
    resourceMessage.textContent = 'Loading existing resources...';

    resourceAllocator.classList.add('visible');

    fetchResources(visit.id);
}
async function fetchResources(visitId) {
    try {
        const response = await fetch(`${API_URL}/api/visits/${visitId}`);
        if (response.ok) {
            const visitData = await response.json();
            resourceList.innerHTML = '';
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

function renderResource(resource) {
    if (resourceMessage.textContent) {
        resourceMessage.textContent = '';
    }

    const li = document.createElement('li');
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = resource.item_name;
    
    const typeSpan = document.createElement('span');
    typeSpan.className = 'item-type';
    typeSpan.textContent = resource.item_type;

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

function startEditResource(li, resource) {
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

        if (resource.item_type === 'Equipment' && newType !== 'Equipment') {
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
        li.replaceWith(original);
    });
}

async function confirmDeleteResource(resource, li) {
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