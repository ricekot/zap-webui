import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  // Theme preference
  theme: "light" | "dark" | "system"
  setTheme: (theme: "light" | "dark" | "system") => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "zap-ui-storage",
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
)
