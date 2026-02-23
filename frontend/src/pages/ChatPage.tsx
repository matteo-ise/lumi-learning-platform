import { useParams } from 'react-router-dom'

export function ChatPage() {
  const { id } = useParams()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray">
      <div className="text-center">
        <div className="text-6xl mb-4">💬</div>
        <h1 className="text-3xl font-bold text-primary">KI-Chat</h1>
        <p className="text-lg text-dark/70 mt-2">Fach: {id} – kommt in Sprint 4</p>
      </div>
    </div>
  )
}
