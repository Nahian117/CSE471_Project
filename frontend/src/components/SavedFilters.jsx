import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UNIVERSITIES, domainToLabel } from '../constants/universities';
import './SavedFilters.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * SavedFilters
 *
 * Props:
 *   user            – current user object (for auto-filling university)
 *   onApplyFilter   – callback(filters) to push filter values into the browse tab
 */
const SavedFilters = ({ user, onApplyFilter }) => {
  const [filters, setFilters]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [statusMsg, setStatusMsg]       = useState('');
  const [errorMsg, setErrorMsg]         = useState('');

  const userUniversity = user?.email ? user.email.split('@')[1] : '';
  const userUniLabel   = domainToLabel(userUniversity);

  const emptyForm = {
    name:        '',
    category:    '',
    condition:   '',
    minPrice:    '',
    maxPrice:    '',
    university:  '',
    myUniOnly:   false,   // "My university only" shortcut toggle
  };
  const [form, setForm] = useState({ ...emptyForm, university: userUniversity });

  const token = localStorage.getItem('token');
  const authHeaders = { Authorization: `Bearer ${token}` };

  /* ── Fetch ─────────────────────────────────────────────────────────────── */
  const fetchFilters = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/filters`, { headers: authHeaders });
      setFilters(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error loading saved filters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFilters(); }, []); // eslint-disable-line

  /* ── Save ──────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    setErrorMsg('');
    setStatusMsg('');

    if (!form.name.trim()) {
      setErrorMsg('Please give your filter a name.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/filters`, {
        name: form.name.trim(),
        filters: {
          category:   form.category   || undefined,
          condition:  form.condition  || undefined,
          minPrice:   form.minPrice   ? Number(form.minPrice) : undefined,
          maxPrice:   form.maxPrice   ? Number(form.maxPrice) : undefined,
          university: form.myUniOnly ? userUniLabel : (form.university || undefined),
        }
      }, { headers: authHeaders });

      setStatusMsg('✅ Filter saved! You\'ll get a notification when a matching item is listed.');
      setForm({ ...emptyForm, university: userUniLabel });
      fetchFilters();
      setTimeout(() => setStatusMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving filter');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete ────────────────────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved filter?')) return;
    try {
      await axios.delete(`${API_URL}/api/filters/${id}`, { headers: authHeaders });
      setFilters(prev => prev.filter(f => f._id !== id));
      setStatusMsg('Filter removed.');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error deleting filter');
    }
  };

  /* ── Apply ─────────────────────────────────────────────────────────────── */
  const handleApply = (filter) => {
    if (!onApplyFilter) return;
    onApplyFilter({
      category:   filter.filters.category   || '',
      condition:  filter.filters.condition  || '',
      minPrice:   filter.filters.minPrice   != null ? String(filter.filters.minPrice) : '',
      maxPrice:   filter.filters.maxPrice   != null ? String(filter.filters.maxPrice) : '',
      university: filter.filters.university || '',
    });
  };

  const set = (key, val) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="sf-root">

      {/* ── Create new filter ─────────────────────────────── */}
      <div className="sf-card sf-create">
        <div className="sf-card-header">
          <span className="sf-icon">🔖</span>
          <div>
            <h4 className="sf-card-title">Save a Search Filter</h4>
            <p className="sf-card-sub">
              Get notified automatically when a new listing matches your criteria.
            </p>
          </div>
        </div>

        <div className="sf-form-grid">
          {/* Name */}
          <input
            className="sf-input sf-span-2"
            type="text"
            placeholder="Filter name (e.g. Cheap Electronics)"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />

          {/* Category */}
          <select className="sf-input" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Any Category</option>
            <option value="electronics">🔌 Electronics</option>
            <option value="books">📚 Books</option>
            <option value="clothing">👗 Clothing</option>
            <option value="furniture">🪑 Furniture</option>
            <option value="sports">⚽ Sports</option>
            <option value="other">📦 Other</option>
          </select>

          {/* Condition */}
          <select className="sf-input" value={form.condition} onChange={e => set('condition', e.target.value)}>
            <option value="">Any Condition</option>
            <option value="new">✨ New</option>
            <option value="good">👍 Good</option>
            <option value="used">♻️ Used</option>
          </select>

          {/* Price range */}
          <input
            className="sf-input"
            type="number"
            placeholder="Min Price (৳)"
            value={form.minPrice}
            onChange={e => set('minPrice', e.target.value)}
            min="0"
          />
          <input
            className="sf-input"
            type="number"
            placeholder="Max Price (৳)"
            value={form.maxPrice}
            onChange={e => set('maxPrice', e.target.value)}
            min="0"
          />

          {/* University section */}
          <div className="sf-uni-section sf-span-2">
            <div className="sf-toggle-row">
              <label className="sf-toggle-label" htmlFor="sf-my-uni-toggle">
                🎓 My university only
                <span className="sf-toggle-sub">
                  {userUniLabel ? `(${userUniLabel})` : '(set after login)'}
                </span>
              </label>
              <button
                id="sf-my-uni-toggle"
                className={`sf-toggle-btn ${form.myUniOnly ? 'active' : ''}`}
                onClick={() => set('myUniOnly', !form.myUniOnly)}
                type="button"
              >
                <span className="sf-toggle-knob" />
              </button>
            </div>

            {!form.myUniOnly && (
              <select
                className="sf-input sf-span-full"
                name="university"
                value={form.university}
                onChange={e => set('university', e.target.value)}
              >
                <option value="">Any University</option>
                {UNIVERSITIES.map(u => (
                  <option key={u.domain} value={u.label}>{u.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {statusMsg && <div className="sf-status success">{statusMsg}</div>}
        {errorMsg  && <div className="sf-status error">{errorMsg}</div>}

        <button
          className="sf-save-btn"
          onClick={handleSave}
          disabled={submitting}
          id="sf-save-filter-btn"
        >
          {submitting ? 'Saving…' : '💾 Save Filter & Enable Alerts'}
        </button>
      </div>

      {/* ── Saved filters list ────────────────────────────── */}
      <div className="sf-section-label">
        Your Saved Filters
        {filters.length > 0 && (
          <span className="sf-count">{filters.length}</span>
        )}
      </div>

      {loading ? (
        <div className="sf-empty">Loading…</div>
      ) : filters.length === 0 ? (
        <div className="sf-empty">
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
          No saved filters yet. Create one above to get notified about new listings!
        </div>
      ) : (
        <div className="sf-filters-list">
          {filters.map(filter => {
            const f = filter.filters;
            const chips = [
              f.category   && `📂 ${f.category}`,
              f.condition  && `🏷️ ${f.condition}`,
              (f.minPrice != null || f.maxPrice != null) &&
                `৳${f.minPrice ?? 0} – ${f.maxPrice != null ? f.maxPrice : '∞'}`,
              f.university && `🎓 ${f.university}`,
            ].filter(Boolean);

            return (
              <div key={filter._id} className="sf-filter-card">
                <div className="sf-filter-header">
                  <div className="sf-filter-icon">🔖</div>
                  <div className="sf-filter-info">
                    <p className="sf-filter-name">{filter.name}</p>
                    {filter.lastNotified && (
                      <p className="sf-filter-last">
                        Last match: {new Date(filter.lastNotified).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="sf-active-dot" title="Active — you'll be notified on matches" />
                </div>

                {chips.length > 0 && (
                  <div className="sf-chips">
                    {chips.map((chip, i) => (
                      <span key={i} className="sf-chip">{chip}</span>
                    ))}
                  </div>
                )}

                <div className="sf-filter-actions">
                  <button
                    className="sf-apply-btn"
                    onClick={() => handleApply(filter)}
                    title="Apply this filter to browse"
                  >
                    🔍 Apply to Browse
                  </button>
                  <button
                    className="sf-delete-btn"
                    onClick={() => handleDelete(filter._id)}
                    title="Delete this filter"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedFilters;