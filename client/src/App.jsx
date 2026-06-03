import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SubmitQuestion from './pages/SubmitQuestion';
import Dashboard from './pages/Dashboard';
import AdminQuestions from './pages/AdminQuestions';
import AdminFAQs from './pages/AdminFAQs';
import AdminUsers from './pages/AdminUsers';
import AdminActivities from './pages/AdminActivities';
import AdminAnalytics from './pages/AdminAnalytics';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Discussions from './pages/Discussions';
import DiscussionThread from './pages/DiscussionThread';
import AdminDiscussions from './pages/AdminDiscussions';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="discussions" element={<Discussions />} />
        <Route path="discussions/:id" element={<DiscussionThread />} />
        <Route path="submit-question" element={<SubmitQuestion />} />
        <Route path="dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="admin/questions" element={
          <ProtectedRoute adminOnly><AdminQuestions /></ProtectedRoute>
        } />
        <Route path="admin/discussions" element={
          <ProtectedRoute adminOnly><AdminDiscussions /></ProtectedRoute>
        } />
        <Route path="admin/faqs" element={
          <ProtectedRoute adminOnly><AdminFAQs /></ProtectedRoute>
        } />
        <Route path="admin/users" element={
          <ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>
        } />
        <Route path="admin/activities" element={
          <ProtectedRoute adminOnly><AdminActivities /></ProtectedRoute>
        } />
        <Route path="admin/analytics" element={
          <ProtectedRoute adminOnly><AdminAnalytics /></ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;