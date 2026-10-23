'use strict';
// Wave 1B core helpers: owner-scoped tasks (process-local store, no schema
// migration), CSV/JSON serializers, and deterministic AI fallbacks.
// The task store is intentionally injectable so routes and tests share logic.
const crypto = require('node:crypto');

const TASK_STATUSES = new Set(['open', 'in_progress', 'done']);

function taskError(message) { const e = new Error(message); e.code = 'VALIDATION_ERROR'; e.status = 400; return e; }

function createTaskStore() {
  const tasks = new Map();
  return {
    list(ownerId, { status, search } = {}) {
      let out = [...tasks.values()].filter((t) => t.ownerId === String(ownerId));
      if (status) out = out.filter((t) => t.status === status);
      if (search) { const q = String(search).toLowerCase(); out = out.filter((t) => t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)); }
      return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },
    create(ownerId, input = {}) {
      const title = String(input.title || '').trim();
      if (!title || title.length > 200) throw taskError('title must be 1-200 characters');
      const status = input.status || 'open';
      if (!TASK_STATUSES.has(status)) throw taskError('status is invalid');
      const task = { id: crypto.randomUUID(), ownerId: String(ownerId), title, notes: input.notes ? String(input.notes).slice(0, 2000) : '', status, dueDate: input.dueDate || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      tasks.set(task.id, task); return task;
    },
    update(ownerId, id, patch = {}) {
      const task = tasks.get(String(id));
      if (!task || task.ownerId !== String(ownerId)) return null;
      if (patch.title !== undefined) { const t = String(patch.title).trim(); if (!t || t.length > 200) throw taskError('title must be 1-200 characters'); task.title = t; }
      if (patch.notes !== undefined) task.notes = String(patch.notes).slice(0, 2000);
      if (patch.status !== undefined) { if (!TASK_STATUSES.has(patch.status)) throw taskError('status is invalid'); task.status = patch.status; }
      if (patch.dueDate !== undefined) task.dueDate = patch.dueDate || null;
      task.updatedAt = new Date().toISOString(); return task;
    },
  };
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(records, columns) {
  return [columns.map((c) => csvCell(c.label)).join(','), ...records.map((r) => columns.map((c) => csvCell(typeof c.accessor === 'function' ? c.accessor(r) : r[c.accessor])).join(','))].join('\n');
}
const LOCATION_COLUMNS = [
  { label: 'Name', accessor: 'name' }, { label: 'Code', accessor: 'code' }, { label: 'City', accessor: 'city' },
  { label: 'State', accessor: 'state' }, { label: 'Status', accessor: 'status' }, { label: 'Territory', accessor: (r) => r.territory?.name ?? '' },
];
function fallbackLabel() { return { provider: 'deterministic-fallback', aiGenerated: false, label: 'Deterministic fallback — no AI provider configured. Computed locally from your records; not AI-generated.' }; }

function locationPerformanceSummary(locations = []) {
  const byStatus = {}; let withTerritory = 0;
  for (const l of locations) { byStatus[l.status || 'unknown'] = (byStatus[l.status || 'unknown'] || 0) + 1; if (l.territoryId || l.territory) withTerritory++; }
  return { ...fallbackLabel(), feature: 'location-performance-summary', sections: {
    summary: `${locations.length} location(s) reviewed across ${Object.keys(byStatus).length} status group(s).`,
    metrics: { totalLocations: locations.length, byStatus, locationsWithTerritory: withTerritory, locationsWithoutTerritory: locations.length - withTerritory },
    findings: locations.slice(0, 10).map((l) => `${l.name || l.code || l.id}: status=${l.status ?? 'unknown'}, city=${l.city ?? 'not provided'}`),
    recommendations: locations.length === 0 ? ['Add locations before requesting a portfolio summary.'] : ['Review locations without a territory assignment first.', 'Compare status distribution before opening new territories.'],
  } };
}
function issueTriage(issues = []) {
  const open = issues.filter((i) => !['resolved', 'closed'].includes(String(i.status || '').toLowerCase()));
  return { ...fallbackLabel(), feature: 'issue-triage', sections: {
    summary: `${issues.length} issue(s) reviewed; ${open.length} still open.`,
    metrics: { totalIssues: issues.length, openIssues: open.length, resolvedIssues: issues.length - open.length },
    findings: open.slice(0, 10).map((i) => `${i.title || i.id}: status=${i.status ?? 'unknown'}, priority=${i.priority ?? 'not provided'}`),
    recommendations: open.length ? ['Work the oldest open issues first.', 'Assign an owner to every open issue.'] : ['No open issues require triage.'],
  } };
}
module.exports = { createTaskStore, toCsv, LOCATION_COLUMNS, locationPerformanceSummary, issueTriage, TASK_STATUSES };
