interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = "LUMI lädt..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray overflow-hidden">
      <div className="relative">
        {/* Animated Ring */}
        <div className="w-24 h-24 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
        
        {/* Dolphin in the middle */}
        <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
          🐬
        </div>
      </div>
      
      {/* Message */}
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-black text-dark tracking-tight animate-pulse">
          {message}
        </h2>
        <p className="text-dark/30 font-bold mt-1">Gleich geht's weiter!</p>
      </div>

      {/* Decorative stars */}
      <div className="absolute top-1/4 left-1/4 text-2xl opacity-20 animate-pulse">✨</div>
      <div className="absolute bottom-1/4 right-1/4 text-2xl opacity-20 animate-pulse delay-75">🌟</div>
    </div>
  )
}
