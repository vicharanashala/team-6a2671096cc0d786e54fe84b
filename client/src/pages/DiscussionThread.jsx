import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const DiscussionThread = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [discussion, setDiscussion] = useState(null);
  const [replies, setReplies] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    try {
      const res = await api.get(`/api/discussions/${id}`);
      setDiscussion(res.data.discussion);
      setReplies(res.data.replies || []);
    } catch (e) {
      console.error('Failed to load', e);
    }
  };

  useEffect(() => { if (id) fetch(); }, [id]);

  const deleteDiscussion = async () => {
    if (!confirm('Are you sure you want to delete this discussion?')) return;
    try {
      await api.delete(`/api/discussions/${id}`);
      window.location.href = '/discussions';
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const deleteReply = async (replyId) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;
    try {
      await api.delete(`/api/discussions/replies/${replyId}`);
      fetch();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const postReply = async (e) => {
    e && e.preventDefault();
    if (!text) return;
    setLoading(true);
    try {
      await api.post(`/api/discussions/${id}/replies`, { text });
      setText('');
      fetch();
    } catch (err) {
      console.error('Reply failed', err);
      alert(err.response?.data?.error || 'Reply failed');
    } finally { setLoading(false); }
  };

  const vote = async (replyId, v) => {
    try {
      await api.post(`/api/discussions/replies/${replyId}/vote`, { vote: v });
      fetch();
    } catch (err) {
      console.error('Vote failed', err);
      alert(err.response?.data?.error || 'Vote failed');
    }
  };

  if (!discussion) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold">{discussion.title}</h1>
          <div className="text-sm text-gray-600">by {discussion.author?.username || 'Unknown'}</div>
        </div>
        {(user?.role === 'ADMIN' || user?._id === discussion.author?._id) && (
          <button onClick={deleteDiscussion} className="text-red-500 hover:text-red-700 text-lg" title="Delete Discussion">
            🗑️
          </button>
        )}
      </div>
      <p className="bg-white p-4 rounded shadow-sm">{discussion.text}</p>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Replies</h2>
        {replies.length === 0 && <div className="p-4 bg-white rounded mt-3">No replies yet.</div>}
        <div className="space-y-3 mt-3">
          {replies.map(r => (
            <div key={r._id} className="bg-white p-3 rounded shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{r.author?.username || r.author}</div>
                  <div className="text-sm text-gray-600">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  {(user?.role === 'ADMIN' || user?._id === r.author?._id || user?._id === r.author) && (
                    <button onClick={() => deleteReply(r._id)} className="mr-2 text-red-500 hover:text-red-700" title="Delete Reply">
                      🗑️
                    </button>
                  )}
                  <button onClick={() => vote(r._id, 1)} className="px-2 py-1 bg-green-50 text-green-600 rounded">▲ {Array.isArray(r.upvotes)? r.upvotes.length : (r.upvotes?1:0)}</button>
                  <button onClick={() => vote(r._id, -1)} className="px-2 py-1 bg-red-50 text-red-600 rounded">▼ {Array.isArray(r.downvotes)? r.downvotes.length : 0}</button>
                </div>
              </div>
              <p className="mt-2">{r.text}</p>
              {r.isFaqCandidate && <div className="mt-2 text-sm text-green-700">FAQ candidate</div>}
              {r.isFlagged && <div className="mt-2 text-sm text-red-700">Flagged for review</div>}
            </div>
          ))}
        </div>
      </div>

      {user ? (
        <form onSubmit={postReply} className="mt-6 bg-white p-4 rounded shadow-sm">
          <textarea value={text} onChange={(e)=>setText(e.target.value)} rows={4} className="w-full p-2 border rounded" placeholder="Write a reply..." />
          <div className="flex justify-end mt-2">
            <button disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Posting...' : 'Post Reply'}</button>
          </div>
        </form>
      ) : (
        <div className="mt-6 p-4 bg-yellow-50 rounded">Please login to reply.</div>
      )}
    </div>
  );
};

export default DiscussionThread;
