import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppShell } from "@/components/layout/AppShell"
import { useZapEvents } from "@/lib/hooks"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
})

/**
 * Inner component that uses hooks requiring QueryClientProvider
 */
function AppContent() {
  // Establish WebSocket connection for real-time events
  useZapEvents()

  return <AppShell />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
