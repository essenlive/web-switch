'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSectionRefresh, useStage, wait } from './stage'

export interface Step {
  title: string
  body: ReactNode
  extra?: ReactNode            // a tool shown under the text of this step
  from?: () => void            // shows the position the animation starts from
  animate?: () => Promise<void>
  show: () => void             // shows the position at the end of the step
}

// The guided steps of a section. Going forward plays the animation of the step; anywhere else jumps to its end.
// `refresh` is what the grid shows when the section comes back into view (by default: the current step)
export function useStepper(id: string, steps: Step[], refresh?: () => void) {
  const stage = useStage()
  const [index, setIndex] = useState(0)
  const token = useRef(0)
  const latest = useRef({ steps, index })
  useEffect(() => { latest.current = { steps, index } })
  useSectionRefresh(id, refresh ?? (() => latest.current.steps[latest.current.index]?.show()))
  const go = useCallback(async (k: number, forward: boolean) => {
    const list = latest.current.steps
    if (k < 0 || k >= list.length) return
    const t = ++token.current, step = list[k]
    latest.current.index = k
    setIndex(k)
    if (forward && step.animate) {
      await stage.holdWhile(async () => { step.from?.(); await wait(250); await step.animate!(); if (t === token.current) step.show() })
    } else step.show()
  }, [stage])
  return { index, go }
}

export function Stepper({ steps, index, go, label }: { steps: Step[]; index: number; go: (k: number, forward: boolean) => void; label: string }) {
  const step = steps[index], last = steps.length - 1
  return (
    <section aria-label={label} className="flex flex-col gap-2.5 rounded-lg bg-muted p-3.5">
      <div className="flex items-center gap-2.5 text-xs font-bold text-muted-foreground">
        <span>Step {index + 1} of {steps.length}</span>
        <div className="h-1 grow overflow-hidden rounded-full bg-border"><div className="h-full bg-foreground transition-[width]" style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div>
      </div>
      <div role="group" aria-label="Steps" className="flex flex-wrap gap-1.5">
        {steps.map((s, k) => <button key={s.title} type="button" aria-label={`Step ${k + 1}: ${s.title}`} aria-current={k === index ? 'step' : undefined} onClick={() => go(k, false)}
          className={cn('size-3 rounded-full border border-input', k === index ? 'border-foreground bg-foreground' : 'bg-background')} />)}
      </div>
      <h3 className="text-base font-extrabold">{step.title}</h3>
      <div className="flex flex-col gap-2 [&_p]:max-w-prose">{step.body}</div>
      {step.extra}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={index === 0} onClick={() => go(index - 1, false)}>← Previous</Button>
        <span className="grow" />
        {step.animate && <Button variant="outline" onClick={() => go(index, true)}>Replay</Button>}
        <Button disabled={index === last} onClick={() => go(index + 1, true)}>Next →</Button>
      </div>
    </section>
  )
}
