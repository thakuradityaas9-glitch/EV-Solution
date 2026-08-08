import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import DriverHome from './pages/driver/DriverHome.jsx'
import Recommendations from './pages/driver/Recommendations.jsx'
import Dashboard from './pages/operator/Dashboard.jsx'
import LiveOperations from './pages/operator/LiveOperations.jsx'
import Chargers from './pages/operator/Chargers.jsx'
import Analytics from './pages/operator/Analytics.jsx'
import DriverLayout from './layouts/DriverLayout.jsx'
import OperatorLayout from './layouts/OperatorLayout.jsx'
import './App.css'
import { useAuth } from './context/AuthContext.jsx'

function App() {
  // Inline auth/role route guards to avoid creating new files.
  const RequireAuth = ({ children }) => {
    const { user, loading } = useAuth()
    if (loading) return null
    if (!user) return <Navigate to="/login" replace />
    return children
  }

  const RoleGuard = ({ role, children }) => {
    const { profile, loading } = useAuth()
    if (loading) return null
    if (!profile) return <Navigate to="/login" replace />
    if (profile.role !== role) {
      return <Navigate to={profile.role === 'operator' ? '/operator' : '/driver'} replace />
    }
    return children
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/driver" element={<RequireAuth><RoleGuard role="driver"><DriverLayout /></RoleGuard></RequireAuth>}>
          <Route index element={<DriverHome />} />
          <Route path="recommendations" element={<Recommendations />} />
        </Route>
        <Route path="/operator" element={<RequireAuth><RoleGuard role="operator"><OperatorLayout /></RoleGuard></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="live" element={<LiveOperations />} />
          <Route path="chargers" element={<Chargers />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>

        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
