'use client'

import { MotionConfig } from 'motion/react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pause, Play, RotateCcw, StepBack, StepForward } from 'lucide-react'
import { Grid } from '@/components/grid'
import { InputList } from '@/components/inputList'
import { ReplayChart } from '@/components/replayChart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildFrames, parseReplayInput, replayLink } from '@/lib/replay'

const SPEEDS = [0.5, 1, 2, 4]
const STEP_MS = 700 // one move per step at 1x

function ReplayPage() {
  const router = useRouter()
  const params = useSearchParams()
  const query = params.toString() ? `?${params.toString()}` : ''

  const { request, error: inputError } = useMemo(
    () => query ? parseReplayInput(query) : { request: null, error: null },
    [query])
  const { frames, error: playError } = useMemo(
    () => request ? buildFrames(request) : { frames: [], error: null },
    [request])

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const last = frames.length - 1

  // A new replay starts over, paused
  useEffect(() => { setIndex(0); setPlaying(false) }, [frames])

  // Constant pace, the speed only changes the delay between two moves
  useEffect(() => {
    if (!playing) return
    if (index >= last) { setPlaying(false); return }
    const id = setTimeout(() => setIndex(i => i + 1), STEP_MS / speed)
    return () => clearTimeout(id)
  }, [playing, index, last, speed])

  const step = (delta: number) => { setPlaying(false); setIndex(i => Math.min(last, Math.max(0, i + delta))) }
  const togglePlay = () => { if (index >= last) setIndex(0); setPlaying(p => !p) }

  useEffect(() => {
    if (!frames.length) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, button')) return
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
      else if (e.key === ' ') { e.preventDefault(); togglePlay() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const [link, setLink] = useState('')
  const [moves, setMoves] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const load = (e: React.FormEvent) => {
    e.preventDefault()
    const { request: r, error } = parseReplayInput(link, moves)
    setFormError(error)
    if (r) router.push(replayLink(r))
  }

  const frame = frames[index]
  const moveList = useMemo(() => request?.moves ?? [], [request])
  const stats = frame && [
    ['move', `${index} / ${last}`],
    ['tiles left', frame.area],
    ['cleared', frames[0].area - frame.area],
    ['lowest', Math.min(...frames.slice(0, index + 1).map(f => f.area))],
  ]

  return (
    <MotionConfig reducedMotion="user">
    <main className="grow flex flex-col items-stretch justify-stretch h-full w-full space-y-2">
      <form onSubmit={load} className="flex flex-col gap-2 p-4 bg-background rounded-lg">
        <h2 className="text-sm font-bold text-muted-foreground">Replay a game</h2>
        <Label htmlFor="replay-link">Game link</Label>
        <Input id="replay-link" value={link} onChange={e => setLink(e.target.value)} placeholder="https://switch.essenlive.xyz/g?s=…&cs=6x8" />
        <Label htmlFor="replay-moves">Moves <span className="text-muted-foreground">(optional if the link has them)</span></Label>
        <Input id="replay-moves" value={moves} onChange={e => setMoves(e.target.value)} placeholder="urdlurdl or ⬆️ ➡️ ⬇️ ⬅️" />
        <Button type="submit" className="self-start">Load replay</Button>
        {(formError || inputError) && <p role="alert" className="text-sm text-destructive">{formError ?? inputError}</p>}
      </form>

      {frame && (
        <>
          <div className="grow flex flex-col p-4 bg-background rounded-lg">
            <h2 className="text-sm font-bold text-muted-foreground">
              Replay of grid {new URLSearchParams(request!.query).get('cs')}
              {frame.status !== 'playing' && ` · ${frame.status === 'won' ? 'solved' : 'outgrown'}`}
            </h2>
            <Grid className="" canva={frame.canva} canvaIndexes={frame.canvaIndexes} cursor={frame.cursor} lastMove={frame.move} moveId={index} />
          </div>

          {playError && <p role="alert" className="p-3 text-sm bg-background rounded-lg text-destructive">{playError} The replay stops at move {last}.</p>}

          <div className="grid grid-cols-4 gap-2">
            {stats!.map(([label, value]) => (
              <div key={label} className="flex flex-col leading-none p-3 bg-background rounded-lg">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xl font-bold">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 p-4 bg-background rounded-lg">
            <ReplayChart frames={frames} index={index} onSeek={i => { setPlaying(false); setIndex(i) }} />
            <input type="range" aria-label="Move" min={0} max={last} value={index} onChange={e => { setPlaying(false); setIndex(Number(e.target.value)) }} className="w-full cursor-pointer accent-foreground" />
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="icon" aria-label="Back to start" onClick={() => { setPlaying(false); setIndex(0) }}><RotateCcw /></Button>
              <Button variant="secondary" size="icon" aria-label="Previous move" disabled={index === 0} onClick={() => step(-1)}><StepBack /></Button>
              <Button className="grow" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>{playing ? <Pause /> : <Play />}{playing ? 'Pause' : 'Play'}</Button>
              <Button variant="secondary" size="icon" aria-label="Next move" disabled={index >= last} onClick={() => step(1)}><StepForward /></Button>
            </div>
            <div className="flex gap-2" role="group" aria-label="Speed">
              {SPEEDS.map(s => (
                <Button key={s} variant={s === speed ? 'default' : 'secondary'} className="grow" aria-pressed={s === speed} onClick={() => setSpeed(s)}>{s}x</Button>
              ))}
            </div>
          </div>

          <div className="bg-background rounded-lg px-4">
            <InputList inputList={moveList.slice(0, last)} inputIndex={index - 1} />
          </div>
        </>
      )}
    </main>
    </MotionConfig>
  )
}

export default function Page() {
  return <Suspense><ReplayPage /></Suspense>
}
