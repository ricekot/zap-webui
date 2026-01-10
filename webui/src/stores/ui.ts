import { create } from "zustand"
import { persist } from "zustand/middleware"

// Activity bar items for the sidebar
export type SidebarActivity = "sites" | null
export type BottomPanelActivity = "output" | null

interface UIState {
  // Activity bar state
  activeSidebarItem: SidebarActivity
  activeBottomItem: BottomPanelActivity
  setActiveSidebarItem: (item: SidebarActivity) => void
  setActiveBottomItem: (item: BottomPanelActivity) => void

  // Panel visibility (derived from activity items, but kept for compatibility)
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
    (set, get) => ({
      // Activity bar state
      activeSidebarItem: "sites" as SidebarActivity,
      activeBottomItem: "output" as BottomPanelActivity,
      setActiveSidebarItem: (item) => set({ activeSidebarItem: item }),
      setActiveBottomItem: (item) => set({ activeBottomItem: item }),

      // Panel visibility - derived from activity items
      get leftSidebarOpen() {
        return get().activeSidebarItem !== null
      },
      get bottomPanelOpen() {
        return get().activeBottomItem !== null
      },
      rightSidebarOpen: false,

      // Panel toggles - now toggle via activity items
      toggleLeftSidebar: () =>
        set((state) => ({
          activeSidebarItem: state.activeSidebarItem !== null ? null : "sites",
        })),
      toggleBottomPanel: () =>
        set((state) => ({
          activeBottomItem: state.activeBottomItem !== null ? null : "output",
        })),
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
        activeSidebarItem: state.activeSidebarItem,
        activeBottomItem: state.activeBottomItem,
        rightSidebarOpen: state.rightSidebarOpen,
        theme: state.theme,
      }),
    }
  )
)
