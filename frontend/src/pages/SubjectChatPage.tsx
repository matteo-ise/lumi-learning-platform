import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Markdown from 'react-markdown'
import { apiFetch } from '../services/api'
import { HotKeyButtons } from '../components/HotKeyButtons'
import { StepTimeline } from '../components/StepTimeline'

interface Message {
  role: 'user' | 'assistant' | 'error'
  content: string
}

const avatarEmojis: Record<string, string> = {
  fox: '🦊', owl: '🦉', panda: '🐼', dolphin: '🐬',
  cat: '🐱', turtle: '🐢', penguin: '🐧', rabbit: '🐰',
}

const subjectLabels: Record<string, string> = {
  mathe: 'Mathe', deutsch: 'Deutsch', englisch: 'Englisch',
  sachunterricht: 'Sachunterricht', kunst: 'Kunst', musik: 'Musik',
  sport: 'Sport', religion_ethik: 'Religion/Ethik',
}

const goalTypes = [
  { id: 'uebung', label: 'Übung', emoji: '📝' },
  { id: 'hausaufgabe', label: 'Hausaufgabe', emoji: '📖' },
  { id: 'pruefung', label: 'Prüfung', emoji: '📋' },
]

function parseStep(content: string): number {
  const match = content.match(/\[SCHRITT\s+(\d)\/3\]/)
  return match ? parseInt(match[1], 10) : 0
}

export function SubjectChatPage() {
  const { subject } = useParams<{ subject: string }>()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [avatar, setAvatar] = useState('fox')
  const [courseId, setCourseId] = useState<number | null>(null)

  // Widget state
  const [widgetTopic, setWidgetTopic] = useState('')
  const [widgetGoal, setWidgetGoal] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const subjectLabel = subjectLabels[subject || ''] || subject || ''

  useEffect(() => {
    apiFetch<{ avatar: string }>('/api/greeting')
      .then((g) => setAvatar(g.avatar))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const avatarEmoji = avatarEmojis[avatar] || '🦊'

  /** Creates a course (if not yet), then sends a message */
  const sendMessage = async (text: string, topic?: string, goalType?: string) => {
    if (!text.trim() || loading) return
    setLoading(true)

    const userMsg: Message = { role: 'user', content: text.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    try {
      let activeCourseId = courseId
      if (!activeCourseId) {
        const course = await apiFetch<{ id: number }>('/api/courses', {
          method: 'POST',
          body: JSON.stringify({
            subject: subject || '',
            topic: topic || text.slice(0, 60),
            goal_type: goalType || '',
            goal_deadline: '',
          }),
        })
        activeCourseId = course.id
        setCourseId(course.id)
        // Update URL without remounting
        window.history.replaceState(null, '', `/app/kurs/${course.id}/chat`)
      }

      const res = await apiFetch<{ response: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ course_id: activeCourseId, message: text.trim() }),
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.response }])
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: 'error',
        content: e instanceof Error ? e.message : 'Fehler beim Senden.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const sendHotkey = async (type: string) => {
    if (!courseId || loading) return
    setLoading(true)
    try {
      const res = await apiFetch<{ response: string }>('/api/chat/hotkey', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, hotkey_type: type }),
      })
      const labels: Record<string, string> = {
        NEXT_STEP: '✅ Verstanden, weiter',
        SIMPLIFY: '❓ Nicht verstanden',
        EXAMPLE: '💡 Zeig Beispiel',
      }
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: labels[type] || type },
        { role: 'assistant', content: res.response },
      ])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  /** Widget: send as formatted prompt template */
  const handleWidgetSend = () => {
    if (!widgetTopic.trim()) {
      inputRef.current?.focus()
      return
    }
    const goalLabel = goalTypes.find(g => g.id === widgetGoal)?.label || 'Übung'
    const prompt = `Ich möchte eine ${goalLabel} zum Thema "${widgetTopic}" im Fach ${subjectLabel} vorbereiten. Bitte hilf mir dabei Schritt für Schritt.`
    sendMessage(prompt, widgetTopic, widgetGoal)
  }

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')
  const currentStep = lastAssistantMsg ? parseStep(lastAssistantMsg.content) : 0
  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-screen bg-gray">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/app')}
          className="text-dark/50 hover:text-dark font-bold text-lg transition-colors"
        >
          ← Zurück
        </button>
        <span className="flex-1 font-extrabold text-dark text-lg">{subjectLabel}</span>
        {currentStep > 0 && (
          <div className="hidden sm:block">
            <StepTimeline currentStep={currentStep} />
          </div>
        )}
        <span className="text-2xl">{avatarEmoji}</span>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">

        {/* Goal widget – shown when no messages yet */}
        {!hasMessages && !loading && (
          <div className="flex justify-center pt-4">
            <div className="bg-white rounded-3xl shadow-md p-6 w-full max-w-md border-2 border-primary/10">
              <div className="text-center mb-4">
                <span className="text-4xl">{avatarEmoji}</span>
                <h3 className="text-lg font-extrabold text-dark mt-2">
                  Was möchtest du lernen?
                </h3>
                <p className="text-dark/50 text-sm mt-1">
                  Oder schreib einfach direkt los 👇
                </p>
              </div>

              {/* Goal type */}
              <div className="flex gap-2 mb-3">
                {goalTypes.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setWidgetGoal(g.id)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                      widgetGoal === g.id
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 text-dark/60 hover:border-primary/50'
                    }`}
                  >
                    <span>{g.emoji}</span>
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>

              {/* Topic */}
              <input
                type="text"
                placeholder={`Zum Thema: z.B. Einmaleins, Brüche...`}
                value={widgetTopic}
                onChange={(e) => setWidgetTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleWidgetSend()}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:border-primary transition-colors mb-3"
              />

              <button
                onClick={handleWidgetSend}
                disabled={!widgetTopic.trim() || loading}
                className="w-full py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Los geht's! 🚀
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const isError = msg.role === 'error'
          const isAssistant = msg.role === 'assistant'
          const step = isAssistant ? parseStep(msg.content) : 0
          const isLastAssistant = isAssistant && i === messages.length - 1

          if (isError) {
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[80%] bg-red-50 text-red-600 border border-red-200 rounded-2xl px-4 py-3 rounded-bl-sm text-sm font-semibold">
                  Fehler: {msg.content}
                </div>
              </div>
            )
          }

          return (
            <div key={i} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {isAssistant && step > 0 && (
                <div className="hidden sm:flex items-start pt-2">
                  <StepTimeline currentStep={step} />
                </div>
              )}
              <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
                {isAssistant && <span className="text-lg mr-1">{avatarEmoji}</span>}
                <div className={`inline-block rounded-2xl px-4 py-3 ${
                  isUser
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-white text-dark shadow-sm rounded-bl-sm'
                }`}>
                  {isUser ? (
                    <p className="text-base">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>
                {isAssistant && step > 0 && (
                  <div className="sm:hidden mt-2 flex justify-center">
                    <StepTimeline currentStep={step} />
                  </div>
                )}
                {isLastAssistant && !loading && (
                  <HotKeyButtons onHotkey={sendHotkey} disabled={loading} />
                )}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm rounded-bl-sm">
              <span className="text-lg">{avatarEmoji}</span>
              <span className="text-dark/50 ml-2 animate-pulse">LUMI denkt nach...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Oder direkt losschreiben..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            disabled={loading}
            className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="bg-primary text-white px-5 py-3 rounded-2xl font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  )
}
