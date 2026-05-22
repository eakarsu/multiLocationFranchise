import React, { useEffect, useState } from 'react';
import api from '../services/api';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const emptyForm = { code: '', category: 'General', title: '', severity: 'MEDIUM', description: '', active: true };

export default function ComplianceRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/custom-views/compliance-rules');
      setRules(r.data.items || []);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editingId) {
        await api.put(`/custom-views/compliance-rules/${editingId}`, form);
      } else {
        await api.post('/custom-views/compliance-rules', form);
      }
      setForm(emptyForm); setEditingId(null);
      await load();
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({ code: r.code, category: r.category, title: r.title, severity: r.severity, description: r.description, active: r.active });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };
  const remove = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try { await api.delete(`/custom-views/compliance-rules/${id}`); await load(); }
    catch (e) { setError(e.response?.data?.error || e.message); }
  };

  return (
    <div className="card" data-testid="compliance-rules-editor">
      <div className="card-header"><div className="card-title">Brand Compliance Rules (CRUD)</div></div>
      <form onSubmit={submit} style={{ marginBottom: '1rem' }}>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Code</label>
            <input className="form-input" value={form.code} required
              onChange={e => setForm({ ...form, code: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Category</label>
            <input className="form-input" value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Severity</label>
            <select className="form-select" value={form.severity}
              onChange={e => setForm({ ...form, severity: e.target.value })}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-input" value={form.title} required
            onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {editingId ? 'Update Rule' : 'Add Rule'}
          </button>
          {editingId && <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>
      {error && <div style={{ color: '#f87171' }}>Error: {error}</div>}
      {loading ? <div>Loading…</div> : (
        <div className="table-container">
          <table className="table">
            <thead><tr>
              <th>Code</th><th>Category</th><th>Title</th><th>Severity</th><th>Active</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id}>
                  <td>{r.code}</td>
                  <td>{r.category}</td>
                  <td>{r.title}</td>
                  <td>{r.severity}</td>
                  <td>{r.active ? 'Yes' : 'No'}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => startEdit(r)} style={{ marginRight: 4 }}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!rules.length && <tr><td colSpan={6} style={{ textAlign: 'center', opacity: 0.6 }}>No rules</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
