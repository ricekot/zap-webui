import { describe, it, expect, beforeEach } from "vitest"
import { useTabStateStore } from "./tabState"

describe("useTabStateStore", () => {
  beforeEach(() => {
    // Clear all state before each test
    useTabStateStore.getState().clearAll()
  })

  describe("getState", () => {
    it("returns undefined for uninitialized key", () => {
      const result = useTabStateStore.getState().getState("nonexistent")
      expect(result).toBeUndefined()
    })

    it("returns stored value for initialized key", () => {
      useTabStateStore.getState().setState("myKey", { value: 42 })
      const result = useTabStateStore.getState().getState<{ value: number }>("myKey")
      expect(result).toEqual({ value: 42 })
    })
  })

  describe("setState", () => {
    it("stores value by key", () => {
      useTabStateStore.getState().setState("key1", "value1")
      expect(useTabStateStore.getState().states["key1"]).toBe("value1")
    })

    it("overwrites existing value", () => {
      useTabStateStore.getState().setState("key1", "initial")
      useTabStateStore.getState().setState("key1", "updated")
      expect(useTabStateStore.getState().states["key1"]).toBe("updated")
    })

    it("stores complex objects", () => {
      const complexValue = {
        array: [1, 2, 3],
        nested: { deep: true },
        string: "test",
      }
      useTabStateStore.getState().setState("complex", complexValue)
      expect(useTabStateStore.getState().getState("complex")).toEqual(complexValue)
    })

    it("isolates state between different keys", () => {
      useTabStateStore.getState().setState("key1", "value1")
      useTabStateStore.getState().setState("key2", "value2")

      expect(useTabStateStore.getState().getState("key1")).toBe("value1")
      expect(useTabStateStore.getState().getState("key2")).toBe("value2")
    })
  })

  describe("clearState", () => {
    it("removes state for a specific key", () => {
      useTabStateStore.getState().setState("key1", "value1")
      useTabStateStore.getState().setState("key2", "value2")

      useTabStateStore.getState().clearState("key1")

      expect(useTabStateStore.getState().getState("key1")).toBeUndefined()
      expect(useTabStateStore.getState().getState("key2")).toBe("value2")
    })

    it("does not throw for nonexistent key", () => {
      expect(() => {
        useTabStateStore.getState().clearState("nonexistent")
      }).not.toThrow()
    })
  })

  describe("clearAll", () => {
    it("removes all stored state", () => {
      useTabStateStore.getState().setState("key1", "value1")
      useTabStateStore.getState().setState("key2", "value2")
      useTabStateStore.getState().setState("key3", "value3")

      useTabStateStore.getState().clearAll()

      expect(useTabStateStore.getState().states).toEqual({})
    })
  })

  describe("subscription", () => {
    it("notifies subscribers on state change", () => {
      let notified = false
      const unsubscribe = useTabStateStore.subscribe(() => {
        notified = true
      })

      useTabStateStore.getState().setState("key", "value")

      expect(notified).toBe(true)
      unsubscribe()
    })
  })
})
