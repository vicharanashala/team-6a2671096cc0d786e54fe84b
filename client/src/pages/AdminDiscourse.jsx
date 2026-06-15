import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const TABS = [
  { key: 'sources',  label: 'Sources' },
  { key: 'analyze',  label: 'Analyze' },
  { key: 'review',   label: 'Review Queue' }
];

const AdminDiscourse = () => {
  const [tab, setTab] = useState('sources');
  const [sources, setSources] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Source modal
  const [sourceModal, setSourceModal] = useState({ open: false, editing: null });

  // Analyze state
  const [analyzeForm, setAnalyzeForm] = useState({ sourceId: '', range: '7d', from: '', to: '', force: false });
  const [analyzeStatus, setAnalyzeStatus] = useState(null);
  const pollingRef = useRef(null);

  // Review state
  const [reviewFilter, setReviewFilter] = useState('pending');
  const [reviewSourceId, setReviewSourceId] = useState('');
  const [reviewRunId, setReviewRunId] = useState('');
  const [runs, setRuns] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, suggestion: null, form: { question: '', answer: '', category: '' } });

  useEffect(() => {
    fetchSources();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (tab === 'review') {
      fetchSuggestions();
      fetchRuns();
    }
  }, [tab, reviewFilter, reviewSourceId, reviewRunId]);

  useEffect(() => () => clearInterval(pollingRef.current), []);

  const flash = (kind, msg) => {
    if (kind === 'error') setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  };

  const fetchSources = async () => {
    try {
      const r = await api.get('/api/discourse/sources');
      setSources(r.data);
    } catch (e) { flash('error', 'Failed to load sources.'); }
  };

  const fetchCategories = async () => {
    try {
      const r = await api.get('/api/faqs');
      const distinct = [...new Set(r.data.map(f => f.category).filter(Boolean))];
      setCategories(distinct);
    } catch { /* non-fatal */ }
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const params = { status: reviewFilter };
      if (reviewSourceId) params.source_id = reviewSourceId;
      if (reviewRunId) params.run_id = reviewRunId;
      const r = await api.get('/api/discourse/suggestions', { params });
      setSuggestions(r.data);
    } catch (e) { flash('error', 'Failed to load suggestions.'); }
    finally { setLoading(false); }
  };

  const fetchRuns = async () => {
    try {
      const params = {};
      if (reviewSourceId) params.source_id = reviewSourceId;
      const r = await api.get('/api/discourse/runs', { params });
      setRuns(r.data);
    } catch { /* non-fatal */ }
  };

  // -------- Sources
  const saveSource = async (form) => {
    try {
      if (sourceModal.editing) {
        await api.patch(`/api/discourse/sources/${sourceModal.editing._id}`, form);
        flash('success', 'Source updated.');
      } else {
        await api.post('/api/discourse/sources', form);
        flash('success', 'Source added.');
      }
      setSourceModal({ open: false, editing: null });
      fetchSources();
    } catch (e) { flash('error', e.response?.data?.error || 'Save failed.'); }
  };

  const deleteSource = async (id) => {
    if (!window.confirm('Delete this source and all its suggestions?')) return;
    try { await api.delete(`/api/discourse/sources/${id}`); fetchSources(); flash('success', 'Source deleted.'); }
    catch (e) { flash('error', 'Delete failed.'); }
  };

  const testSource = async (id) => {
    try {
      setLoading(true);
      const r = await api.post(`/api/discourse/sources/${id}/test`, {}, { timeout: 60000 });
      flash('success', `Connected. Found ${r.data.count} posts in the last 7 days.`);
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Test failed.';
      flash('error', `Test: ${msg}`);
    } finally {
      // Always refresh — the backend may have updated last_synced_at even on partial error
      fetchSources();
      setLoading(false);
    }
  };

  // -------- Analyze
  const startAnalyze = async () => {
    if (!analyzeForm.sourceId) { flash('error', 'Pick a source first.'); return; }
    // The backend's parseRange() expects a string ('7d' | '30d' | '90d') for
    // preset ranges, or an object { from, to } for custom. Sending
    // { range: 'custom', from, to } would fall through to the 30d default.
    const payload = analyzeForm.range === 'custom'
      ? { from: analyzeForm.from, to: analyzeForm.to }
      : { range: analyzeForm.range };
    if (analyzeForm.force) payload.force = true;

    try {
      setLoading(true);
      const r = await api.post(`/api/discourse/sources/${analyzeForm.sourceId}/analyze`, payload, { timeout: 60000 });
      const { request_id, cached } = r.data;
      setAnalyzeStatus({ request_id, status: 'running', cached: !!cached });
      pollJob(request_id);
    } catch (e) {
      flash('error', e.response?.data?.error || 'Analyze failed to start.');
      setLoading(false);
    }
  };

  const pollJob = (request_id) => {
    clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const r = await api.get(`/api/discourse/jobs/${request_id}`);
        setAnalyzeStatus(s => ({ ...(s || {}), ...r.data, request_id }));
        if (r.data.status === 'done' || r.data.status === 'error') {
          clearInterval(pollingRef.current);
          setLoading(false);
          if (r.data.status === 'done') {
            const count = (r.data.suggestion_ids || []).length;
            flash('success', `Analysis complete. ${count} suggestion(s) generated.`);
            fetchSources();
            // Auto-jump to Review Queue filtered to the new run
            setReviewRunId(request_id);
            setReviewSourceId(analyzeForm.sourceId);
            setTab('review');
            setTimeout(() => { setTab('review'); }, 0);
          } else {
            flash('error', `Analysis error: ${r.data.error || 'unknown'}`);
          }
        }
      } catch (e) {
        clearInterval(pollingRef.current);
        setLoading(false);
      }
    }, 2000);
  };

  // -------- Review
  // Map action -> past-tense so the toast reads correctly
  // ("Suggestion approved." / "Suggestion rejected." / "Suggestion edited."
  // rather than "rejectd" / "editd").
  const REVIEW_PAST = { approve: 'approved', reject: 'rejected', edit: 'edited' };
  const review = async (id, action, overrides) => {
    try {
      await api.patch(`/api/discourse/suggestions/${id}/review`, { action, overrides });
      flash('success', `Suggestion ${REVIEW_PAST[action] || action}.`);
      fetchSuggestions();
    } catch (e) { flash('error', e.response?.data?.error || `${REVIEW_PAST[action] || action} failed.`); }
  };

  const openEdit = (s) => {
    setEditModal({ open: true, suggestion: s, form: { question: s.question, answer: s.answer, category: s.category } });
  };
  const submitEdit = async () => {
    try {
      await api.patch(`/api/discourse/suggestions/${editModal.suggestion._id}/review`, {
        action: 'edit', overrides: editModal.form
      });
      flash('success', 'Edited + approved as draft FAQ.');
      setEditModal({ open: false, suggestion: null, form: { question: '', answer: '', category: '' } });
      fetchSuggestions();
    } catch (e) { flash('error', 'Edit failed.'); }
  };

  const exportCsv = async () => {
    try {
      const r = await api.get('/api/discourse/suggestions-export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `discourse_suggestions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (e) { flash('error', 'Export failed.'); }
  };

  // ===================================================================
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Discourse FAQ Discovery</h1>
        {tab === 'review' && (
          <button onClick={exportCsv} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Export CSV</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-blue-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}

      {/* ============== SOURCES TAB ============== */}
      {tab === 'sources' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">Connect any Discourse forum and pick a category to analyze.</p>
            <button onClick={() => setSourceModal({ open: true, editing: null })}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">+ Add Source</button>
          </div>

          {sources.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-500 mb-2">No sources yet.</p>
              <p className="text-sm text-gray-400 mb-4">Try adding the public Discourse Meta forum to test the feature.</p>
              <button onClick={() => {
                setSourceModal({
                  open: true, editing: null,
                  form: { name: 'Discourse Meta (test)', base_url: 'https://meta.discourse.org', channel: 'support', api_key: '', api_username: '' }
                });
              }} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm">Use a sample (Discourse Meta / support)</button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="p-3">Name</th><th className="p-3">Base URL</th><th className="p-3">Channel</th>
                    <th className="p-3">Last Synced</th><th className="p-3">Active</th><th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(s => (
                    <tr key={s._id} className="border-t">
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 text-gray-600">{s.base_url}</td>
                      <td className="p-3"><code className="bg-gray-100 px-1.5 py-0.5 rounded">{s.channel}</code></td>
                      <td className="p-3 text-gray-600">
                        {s.last_synced_at
                          ? <span title={new Date(s.last_synced_at).toISOString()}>{new Date(s.last_synced_at).toLocaleString()}</span>
                          : <span className="text-gray-400">— never —</span>}
                      </td>
                      <td className="p-3">{s.is_active ? '✅' : '❌'}</td>
                      <td className="p-3 text-right space-x-3 whitespace-nowrap">
                        <button
                          onClick={() => testSource(s._id)}
                          disabled={loading}
                          className="text-blue-600 hover:underline disabled:opacity-50"
                        >{loading ? 'Testing…' : 'Test'}</button>
                        <button
                          onClick={() => setSourceModal({ open: true, editing: s })}
                          className="text-blue-600 hover:underline"
                        >Edit</button>
                        <button
                          onClick={() => deleteSource(s._id)}
                          className="text-red-600 hover:underline"
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============== ANALYZE TAB ============== */}
      {tab === 'analyze' && (
        <div className="bg-white border rounded-lg p-6">
          {sources.length === 0 ? (
            <p className="text-sm text-gray-500">Add a source first in the <button onClick={() => setTab('sources')} className="text-blue-600 underline">Sources</button> tab.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <select value={analyzeForm.sourceId} onChange={e => setAnalyzeForm({ ...analyzeForm, sourceId: e.target.value })}
                  className="px-3 py-2 border rounded text-sm">
                  <option value="">-- Pick a source --</option>
                  {sources.map(s => <option key={s._id} value={s._id}>{s.name} ({s.channel})</option>)}
                </select>
                <select value={analyzeForm.range} onChange={e => setAnalyzeForm({ ...analyzeForm, range: e.target.value })}
                  className="px-3 py-2 border rounded text-sm">
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {analyzeForm.range === 'custom' && (
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input type="date" value={analyzeForm.from} onChange={e => setAnalyzeForm({ ...analyzeForm, from: e.target.value })}
                    className="px-3 py-2 border rounded text-sm" />
                  <input type="date" value={analyzeForm.to} onChange={e => setAnalyzeForm({ ...analyzeForm, to: e.target.value })}
                    className="px-3 py-2 border rounded text-sm" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={analyzeForm.force} onChange={e => setAnalyzeForm({ ...analyzeForm, force: e.target.checked })}
                    className="rounded" />
                  Force re-analyze (bypass 5-min cache)
                </label>
              </div>
              <button onClick={startAnalyze} disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50">
                {loading ? 'Running...' : 'Run Analysis'}
              </button>
              <AnalyzeStatus status={analyzeStatus} />
            </>
          )}
        </div>
      )}

      {/* ============== REVIEW QUEUE TAB ============== */}
      {tab === 'review' && (
        <div>
          <div className="flex flex-wrap gap-1 mb-3 border-b">
            {['pending', 'approved', 'rejected', 'edited'].map(s => (
              <button key={s} onClick={() => setReviewFilter(s)}
                className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${reviewFilter === s ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
            <label className="text-gray-600">Source:</label>
            <select value={reviewSourceId} onChange={e => { setReviewSourceId(e.target.value); setReviewRunId(''); }}
              className="px-2 py-1 border rounded">
              <option value="">All sources</option>
              {sources.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <label className="text-gray-600 ml-2">Run:</label>
            <select value={reviewRunId} onChange={e => setReviewRunId(e.target.value)}
              className="px-2 py-1 border rounded">
              <option value="">All runs</option>
              {runs.map(r => (
                <option key={r._id} value={r._id}>
                  {new Date(r.started_at).toLocaleString()} — {r.source_name} — {r.range} — {r.suggestion_ids?.length || 0} sugg
                </option>
              ))}
            </select>
            {(reviewSourceId || reviewRunId) && (
              <button onClick={() => { setReviewSourceId(''); setReviewRunId(''); }}
                className="ml-2 text-blue-600 hover:underline">Clear filters</button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="loading-spinner"></div></div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-500">No {reviewFilter} suggestions{reviewSourceId || reviewRunId ? ' for the current filter.' : '.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map(s => (
                <div key={s._id} className="bg-white border rounded-lg">
                  <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === s._id ? null : s._id)}>
                    <div className="flex justify-between gap-3">
                      <h3 className="font-semibold">{s.question}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${s.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : s.status === 'approved' || s.status === 'edited' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {s.source_id?.name && <><span className="font-medium text-gray-700">{s.source_id.name}</span> · </>}
                      {s.cluster_size} discussions · {s.references?.length || 0} source refs · category: <code className="bg-gray-100 px-1 rounded">{s.category}</code>
                      {s.generated_at && <> · generated {new Date(s.generated_at).toLocaleString()}</>}
                    </p>
                  </div>
                  {expanded === s._id && (
                    <div className="px-4 pb-4 border-t pt-3 space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Proposed Answer</p>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded">{s.answer}</p>
                      </div>
                      {s.similar_faq_ids?.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-700 mb-1">⚠️ Similar Existing FAQs</p>
                          <ul className="bg-yellow-50 p-3 rounded space-y-1">
                            {s.similar_faq_ids.map(f => (
                              <li key={f._id} className="text-xs">
                                <span className="font-medium">{f.question}</span> <span className="text-gray-500">[{f.status}]</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {s.references?.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-700 mb-1">📚 Source References</p>
                          <ul className="space-y-1">
                            {s.references.slice(0, 5).map((r, i) => (
                              <li key={i} className="text-xs">
                                {r.url ? (
                                  <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                    {r.topic_title || `Topic #${r.topic_id}`}
                                  </a>
                                ) : (
                                  <span>Topic #{r.topic_id}</span>
                                )}
                                {r.excerpt && <p className="text-gray-500 ml-2">{r.excerpt.slice(0, 120)}...</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {s.status === 'pending' && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button onClick={() => review(s._id, 'approve')} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">✅ Approve</button>
                          <button onClick={() => openEdit(s)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">✏️ Edit</button>
                          <button onClick={() => review(s._id, 'reject')} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">❌ Reject</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============== SOURCE MODAL ============== */}
      {sourceModal.open && (
        <SourceModal
          editing={sourceModal.editing}
          initialForm={sourceModal.form}
          onClose={() => { setSourceModal({ open: false, editing: null, form: null }); }}
          onSave={saveSource}
        />
      )}

      {/* ============== EDIT MODAL ============== */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Suggestion</h2>
            <label className="block text-sm font-medium mb-1">Question</label>
            <input value={editModal.form.question} onChange={e => setEditModal({ ...editModal, form: { ...editModal.form, question: e.target.value } })}
              className="w-full px-3 py-2 border rounded mb-3 text-sm" />
            <label className="block text-sm font-medium mb-1">Answer</label>
            <textarea rows={5} value={editModal.form.answer} onChange={e => setEditModal({ ...editModal, form: { ...editModal.form, answer: e.target.value } })}
              className="w-full px-3 py-2 border rounded mb-3 text-sm" />
            <label className="block text-sm font-medium mb-1">Category</label>
            <input list="cat-list" value={editModal.form.category} onChange={e => setEditModal({ ...editModal, form: { ...editModal.form, category: e.target.value } })}
              className="w-full px-3 py-2 border rounded mb-3 text-sm" />
            <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
            <div className="flex gap-2 mt-4">
              <button
                onClick={submitEdit}
                disabled={!editModal.form.question.trim() || !editModal.form.answer.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >Save + Approve as Draft</button>
              <button onClick={() => setEditModal({ open: false, suggestion: null, form: { question: '', answer: '', category: '' } })}
                className="px-4 py-2 bg-gray-200 rounded text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============== helper components ==============
const STEP_LABELS = {
  queued: 'Starting…',
  fetching: 'Fetching posts from Discourse',
  clustering: 'Clustering posts with AI',
  saving: 'Saving suggestions',
  done: 'Done'
};

const AnalyzeStatus = ({ status }) => {
  if (!status) return null;
  if (status.status === 'running') {
    const label = STEP_LABELS[status.step] || 'Analyzing';
    const pct = Math.round((status.progress || 0) * 100);
    return (
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="loading-spinner"></div>
          <span className="font-medium">{label}…</span>
        </div>
        <div className="w-full bg-blue-100 rounded h-1.5 overflow-hidden">
          <div className="bg-blue-600 h-full transition-all" style={{ width: `${pct}%` }}></div>
        </div>
        <p className="text-xs text-blue-700 mt-1">{pct}% — hang tight.</p>
      </div>
    );
  }
  if (status.status === 'error') {
    return <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm">❌ {status.error || 'Analysis failed.'}</div>;
  }
  if (status.status === 'done') {
    return (
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
        ✅ Analysis complete. {status.cached && '(from 5-min cache)'} Suggestions: {(status.suggestion_ids || []).length}. Switch to the <b>Review Queue</b> tab to review.
      </div>
    );
  }
  return null;
};

const SourceModal = ({ editing, initialForm, onClose, onSave }) => {
  // For edits, the server returns a masked api_key (e.g. '••••abcd').
  // We strip it from the form so the user doesn't see confusing dots in the
  // input. The server ignores api_key in PATCH requests anyway (see
  // updateSource in discourse.controller.js), so this is purely a UX choice.
  // The api_key field below is also conditionally hidden for edits.
  const [form, setForm] = useState(initialForm || (editing ? {
    name: editing.name, base_url: editing.base_url,
    api_username: editing.api_username || '', channel: editing.channel, is_active: editing.is_active
  } : { name: '', base_url: '', api_key: '', api_username: '', channel: '', is_active: true }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Source' : 'Add Discourse Source'}</h2>
        <div className="space-y-3 text-sm">
          <div>
            <label className="block font-medium mb-1">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded" placeholder="e.g. IIT Ropar Forum" />
          </div>
          <div>
            <label className="block font-medium mb-1">Base URL</label>
            <input value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })}
              className="w-full px-3 py-2 border rounded" placeholder="https://meta.discourse.org" />
          </div>
          {!editing && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium mb-1">API Key <span className="text-gray-400">(optional)</span></label>
                <input value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })}
                  className="w-full px-3 py-2 border rounded" placeholder="leave blank for public" />
              </div>
              <div>
                <label className="block font-medium mb-1">API Username <span className="text-gray-400">(optional)</span></label>
                <input value={form.api_username} onChange={e => setForm({ ...form, api_username: e.target.value })}
                  className="w-full px-3 py-2 border rounded" placeholder="system" />
              </div>
            </div>
          )}
          {editing && (
            <p className="text-xs text-gray-500 bg-gray-50 border rounded p-2">
              🔒 API key is hidden. To rotate, delete this source and re-add it.
            </p>
          )}
          <div>
            <label className="block font-medium mb-1">Category Slug</label>
            <input value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}
              className="w-full px-3 py-2 border rounded" placeholder="support, dev, community-building, general, marketplace, news-and-events" />
            <p className="text-xs text-gray-500 mt-1">
              The word right after <code>/c/</code> in a Discourse URL. Try{' '}
              <code>support</code>, <code>dev</code>, <code>community-building</code>, <code>general</code>, <code>marketplace</code>, or <code>news-and-events</code>{' '}
              on <code>meta.discourse.org</code> — those are the live public slugs.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            {editing ? 'Save Changes' : 'Add Source'}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDiscourse;
