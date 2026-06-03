import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const AdminDiscussions = () => {
  const [flagged, setFlagged] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchModerationItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/discussions/moderation');
      setFlagged(res.data.flagged || []);
      setCandidates(res.data.candidates || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load moderation items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationItems();
  }, []);

  const deleteReply = async (id) => {
    if (!confirm('Are you sure you want to delete this flagged reply?')) return;
    try {
      await api.delete(`/api/discussions/replies/${id}`);
      fetchModerationItems();
    } catch (err) {
      setError('Failed to delete reply.');
    }
  };

  const dismissFlag = async (id) => {
    if (!confirm('Are you sure you want to dismiss this flag?')) return;
    try {
      await api.post(`/api/discussions/replies/${id}/dismiss-flag`);
      fetchModerationItems();
    } catch (err) {
      setError('Failed to dismiss flag.');
    }
  };

  const promoteToFAQ = async (id) => {
    if (!confirm('Promote this reply to a Draft FAQ?')) return;
    try {
      const res = await api.post(`/api/discussions/replies/${id}/promote`);
      alert(res.data.message);
      fetchModerationItems();
      navigate('/admin/faqs'); // Send them to the FAQ page to see the new draft
    } catch (err) {
      setError('Failed to promote to FAQ. ' + (err.response?.data?.error || ''));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Forum Moderation Dashboard</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Flagged Comments Section */}
        <div>
          <h2 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
            <span>🚩 Flagged Comments</span>
            <span className="bg-red-100 text-red-800 text-sm py-1 px-3 rounded-full">{flagged.length}</span>
          </h2>
          
          <div className="space-y-4">
            {flagged.length === 0 ? (
              <div className="bg-gray-50 border rounded-lg p-6 text-center text-gray-500">
                No flagged comments currently.
              </div>
            ) : (
              flagged.map(reply => (
                <div key={reply._id} className="bg-white border border-red-200 rounded-lg shadow-sm p-5 relative">
                  <div className="absolute top-4 right-4 bg-red-100 text-red-800 font-bold px-2 py-1 rounded text-xs">
                    {reply.downvotes?.length || 0} Downvotes
                  </div>
                  
                  <p className="text-gray-800 mb-3 pr-16">"{reply.text}"</p>
                  
                  <div className="text-sm text-gray-500 mb-4 bg-gray-50 p-2 rounded">
                    From Thread:{' '}
                    <Link to={`/discussions/${reply.discussion?._id}`} className="text-blue-600 hover:underline font-medium">
                      {reply.discussion?.title || 'Unknown Thread'}
                    </Link>
                    <div className="mt-1">
                      Author: <span className="font-medium text-gray-700">{reply.author?.username || 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => deleteReply(reply._id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Delete Comment
                    </button>
                    <button 
                      onClick={() => dismissFlag(reply._id)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-lg transition-colors"
                    >
                      Dismiss Flag
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FAQ Candidates Section */}
        <div>
          <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
            <span>💡 FAQ Candidates</span>
            <span className="bg-green-100 text-green-800 text-sm py-1 px-3 rounded-full">{candidates.length}</span>
          </h2>
          
          <div className="space-y-4">
            {candidates.length === 0 ? (
              <div className="bg-gray-50 border rounded-lg p-6 text-center text-gray-500">
                No FAQ candidates currently.
              </div>
            ) : (
              candidates.map(reply => (
                <div key={reply._id} className="bg-white border border-green-200 rounded-lg shadow-sm p-5 relative">
                  <div className="absolute top-4 right-4 bg-green-100 text-green-800 font-bold px-2 py-1 rounded text-xs">
                    {reply.upvotes?.length || 0} Upvotes
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-2 bg-gray-50 p-2 rounded">
                    <div className="font-medium text-gray-700 mb-1">
                      Thread Title (Will be FAQ Question):
                    </div>
                    <Link to={`/discussions/${reply.discussion?._id}`} className="text-blue-600 hover:underline">
                      {reply.discussion?.title || 'Unknown Thread'}
                    </Link>
                  </div>
                  
                  <div className="font-medium text-gray-700 mb-1 text-sm mt-3">Suggested Answer:</div>
                  <p className="text-gray-800 mb-4 pr-16 bg-gray-50 p-3 rounded border border-gray-100">
                    {reply.text}
                  </p>

                  <div className="text-xs text-gray-500 mb-4">
                    Author: <span className="font-medium text-gray-700">{reply.author?.username || 'Unknown'}</span>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => promoteToFAQ(reply._id)}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors text-center"
                    >
                      Promote to Draft FAQ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDiscussions;
