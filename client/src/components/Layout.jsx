import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">FAQ Generator</Link>
              
              <div className="hidden md:flex md:ml-8 md:space-x-4">
                <Link to="/" className="px-3 py-2 text-gray-700 hover:text-blue-600 text-sm font-medium">Home</Link>
                 <Link to="/discussions" className="px-3 py-2 text-gray-700 hover:text-blue-600 text-sm font-medium">Discussions</Link>
                {user && (
                  <Link to="/submit-question" className="px-3 py-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
                    Submit Question
                  </Link>
                )}
                {isAdmin() && (
                  <>
                    <Link to="/admin/questions" className="px-3 py-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
                      Questions
                    </Link>
                    <Link to="/admin/discussions" className="px-3 py-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
                      Forum Mod
                    </Link>
                    <Link to="/admin/faqs" className="px-3 py-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
                      FAQs
                    </Link>
                    <Link to="/admin/users" className="px-3 py-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
                      Users
                    </Link>
                    <Link to="/admin/activities" className="px-3 py-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
                      Activities
                    </Link>
                    <Link to="/admin/analytics" className="px-3 py-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
                      Analytics
                    </Link>
                    <Link to="/admin/discourse" className="px-3 py-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
                      Discourse
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center">
              {user ? (
                <div className="hidden md:flex md:items-center md:space-x-4">
                  <span className="text-sm text-gray-600">
                    Welcome, <span className="font-medium">{user.username}</span>
                  </span>
                  <Link 
                    to="/dashboard" 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Dashboard
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex md:items-center md:space-x-3">
                  <Link 
                    to="/login" 
                    className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col space-y-3">
                <Link 
                  to="/" 
                  className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                                <Link 
                                  to="/discussions" 
                                  className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  Discussions
                                </Link>
                
                {user ? (
                  <>
                    <Link 
                      to="/submit-question" 
                      className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Submit Question
                    </Link>
                    {isAdmin() && (
                      <>
                        <Link 
                          to="/admin/questions" 
                          className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Questions
                        </Link>
                        <Link 
                          to="/admin/discussions" 
                          className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Forum Mod
                        </Link>
                        <Link 
                          to="/admin/faqs" 
                          className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          FAQs
                        </Link>
                        <Link 
                          to="/admin/users" 
                          className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Users
                        </Link>
                        <Link 
                          to="/admin/activities" 
                          className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Activities
                        </Link>
                        <Link
                          to="/admin/analytics"
                          className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Analytics
                        </Link>
                        <Link
                          to="/admin/discourse"
                          className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Discourse
                        </Link>
                      </>
                    )}
                    <div className="pt-3 border-t">
                      <p className="px-3 py-2 text-sm text-gray-600">
                        Welcome, <span className="font-medium">{user.username}</span>
                      </p>
                      <Link 
                        to="/dashboard" 
                        className="block px-3 py-2 text-blue-600 hover:bg-gray-50 rounded text-sm font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <button 
                        onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded text-sm"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="pt-3 border-t flex flex-col space-y-2">
                    <Link 
                      to="/login" 
                      className="px-3 py-2 text-blue-600 hover:bg-gray-50 rounded text-sm font-medium text-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link 
                      to="/register" 
                      className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium text-center hover:bg-blue-700"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-white border-t py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <p>FAQ Generator - A Team One Project</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;