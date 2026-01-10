import { create } from "zustand"
import { useEffect, useCallback, useSyncExternalStore } from "react"

/**
 * Generic store for persisting tab/component state across unmounts.
 * This allows components to store and retrieve their state when switching tabs.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const [data, setData] = useTabState('my-component-key', defaultState)
 *   // Works like useState but persists across unmounts
 *   // Also reacts to external updates to the same key
 * }
 * ```
 */

interface TabStateStore {
  // Store state by key
  states: Record<string, unknown>

  // Store initial states by key (computed once)
  initialStates: Record<string, unknown>

  // Get state for a key
  getState: <T>(key: string) => T | undefined

  // Get initial state for a key
  getInitialState: <T>(key: string) => T | undefined

  // Set state for a key
  setState: <T>(key: string, state: T) => void

  // Set initial state for a key (only if not already set)
  setInitialState: <T>(key: string, state: T) => void

  // Clear state for a key
  clearState: (key: string) => void

  // Clear all states
  clearAll: () => void
}

export const useTabStateStore = create<TabStateStore>()((set, get) => ({
  states: {},
  initialStates: {},

  getState: <T>(key: string): T | undefined => {
    return get().states[key] as T | undefined
  },

  getInitialState: <T>(key: string): T | undefined => {
    return get().initialStates[key] as T | undefined
  },

  setState: <T>(key: string, state: T) => {
    set((prev) => ({
      states: { ...prev.states, [key]: state },
    }))
  },

  setInitialState: <T>(key: string, state: T) => {
    // Only set if not already present
    if (get().initialStates[key] === undefined) {
      set((prev) => ({
        initialStates: { ...prev.initialStates, [key]: state },
      }))
    }
  },

  clearState: (key: string) => {
    set((prev) => {
      const { [key]: _removed, ...rest } = prev.states
      void _removed // Intentionally unused - destructuring to exclude key
      return { states: rest }
    })
  },

  clearAll: () => {
    set({ states: {}, initialStates: {} })
  },
}))

/**
 * Helper hook that works like useState but persists state across component unmounts.
 * Useful for preserving form data, scroll positions, etc. when switching tabs.
 * Also reacts to external updates to the same key from other components.
 *
 * @param key Unique key to identify this state
 * @param initialState Default state if no persisted state exists
 * @returns [state, setState] tuple like useState
 */
export function useTabState<T>(
  key: string,
  initialState: T | (() => T)
): [T, (value: T | ((prev: T) => T)) => void] {
  // Compute initial value once and store it in the store
  // This happens synchronously on first render
  const computedInitial = initialState instanceof Function ? initialState() : initialState
  useTabStateStore.getState().setInitialState(key, computedInitial)

  // Subscribe to store changes for this specific key
  const storeState = useSyncExternalStore(
    useTabStateStore.subscribe,
    () => useTabStateStore.getState().states[key] as T | undefined,
    () => useTabStateStore.getState().states[key] as T | undefined
  )

  // Get the stored initial value (stable across renders)
  const storedInitial = useTabStateStore.getState().initialStates[key] as T

  const state = storeState !== undefined ? storeState : storedInitial

  // Set initial state in store if not present
  useEffect(() => {
    const current = useTabStateStore.getState().states[key]
    if (current === undefined) {
      const initial = useTabStateStore.getState().initialStates[key] as T
      useTabStateStore.getState().setState(key, initial)
    }
  }, [key])

  // Wrapper that updates store state
  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      const current = useTabStateStore.getState().states[key] as T | undefined
      const initial = useTabStateStore.getState().initialStates[key] as T
      const prevValue = current !== undefined ? current : initial
      const next = value instanceof Function ? value(prevValue) : value
      useTabStateStore.getState().setState(key, next)
    },
    [key]
  )

  return [state, setState]
}
