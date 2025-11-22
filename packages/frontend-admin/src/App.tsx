import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authApi } from './api/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PhotoDetail from './pages/PhotoDetail';
import Categories from './pages/Categories';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return authApi.isAuthenticated() ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" replace />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/photos/:id"
          element={
            <ProtectedRoute>
              <PhotoDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
