import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  // Panel visibility
  leftSidebarOpen: boolean
  bottomPanelOpen: boolean
  rightSidebarOpen: boolean

  // Panel toggles
  toggleLeftSidebar: () => void
  toggleBottomPanel: () => void
  toggleRightSidebar: () => void

  // Active center tab
  activeTab: "requester" | "request-viewer"
  setActiveTab: (tab: "requester" | "request-viewer") => void

  // Output panel active filter
  outputFilter: "all" | "spider" | "scanner"
  setOutputFilter: (filter: "all" | "spider" | "scanner") => void

  // Selected site tree node (for request viewer)
  selectedMessageId: string | null
  setSelectedMessageId: (id: string | null) => void

  // Theme state (for future use)
  theme: "light" | "dark" | "system"
  setTheme: (theme: "light" | "dark" | "system") => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Panel visibility - default states
      leftSidebarOpen: true,
      bottomPanelOpen: true,
      rightSidebarOpen: false,

      // Panel toggles
      toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
      toggleBottomPanel: () => set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),
      toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),

      // Active center tab - default to requester
      activeTab: "requester",
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Output filter - default to all
      outputFilter: "all",
      setOutputFilter: (filter) => set({ outputFilter: filter }),

      // Selected message - none by default
      selectedMessageId: null,
      setSelectedMessageId: (id) => set({ selectedMessageId: id }),

      // Theme
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "zap-ui-storage",
      partialize: (state) => ({
        leftSidebarOpen: state.leftSidebarOpen,
        bottomPanelOpen: state.bottomPanelOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        theme: state.theme,
      }),
    }
  )
)
