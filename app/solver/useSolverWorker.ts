'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { SolverMessage, SolverStart } from '@/lib/solver/worker'

// One worker per page. Starting a run cancels the one in progress, and only the messages of the latest run get through.
export function useSolverWorker() {
  const worker = useRef<Worker | null>(null)
  const current = useRef(0)

  const stop = useCallback(() => {
    current.current++
    worker.current?.postMessage({ type: 'stop' })
  }, [])

  const start = useCallback((job: SolverStart, onMessage: (message: SolverMessage) => void) => {
    worker.current ??= new Worker(new URL('../../lib/solver/worker.ts', import.meta.url))
    const id = ++current.current
    worker.current.onmessage = (e: MessageEvent<SolverMessage>) => { if (e.data.id === id) onMessage(e.data) }
    worker.current.postMessage({ type: 'start', id, ...job })
  }, [])

  useEffect(() => () => { worker.current?.terminate(); worker.current = null }, [])

  return { start, stop }
}
