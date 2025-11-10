window.API_URL = 'http://127.0.0.1:8000';

window.API = {
  async getVisits(signal) {
    const resp = await fetch(`${window.API_URL}/api/visits`, { signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },
  async getVisit(id) {
    const resp = await fetch(`${window.API_URL}/api/visits/${id}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },
  async createVisit(data) {
    const resp = await fetch(`${window.API_URL}/api/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },
  async addResource(visitId, data) {
    const resp = await fetch(`${window.API_URL}/api/visits/${visitId}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },
  async updateResource(resourceId, data) {
    const resp = await fetch(`${window.API_URL}/api/resources/${resourceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },
  async deleteResource(resourceId) {
    const resp = await fetch(`${window.API_URL}/api/resources/${resourceId}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return true;
  },
  async updateVisitStatus(visitId, data) {
    const resp = await fetch(`${window.API_URL}/api/visits/${visitId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return json;
  },
  async addPostVisitNote(visitId, data) {
    const resp = await fetch(`${window.API_URL}/api/visits/${visitId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },
};