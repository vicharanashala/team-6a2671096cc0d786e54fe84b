import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Chatbot from '../components/Chatbot';

const Home = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [ratedFaqs, setRatedFaqs] = useState(() => {
    const saved = localStorage.getItem('ratedFaqs');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    fetchFaqs();
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchFaqs = async () => {
    try {
      const response = await api.get('/api/faqs/published');
      setFaqs(response.data);
      setError(null);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        setError('Failed to load FAQs. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (faqId) => {
    try {
      await api.patch(`/api/faqs/${faqId}/view`);
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  };

  const submitRating = async (faqId, rating) => {
    try {
      const oldRating = ratedFaqs[faqId];
      if (oldRating === rating) return;
      await api.post(`/api/faqs/${faqId}/rate`, { rating, oldRating });
      setRatedFaqs(prev => {
        const newState = { ...prev, [faqId]: rating };
        localStorage.setItem('ratedFaqs', JSON.stringify(newState));
        return newState;
      });
    } catch (err) {
      console.error('Failed to submit rating:', err);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const categories = ['all', ...new Set(faqs.map(faq => faq.category).filter(Boolean))];

  const filteredFaqs = faqs
    .filter(faq => {
      const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-600">Find answers to the most common questions</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search FAQs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
          ))}
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* FAQ Count */}
      {!error && faqs.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          Showing <span className="font-medium text-gray-700">{filteredFaqs.length}</span> of <span className="font-medium text-gray-700">{faqs.length}</span> FAQs
        </p>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {filteredFaqs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-500">
            {faqs.length === 0 ? 'No FAQs available yet.' : 'No FAQs match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map(faq => (
            <details
              key={faq._id}
              className="bg-white rounded-lg shadow-sm border group"
              onToggle={() => trackView(faq._id)}
            >
              <summary className="px-5 py-4 cursor-pointer font-medium text-gray-900 hover:text-blue-600 list-none">
                <div className="flex items-center justify-between">
                  <span>{faq.question}</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200 ml-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
                {faq.category && faq.category !== 'general' && (
                  <span className="text-xs text-blue-600 mt-1 inline-block">{faq.category}</span>
                )}
              </summary>
              <div className="px-5 pb-4 text-gray-600 border-t pt-3 flex flex-col gap-3">
                <div>{faq.answer}</div>
                <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    {ratedFaqs[faq._id] ? 'Your Rating:' : 'Helpful?'}
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={(e) => {
                          e.preventDefault();
                          submitRating(faq._id, star);
                        }}
                        className={`focus:outline-none transition-colors ${
                          ratedFaqs[faq._id] >= star
                            ? 'text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 z-50"
          aria-label="Back to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      <Chatbot />
    </div>
  );
};

export default Home;