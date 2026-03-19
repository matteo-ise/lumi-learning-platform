import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Markdown from 'react-markdown'
import { apiFetch } from '../services/api'
import { HotKeyButtons } from '../components/HotKeyButtons'
import { StepTimeline } from '../components/StepTimeline'

interface Message {
  role: 'user' | 'assistant' | 'error'
  content: string
  image_base64?: string
}

const avatarEmojis: Record<string, string> = {
  fox: '🦊', owl: '🦉', panda: '🐼', dolphin: '🐬',
  cat: '🐱', turtle: '🐢', penguin: '🐧', rabbit: '🐰',
}

function parseStep(content: string): number {
  const match = content.match(/\[SCHRITT\s+(\d)\/3\]/)
  return match ? parseInt(match[1], 10) : 0
}

export function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const courseId = Number(id)
  const [messages, setMessages] = useState<Message[]>([])
  const [mode, setMode] = useState<'chat' | 'exam'>('chat')
  const [examState, setExamState] = useState<'idle' | 'running' | 'finished'>('idle')
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [score, setScore] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [avatar, setAvatar] = useState('fox')

  const [mode, setMode] = useState<'chat' | 'exam'>('chat')
  const [examState, setExamState] = useState<'idle' | 'running' | 'finished'>('idle')
  const [answers, setAnswers] = useState<string[]>(['', '', '', ''])
  const [score, setScore] = useState<number | null>(null)
  const examQuestions = [
  { frage: "5 + 3 = ?", lösung: "8" },
  { frage: "12 - 7 = ?", lösung: "5" },
  { frage: "4 + 6 = ?", lösung: "10" },
  { frage: "9 - 2 = ?", lösung: "7" }
]
  
  // Sprint 5: State for image, recording, and TTS
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!courseId || isNaN(courseId)) return
    // Load existing messages
    apiFetch<Message[]>(`/api/courses/${courseId}/messages`)
      .then(setMessages)
      .catch(console.error)
    // Load avatar from greeting
    apiFetch<{ avatar: string }>('/api/greeting')
      .then((g) => setAvatar(g.avatar))
      .catch(() => {})
  }, [courseId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices()
      }
    }
  }, [])

  const avatarEmoji = avatarEmojis[avatar] || '🦊'

  /** Sprint 5: Handle Image Selection */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  /** Sprint 5: Speech to Text (STT) */
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Spracherkennung wird von diesem Browser nicht unterstützt.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'de-DE'
    recognition.onstart = () => setIsRecording(true)
    recognition.onend = () => setIsRecording(false)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
    }
    recognition.start()
  }

  /** Sprint 5: Text to Speech (TTS) */
  const speak = (text: string, index: number) => {
    if (speakingMessageIndex === index) {
      window.speechSynthesis.cancel()
      setSpeakingMessageIndex(null)
      return
    }

    window.speechSynthesis.cancel()
    
    let cleanText = text.replace(/\[SCHRITT\s+\d\/\d\]/g, '')
    try {
      cleanText = cleanText.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, '')
    } catch (e) {
      cleanText = cleanText.replace(/[\u{1F600}-\u{1F9FF}]/gu, '')
    }
    cleanText = cleanText.replace(/[*#_~-]/g, '').replace(/\\/g, '')
    
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'de-DE'
    utterance.pitch = 1.1

    const voices = window.speechSynthesis.getVoices()
    const deVoices = voices.filter(v => v.lang.startsWith('de'))
    const preferredVoice = deVoices.find(v => v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Online')) || deVoices[0]
    
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onend = () => setSpeakingMessageIndex(null)
    utterance.onerror = () => setSpeakingMessageIndex(null)

    window.speechSynthesis.speak(utterance)
    setSpeakingMessageIndex(index)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() && !imagePreview) return
    setLoading(true)

    const userMsg: Message = { 
      role: 'user', 
      content: imagePreview ? `📸 [Bild] ${text}` : text.trim(),
      image_base64: imagePreview || undefined
    }
    setMessages((prev) => [...prev, userMsg])
    const currentInput = text.trim()
    const currentImage = imagePreview
    setInput('')
    setImagePreview(null)

    try {
      const res = await apiFetch<{ response: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          course_id: courseId, 
          message: currentInput || "Schau dir dieses Bild an.",
          image_base64: currentImage
        }),
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.response }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'error', content: e instanceof Error ? e.message : 'Fehler beim Senden. Bitte versuche es erneut.' }])
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const sendHotkey = async (type: string) => {
    if (loading || !courseId || isNaN(courseId)) return
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
        MORE_EXAMPLE: '🔄 Noch ein Beispiel',
        NEW_TOPIC: '🚀 Anderes Thema',
      }
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: labels[type] || type },
        { role: 'assistant', content: res.response },
      ])
    } catch (e) {
      console.error(e)
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: e instanceof Error ? e.message : 'Hotkey fehlgeschlagen. Bitte erneut versuchen.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')
  const currentStep = lastAssistantMsg ? parseStep(lastAssistantMsg.content) : 0
  const hasMessages = messages.length > 0
  
  // Detect if device is an iPad (touch capable Mac)
  const isIPad = typeof navigator !== 'undefined' && 
    (/iPad/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

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
        <div className="flex items-center gap-2 border-l-2 border-gray-200 pl-3 ml-1">
          <span className="text-2xl">{avatarEmoji}</span>
          <span className="font-extrabold text-primary hidden sm:inline">LUMI</span>
        </div>
        <span className="flex-1 text-center font-extrabold text-dark text-lg">Chat</span>
        <div className="w-32" /> {/* Spacer to center the title */}
      </header>

      {/* Main layout with sidebar timeline */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Timeline Sidebar */}
        {hasMessages && (
          <div className="hidden sm:flex flex-col items-center w-28 pt-8 bg-gray-50 border-r border-gray-200 shrink-0">
            <StepTimeline currentStep={currentStep > 0 ? currentStep : 1} />
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {!hasMessages && !loading && (
            <div className="text-center text-dark/40 pt-16">
              <div className="text-5xl mb-3">{avatarEmoji}</div>
              <p className="text-lg font-semibold">Schreib mir deine erste Frage!</p>
              <p className="text-sm mt-1">Ich helfe dir Schritt für Schritt.</p>
  
            <button
              onClick={() => {
                setMode('exam')
                setExamState('running')
              }}
              className="mt-6 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary/90"
            >
      📝 Probeklausur starten
    </button>
  </div>
)}

          {/* Mobile Timeline (Top) */}
          {hasMessages && currentStep > 0 && (
            <div className="sm:hidden flex justify-center mb-6 bg-white p-3 rounded-2xl shadow-sm">
              <StepTimeline currentStep={currentStep} />
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            const isError = msg.role === 'error'
            const isAssistant = msg.role === 'assistant'
            const step = isAssistant ? parseStep(msg.content) : 0
            const isLastAssistant = isAssistant && i === messages.length - 1
            const isSpeaking = speakingMessageIndex === i

            const cleanMarkdown = msg.content.replace(/\[SCHRITT\s+\d\/\d\]/g, '')
      
            if (mode === 'exam') {
              return (
                <div className="flex flex-col h-screen bg-gray p-6">
                  <h1 className="text-xl font-bold mb-4">📝 Probeklausur</h1>
            
                  {examState === 'running' && (
                    <>
                      {examQuestions.map((q, i) => (
                        <div key={i} className="mb-4">
                          <p className="font-semibold">{i + 1}. {q.frage}</p>
                          <input
                            value={answers[i]}
                            onChange={(e) => {
                              const newAnswers = [...answers]
                              newAnswers[i] = e.target.value
                              setAnswers(newAnswers)
                            }}
                            className="border p-2 rounded mt-1 w-full"
                          />
                        </div>
                      ))}
            
                      <button
                        onClick={() => {
                          let points = 0
                          examQuestions.forEach((q, i) => {
                            if (answers[i] === q.lösung) points++
                          })
                          setScore(points)
                          setExamState('finished')
                        }}
                        className="bg-primary text-white px-4 py-2 rounded mt-4"
                      >
                        ✅ Abgeben
                      </button>
                    </>
                  )}
            
                  {examState === 'finished' && (
                    <div>
                      <h2 className="text-lg font-bold mb-2">Ergebnis</h2>
                      <p>{score} / {examQuestions.length} richtig</p>
            
                      <button
                        onClick={() => {
                          setAnswers(['', '', '', ''])
                          setScore(null)
                          setExamState('running')
                        }}
                        className="mt-4 bg-mint text-white px-4 py-2 rounded"
                      >
                        🔄 Neue Klausur
                      </button>
            
                      <button
                        onClick={() => {
                          setMode('chat')
                          setExamState('idle')
                        }}
                        className="mt-2 block text-sm text-gray-500 underline"
                      >
                        Zurück zum Chat
                      </button>
                    </div>
                  )}
                </div>
              )
}
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
                <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {isAssistant && <span className="text-lg">{avatarEmoji}</span>}
                    {isAssistant && (
                      <button 
                        onClick={() => speak(msg.content, i)}
                        className={`transition-colors text-2xl p-1 ${isSpeaking ? 'text-primary animate-pulse' : 'text-dark/30 hover:text-primary'}`}
                        title={isSpeaking ? "Vorlesen stoppen" : "Vorlesen"}
                      >
                        {isSpeaking ? '⏹️' : '🔊'}
                      </button>
                    )}
                  </div>
                  <div className={`inline-block rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-white text-dark shadow-sm rounded-bl-sm border border-gray-100'
                  }`}>
                    {isUser ? (
                      <div>
                        {msg.image_base64 && (
                          <img src={msg.image_base64} alt="Upload" className="max-w-[200px] w-full rounded-xl mb-2 shadow-sm border-2 border-white/20" />
                        )}
                        <p className="text-base whitespace-pre-wrap">{msg.content.replace('📸 [Bild] ', '')}</p>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-dark">
                        <Markdown>{cleanMarkdown}</Markdown>
                      </div>
                    )}
                  </div>
                  {isLastAssistant && !loading && (
                    <HotKeyButtons 
                      onHotkey={sendHotkey} 
                      disabled={loading} 
                      currentStep={step || 1}
                      mode={mode}
                      examState={examState}
                    />
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
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto">
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative inline-block mb-3">
              <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-xl border-2 border-primary" />
              <button 
                onClick={() => setImagePreview(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="bg-gray-100 text-2xl p-3 rounded-2xl hover:bg-gray-200 transition-colors disabled:opacity-50 h-[52px]"
              title="Bild hochladen"
            >
              📸
            </button>
            
            <div className="flex-1 relative">
              {isIPad ? (
                <textarea
                  ref={inputRef as any}
                  placeholder={isRecording ? "Höre zu..." : "Schreibe hier mit dem Apple Pencil..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
                  disabled={loading}
                  rows={2}
                  className={`w-full border-2 rounded-2xl px-4 text-base focus:outline-none focus:border-primary transition-colors disabled:opacity-50 resize-none ${
                    isRecording ? 'border-red-400 bg-red-50' : 'border-gray-200 ipad-input'
                  }`}
                />
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={isRecording ? "Höre zu..." : "Schreib oder sprich..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                  disabled={loading}
                  className={`w-full border-2 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors disabled:opacity-50 h-[52px] ${
                    isRecording ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
              )}
              {isIPad && (
                <span className="absolute right-3 bottom-3 text-gray-400 text-xl pointer-events-none opacity-50">
                  ✏️
                </span>
              )}
            </div>

            <button
              onClick={startRecording}
              disabled={loading}
              className={`text-2xl p-3 rounded-full transition-all flex items-center justify-center h-[52px] w-[52px] ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse-red shadow-lg' 
                  : 'bg-gray-100 text-dark/60 hover:bg-gray-200'
              }`}
              title="Spracheingabe"
            >
              {isRecording ? '⏹️' : '🎤'}
            </button>

            <button
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && !imagePreview) || loading}
              className="bg-primary text-white px-5 py-3 rounded-2xl font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all h-[52px]"
            >
              Senden
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
