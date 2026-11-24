"use client"

import { useCallback, useMemo, useSyncExternalStore, type Dispatch, type SetStateAction } from "react"

const eventName = "carava-demo-storage-change"
const memorySnapshots = new Map<string, string>()

function matchesSnapshotShape(value: unknown, shape: unknown): boolean {
  if (shape === null) return value === null
  if (Array.isArray(shape)) return Array.isArray(value) && (shape.length === 0 || value.every((item) => matchesSnapshotShape(item, shape[0])))
  if (typeof shape === "object") {
    return value !== null && typeof value === "object" && !Array.isArray(value)
      && Object.entries(shape).every(([key, expected]) => Object.hasOwn(value, key) && matchesSnapshotShape((value as Record<string, unknown>)[key], expected))
  }
  return typeof value === typeof shape
}

function parseSnapshot<T>(snapshot: string, fallback: T): T {
  try {
    const parsed: unknown = JSON.parse(snapshot)
    return (matchesSnapshotShape(parsed, fallback) ? parsed : fallback) as T
  } catch {
    return typeof fallback === "string" ? snapshot as T : fallback
  }
}

/** Read the same snapshot the storage hook uses, including its blocked-storage fallback. */
export function readDemoStorageSnapshot<T>(key: string, fallback: T): T {
  const inMemorySnapshot = memorySnapshots.get(key)
  let stored = inMemorySnapshot
  if (stored === undefined) {
    try { stored = window.localStorage.getItem(key) ?? undefined } catch { /* Keep the in-memory demo snapshot when storage is blocked. */ }
  }
  return parseSnapshot(stored ?? JSON.stringify(fallback), fallback)
}

/** Persist through the same snapshot/event path used by useDemoStorageState setters. */
export function writeDemoStorageSnapshot<T>(key: string, value: T) {
  const serialized = JSON.stringify(value)
  try {
    window.localStorage.setItem(key, serialized)
    memorySnapshots.delete(key)
  } catch {
    memorySnapshots.set(key, serialized)
  }
  window.dispatchEvent(new Event(eventName))
}

function subscribe(key: string, onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null) memorySnapshots.clear()
    else if (event.key === key) memorySnapshots.delete(key)
    if (event.key === null || event.key === key) onStoreChange()
  }
  window.addEventListener("storage", handleStorage)
  window.addEventListener(eventName, onStoreChange)
  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(eventName, onStoreChange)
  }
}

export function useDemoStorageState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const fallback = useMemo(() => JSON.stringify(initialValue), [initialValue])
  const subscribeToKey = useCallback((onStoreChange: () => void) => subscribe(key, onStoreChange), [key])
  const getSnapshot = useCallback(() => {
    const inMemorySnapshot = memorySnapshots.get(key)
    if (inMemorySnapshot !== undefined) return inMemorySnapshot
    try { return window.localStorage.getItem(key) ?? fallback } catch { return fallback }
  }, [fallback, key])
  const getServerSnapshot = useCallback(() => fallback, [fallback])
  const snapshot = useSyncExternalStore(subscribeToKey, getSnapshot, getServerSnapshot)
  const value = useMemo(() => parseSnapshot(snapshot, initialValue), [initialValue, snapshot])
  const setValue = useCallback<Dispatch<SetStateAction<T>>>((nextValue) => {
    const previous = readDemoStorageSnapshot(key, initialValue)
    const next = typeof nextValue === "function" ? (nextValue as (current: T) => T)(previous) : nextValue
    writeDemoStorageSnapshot(key, next)
  }, [initialValue, key])
  return [value, setValue]
}
