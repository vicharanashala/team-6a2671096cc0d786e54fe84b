import { useState, useEffect } from 'react';
import api from '../services/api';

const AdminQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterStatus, setFilterStatus] = useState('new');
  const [suggestedFaqs, setSuggestedFaqs] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [grouping, setGrouping] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [editingSuggestedId, setEditingSuggestedId] = useState(null);
  const [editSuggestedData, setEditSuggestedData] = useState({ question: '', answer: '', category: '' });

  const fetchSuggestedFaqs = async () => {
    try {
      const response = await api.get('/api/faqs', { params: { status: 'suggested' } });
      setSuggestedFaqs(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchSuggestedFaqs();
  }, [filterStatus]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/questions', { params: { status: filterStatus === 'all' ? undefined : filterStatus } });
      setQuestions(response.data);
      setError(null);
      setSelectedIds([]);
    } catch (err) {
      setError('Failed to load questions. ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map(q => q._id));
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/api/questions/${id}/status`, { status: newStatus });
      fetchQuestions();
    } catch (err) {
      setError('Failed to update status.');
    }
  };

  const handleGroup = async () => {
    if (selectedIds.length < 2) {
      setError('Select at least 2 questions to group.');
      return;
    }
    setGrouping(true);
    setError(null);
    try {
      const category = prompt('Enter category for grouped questions (or press OK for default):');
      await api.post('/api/questions/group', { questionIds: selectedIds, category: category || 'general' });
      setSelectedIds([]);
      fetchQuestions();
    } catch (err) {
      setError('Failed to group questions. ' + (err.response?.data?.error || ''));
    } finally {
      setGrouping(false);
    }
  };

  const handleSuggestFAQ = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const response = await api.post('/api/questions/auto-suggest');
      alert(response.data.message);
      fetchSuggestedFaqs();
      fetchQuestions();
    } catch (err) {
      setError('Failed to auto-suggest FAQs. ' + (err.response?.data?.error || 'Check if Gemini API key is configured.'));
    } finally {
      setSuggesting(false);
    }
  };

  const approveSuggested = async (id) => {
    try {
      await api.patch(`/api/faqs/${id}/status`, { status: 'published' });
      fetchSuggestedFaqs();
      fetchQuestions();
    } catch (err) {
      setError('Failed to approve suggestion.');
    }
  };

  const rejectSuggested = async (id) => {
    if (!confirm('Are you sure you want to reject and delete this suggestion?')) return;
    try {
      await api.delete(`/api/faqs/${id}`);
      fetchSuggestedFaqs();
    } catch (err) {
      setError('Failed to reject suggestion.');
    }
  };

  const saveSuggestedEdit = async (id) => {
    try {
      await api.put(`/api/faqs/${id}`, editSuggestedData);
      setEditingSuggestedId(null);
      fetchSuggestedFaqs();
    } catch (err) {
      setError('Failed to save edit.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/api/questions/${id}`);
      fetchQuestions();
    } catch (err) {
      setError('Failed to delete question.');
    }
  };

  const handleBulkImport = async () => {
    try {
      const lines = importData.trim().split('\n');
      const imported = [];
      const errors = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 1 || !parts[0]) {
          errors.push(`Line ${i + 1}: Question text required`);
          continue;
        }
        
        imported.push({
          text: parts[0],
          category: parts[1] || 'general',
          source: 'bulk_import'
        });
      }

      if (imported.length === 0) {
        setError('No valid questions to import. Format: question_text | category');
        return;
      }

      for (const q of imported) {
        await api.post('/api/questions', q);
      }

      setImportModalOpen(false);
      setImportData('');
      fetchQuestions();
      alert(`Successfully imported ${imported.length} questions. ${errors.length > 0 ? '\nErrors: ' + errors.length : ''}`);
    } catch (err) {
      setError('Failed to import questions. ' + (err.response?.data?.error || ''));
    }
  };

  const statuses = ['all', 'new', 'grouped', 'reviewed', 'converted_to_faq', 'rejected'];

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'grouped': return 'bg-purple-100 text-purple-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      case 'converted_to_faq': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Manage Questions</h1>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
          >
            Bulk Import
          </button>
          <button
            onClick={handleSuggestFAQ}
            disabled={suggesting}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {suggesting ? 'Auto-Grouping...' : 'Auto-Group & Suggest FAQs'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <span className="text-blue-800 font-medium">{selectedIds.length} question(s) selected</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGroup}
                disabled={grouping || selectedIds.length < 2}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                {grouping ? 'Grouping...' : 'Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {suggestedFaqs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-yellow-800 mb-4">AI Suggested FAQs</h2>
          <div className="space-y-4">
            {suggestedFaqs.map(faq => (
              <div key={faq._id} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-100">
                {editingSuggestedId === faq._id ? (
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={editSuggestedData.question}
                      onChange={e => setEditSuggestedData({...editSuggestedData, question: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md font-semibold text-lg"
                      placeholder="Question"
                    />
                    <textarea 
                      value={editSuggestedData.answer}
                      onChange={e => setEditSuggestedData({...editSuggestedData, answer: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                      rows="3"
                      placeholder="Answer"
                    />
                    <input 
                      type="text" 
                      value={editSuggestedData.category}
                      onChange={e => setEditSuggestedData({...editSuggestedData, category: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="Category"
                    />
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => saveSuggestedEdit(faq._id)} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">Save</button>
                      <button onClick={() => setEditingSuggestedId(null)} className="px-3 py-1.5 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm font-medium">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-lg">{faq.question}</h3>
                    <p className="text-gray-600 mt-2 whitespace-pre-wrap">{faq.answer}</p>
                    <div className="text-sm text-gray-500 mt-2">
                      Category: <span className="bg-gray-100 px-2 py-1 rounded">{faq.category}</span>
                      <span className="ml-4">From {faq.source_questions?.length} questions</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => approveSuggested(faq._id)} className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium">Approve</button>
                      <button onClick={() => {
                        setEditingSuggestedId(faq._id);
                        setEditSuggestedData({ question: faq.question, answer: faq.answer, category: faq.category });
                      }} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">Edit</button>
                      <button onClick={() => rejectSuggested(faq._id)} className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium">Reject</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="loading-spinner"></div></div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500 mb-4">No questions found with status: {filterStatus.replace(/_/g, ' ')}</p>
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Import Questions
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === questions.length && questions.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-600 min-w-[200px]">Question</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Created By</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Category</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Source</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Submitted</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map(q => (
                  <tr key={q._id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(q._id)}
                        onChange={() => toggleSelect(q._id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="max-w-xs lg:max-w-md xl:max-w-lg truncate font-medium text-gray-900" title={q.text}>{q.text}</div>
                    </td>
                    <td className="px-3 py-3">
                      {q.submitted_by ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{q.submitted_by.username || 'Unknown'}</div>
                          <div className="text-gray-500 text-xs">{q.submitted_by.email}</div>
                          {q.is_guest && <span className="text-xs text-orange-500">(Guest)</span>}
                        </div>
                      ) : (
                        <div className="text-sm">
                          <span className="text-gray-400">Legacy submission</span>
                          {q.guest_email && <div className="text-xs text-orange-500">{q.guest_email}</div>}
                          {!q.guest_email && <div className="text-xs text-gray-400">(pre-auth data)</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(q.status)}`}>
                        {q.category}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">{q.source || 'manual'}</span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(q.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={q.status}
                          onChange={(e) => handleStatusChange(q._id, e.target.value)}
                          className="text-xs border rounded px-2 py-1"
                        >
                          {statuses.filter(s => s !== 'all').map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDelete(q._id)}
                          className="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {importModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Bulk Import Questions</h2>
            <p className="text-sm text-gray-600 mb-4">
              Format: <code className="bg-gray-100 px-1 rounded">question_text | category</code>
              <br />One question per line. Category is optional (defaults to "general").
            </p>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={10}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="How do I reset my password? | account&#10;What payment methods do you accept? | billing&#10;Is there a free trial available? | billing"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleBulkImport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >Import Questions</button>
              <button
                onClick={() => { setImportModalOpen(false); setImportData(''); }}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuestions;