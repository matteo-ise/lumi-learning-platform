import React from 'react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Wir ignorieren alles und lassen jeden User einfach durch
  return <>{children}</>
}
