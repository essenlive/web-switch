'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { benchGrid } from '@/lib/solver/benchGrids'
import { createState } from '@/lib/solver/simulate'
import { CANVA } from './data'
import { useSectionRefresh, useStage } from './stage'

// A block of the page: a title, a sentence, then its guided steps and tools. `data-section` is what the page watches to give the grid back.
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} data-section={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-4 flex-col gap-3.5 rounded-lg bg-background p-4">
      <h2 id={`${id}-title`} className="text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  )
}
// For the sections that show nothing on the grid: it goes back to the start grid while they are read
export function ShowStart({ id }: { id: string }) {
  const stage = useStage()
  useSectionRefresh(id, () => stage.show(createState(CANVA), { chip: 'Start', step: 'grid 4x4:a' }))
  return null
}
export const Lead = ({ children }: { children: ReactNode }) => <p className="max-w-prose">{children}</p>
// A link to the tool, on a benchmark grid, with the engine already chosen
export function TryIt({ engine, grid, label }: { engine: string; grid: string; label: string }) {
  return <p><Link href={`/solver${benchGrid(grid).query}&e=${engine}`} className="font-bold underline underline-offset-4">{label} →</Link></p>
}
export const Panel = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-3">{children}</div>
