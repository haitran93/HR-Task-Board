import { Routes, Route, Navigate } from 'react-router-dom'
import MyTasks from './pages/MyTasks.jsx'
import CalendarPage from './pages/Calendar.jsx'
import Brainstorm from './pages/Brainstorm.jsx'
import AdminBoard from './pages/AdminBoard.jsx'
import Login from './pages/Login.jsx'
import { useCurrentUser } from './lib/currentUser'

function AdminGate({ children }) {
  const { currentUser } = useCurrentUser()
  if (!currentUser) return null
  if (!currentUser.isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { session, sessionLoading, currentUser } = useCurrentUser()

  if (sessionLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading HR Hub…</div>
  }

  if (!session) {
    return <Login />
  }

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Setting up your account…</div>
  }

  return (
    <div className="min-h-screen bg-bg">
      <Routes>
        <Route path="/" element={<MyTasks />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/brainstorm" element={<Brainstorm />} />
        <Route
          path="/admin"
          element={
            <AdminGate>
              <AdminBoard />
            </AdminGate>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
