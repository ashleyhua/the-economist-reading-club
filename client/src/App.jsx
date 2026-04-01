import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Feed from './pages/Feed';
import PostPage from './pages/PostPage';
import Globe from './pages/Globe';
import LearnEnglish from './pages/LearnEnglish';
import LearnArticle from './pages/LearnArticle';
import VocabList from './pages/VocabList';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import NewPost from './pages/admin/NewPost';
import AdminPosts from './pages/admin/AdminPosts';
import AdminUsers from './pages/admin/AdminUsers';
import EditPost from './pages/admin/EditPost';
import './styles/global.css';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Feed /></RequireAuth>} />
        <Route path="/post/:id" element={<RequireAuth><PostPage /></RequireAuth>} />
        <Route path="/globe" element={<RequireAuth><Globe /></RequireAuth>} />
        <Route path="/learn" element={<RequireAuth><LearnEnglish /></RequireAuth>} />
        <Route path="/learn/vocab" element={<RequireAuth><VocabList /></RequireAuth>} />
        <Route path="/learn/:id" element={<RequireAuth><LearnArticle /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="new-post" element={<NewPost />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="edit/:id" element={<EditPost />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}