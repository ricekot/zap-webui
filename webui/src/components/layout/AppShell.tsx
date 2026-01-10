import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUIStore } from "@/stores/ui"
import { SitesTreePanel } from "@/components/panels/sites-tree/SitesTreePanel"
import { OutputPanel } from "@/components/panels/output/OutputPanel"
import { RequesterPanel } from "@/components/panels/requester/RequesterPanel"
import { RequestViewerPanel } from "@/components/panels/request-viewer/RequestViewerPanel"
import { ActivityBar } from "./ActivityBar"
import { cn } from "@/lib/utils"

export function AppShell() {
  const {
    activeSidebarItem,
    activeBottomItem,
    activeTab,
    setActiveTab,
  } = useUIStore()

  const leftSidebarOpen = activeSidebarItem !== null
  const bottomPanelOpen = activeBottomItem !== null

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      {/* Activity Bar - Always visible */}
      <ActivityBar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-10 border-b flex items-center px-2 gap-1 shrink-0">
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">ZAP Web UI</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup
            orientation="horizontal"
            id="main-layout"
            defaultLayout={
              leftSidebarOpen ? { "left-sidebar": 20, "main-content": 80 } : { "main-content": 100 }
            }
          >
            {/* Left Sidebar - Sites Tree */}
            {leftSidebarOpen && (
              <>
                <ResizablePanel id="left-sidebar" defaultSize="20%" minSize="200px" maxSize="40%">
                  {activeSidebarItem === "sites" && <SitesTreePanel />}
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Center and Bottom Panels */}
            <ResizablePanel
              id="main-content"
              defaultSize={leftSidebarOpen ? "80%" : "100%"}
              minSize="40%"
            >
              <ResizablePanelGroup
                orientation="vertical"
                id="center-layout"
                defaultLayout={
                  bottomPanelOpen
                    ? { "center-panel": 70, "bottom-panel": 30 }
                    : { "center-panel": 100 }
                }
              >
                {/* Center Panel - Tabs */}
                <ResizablePanel
                  id="center-panel"
                  defaultSize={bottomPanelOpen ? "70%" : "100%"}
                  minSize="30%"
                >
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as "requester" | "request-viewer")}
                    className="h-full flex flex-col"
                  >
                    <div className="border-b px-2 shrink-0">
                      <TabsList className="h-9 bg-transparent p-0 gap-1">
                        <TabsTrigger
                          value="requester"
                          className={cn(
                            "rounded-none border-b-2 border-transparent px-3 py-1.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                          )}
                        >
                          Requester
                        </TabsTrigger>
                        <TabsTrigger
                          value="request-viewer"
                          className={cn(
                            "rounded-none border-b-2 border-transparent px-3 py-1.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                          )}
                        >
                          Request/Response
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="requester" className="flex-1 m-0 overflow-hidden">
                      <RequesterPanel />
                    </TabsContent>
                    <TabsContent value="request-viewer" className="flex-1 m-0 overflow-hidden">
                      <RequestViewerPanel />
                    </TabsContent>
                  </Tabs>
                </ResizablePanel>

                {/* Bottom Panel - Output */}
                {bottomPanelOpen && (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel id="bottom-panel" defaultSize="30%" minSize="100px" maxSize="60%">
                      {activeBottomItem === "output" && <OutputPanel />}
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  )
}
