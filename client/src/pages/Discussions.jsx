import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Discussions = () => {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchDiscussions = async () => {
    try {
      const res = await api.get('/api/discussions', { params: { page, limit } });
      setList(res.data.discussions || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error('Failed to load discussions', e);
    }
  };

  useEffect(() => { fetchDiscussions(); }, [page]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this discussion?')) return;
    try {
      await api.delete(`/api/discussions/${id}`);
      fetchDiscussions();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !text) return;
    setLoading(true);
    try {
      await api.post('/api/discussions', { title, text });
      setTitle(''); setText('');
      fetchDiscussions();
    } catch (err) {
      console.error('Create failed', err);
      alert(err.response?.data?.error || 'Create failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Discussions</h1>

      {user ? (
        <form onSubmit={handleCreate} className="mb-6 space-y-3 bg-white p-4 rounded shadow-sm">
          <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Title" className="w-full p-2 border rounded" />
          <textarea value={text} onChange={(e)=>setText(e.target.value)} placeholder="Start a discussion..." className="w-full p-2 border rounded" rows={4} />
          <div className="flex justify-end">
            <button disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading? 'Posting...' : 'Post Discussion'}</button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-yellow-50 rounded">Please login to create discussions.</div>
      )}

      <div className="space-y-3">
        {list.length === 0 && <div className="p-4 bg-white rounded shadow-sm">No discussions yet.</div>}
        {list.map(d => (
          <div key={d._id} className="bg-white p-4 rounded shadow-sm relative">
            {(user?.role === 'ADMIN' || user?._id === d.author?._id) && (
              <button 
                onClick={(e) => { e.preventDefault(); handleDelete(d._id); }} 
                className="absolute top-4 right-4 text-red-500 hover:text-red-700 text-lg"
                title="Delete Discussion"
              >
                🗑️
              </button>
            )}
            <Link to={`/discussions/${d._id}`} className="text-lg font-medium text-blue-600 pr-8 inline-block">{d.title}</Link>
            <div className="text-sm text-gray-600">by {d.author?.username || 'Unknown'} • {d.replies_count || 0} replies</div>
            <p className="mt-2 text-gray-800">{d.text && d.text.substring(0, 240)}{d.text && d.text.length > 240 ? '...' : ''}</p>
          </div>
        ))}
      </div>

      {total > limit && (
        <div className="flex justify-between items-center mt-6">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-600">Page {page} of {Math.ceil(total / limit)}</span>
          <button 
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Discussions;
