import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { RequestHistoryEntry } from "@/stores/requestHistory"
import { RequestHistorySidebar } from "./RequestHistorySidebar"

function createEntry(id: string, url: string): RequestHistoryEntry {
  return {
    id,
    timestamp: "2026-03-17T00:00:00.000Z",
    method: "GET",
    url,
    headers: [{ name: "Accept", value: "application/json" }],
    body: "",
  }
}

describe("RequestHistorySidebar", () => {
  it("renders entries in supplied reverse-chronological order", () => {
    render(
      <RequestHistorySidebar
        entries={[
          createEntry("newest", "https://example.com/newest"),
          createEntry("older", "https://example.com/older"),
        ]}
        selectedEntryId={null}
        onSelect={() => {}}
      />
    )

    const buttons = screen.getAllByRole("button")
    expect(buttons[0]).toHaveTextContent("https://example.com/newest")
    expect(buttons[1]).toHaveTextContent("https://example.com/older")
  })

  it("shows an explicit empty state", () => {
    render(<RequestHistorySidebar entries={[]} selectedEntryId={null} onSelect={() => {}} />)

    expect(screen.getByText("Send a request to build your history.")).toBeInTheDocument()
  })

  it("calls onSelect when an entry is clicked", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const entry = createEntry("entry-1", "https://example.com/selected")

    render(<RequestHistorySidebar entries={[entry]} selectedEntryId={null} onSelect={onSelect} />)

    await user.click(screen.getByRole("button", { name: /https:\/\/example.com\/selected/i }))

    expect(onSelect).toHaveBeenCalledWith(entry)
  })
})
