'use client'

import { useEffect, useState } from 'react'
import { createState } from '@/lib/solver/simulate'
import { BoardView } from './board'
import { CANVA } from './data'
import { Beam } from './sections/beam'
import { Cost } from './sections/cost'
import { Exact } from './sections/exact'
import { Genetic } from './sections/genetic'
import { Compare } from './sections/compare'
import { Overview } from './sections/overview'
import { Push } from './sections/push'
import { Try } from './sections/try'
import { Terrain } from './sections/terrain'
import { Stage, StageProvider } from './stage'

const NAV = [['overview', 'Overview'], ['terrain', 'Terrain'], ['cost', 'Cost'], ['exact', 'Exact'], ['beam', 'Beam'], ['genetic', 'Genetic'], ['push', 'Push genes'], ['compare', 'Compare'], ['try', 'Try it']]

// /solver without parameters: how the solvers work, followed on one example grid kept next to the text
export default function LearnPage() {
  const [stage] = useState(() => new Stage(createState(CANVA)))
  // An anchor in the link (/solver#beam) leads to its section once the page is there
  useEffect(() => { const id = window.location.hash.slice(1); if (id) document.getElementById(id)?.scrollIntoView() }, [])
  // The grid goes back to the section being read: the last one whose top has passed the middle of the screen, or the last one at the bottom of the page
  useEffect(() => {
    let active = '', frame = 0
    const update = () => {
      frame = 0
      const sections = [...document.querySelectorAll<HTMLElement>('[data-section]')]
      if (!sections.length) return
      const bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      let current = sections[0]
      for (const el of sections) if (el.getBoundingClientRect().top <= window.innerHeight * 0.5) current = el
      if (bottom) current = sections[sections.length - 1]
      if (current.dataset.section !== active) { active = current.dataset.section!; stage.activate(active) }
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame) }
  }, [stage])
  return (
    <StageProvider value={stage}>
      <div className="relative left-1/2 grid w-[min(1080px,calc(100vw-2rem))] -translate-x-1/2 grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
        <BoardView />
        <div className="flex min-w-0 flex-col gap-3.5 lg:col-start-1 lg:row-start-1">
          <header className="flex flex-col gap-2.5 rounded-lg bg-background p-4">
            <h1 className="text-3xl font-extrabold tracking-tight">How the solver works</h1>
            <p className="max-w-prose text-lg text-muted-foreground">Four ways to search the shortest list of moves for a grid, followed step by step on one example grid.</p>
            <nav aria-label="Sections" className="flex gap-1.5 overflow-x-auto pb-1">
              {NAV.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full border bg-background px-3 py-1.5 text-sm font-bold hover:border-foreground">{label}</a>)}
            </nav>
          </header>
          <Overview />
          <Terrain />
          <Cost />
          <Exact />
          <Beam />
          <Genetic />
          <Push />
          <Compare />
          <Try />
        </div>
      </div>
    </StageProvider>
  )
}
