import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { AppPage } from './pages/AppPage'
import { WizardPage } from './pages/WizardPage'
import { ChatPage } from './pages/ChatPage'
import { SubjectChatPage } from './pages/SubjectChatPage'
import { BlastPage } from './pages/BlastPage'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<ProtectedRoute><AppPage /></ProtectedRoute>} />
        <Route path="/app/wizard" element={<ProtectedRoute><WizardPage /></ProtectedRoute>} />
        <Route path="/app/fach/:subject" element={<ProtectedRoute><SubjectChatPage /></ProtectedRoute>} />
        <Route path="/app/kurs/:id/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/app/blast" element={<ProtectedRoute><BlastPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
