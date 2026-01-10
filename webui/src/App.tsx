import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          ZAP Web UI
        </h1>
        <p className="text-muted-foreground text-lg">
          A modern web interface for ZAP
        </p>
        <div className="flex gap-4 justify-center">
          <Button>Get Started</Button>
          <Button variant="outline">Documentation</Button>
        </div>
      </div>
    </div>
  )
}

export default App
