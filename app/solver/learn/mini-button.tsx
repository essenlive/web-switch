import { cn } from '@/lib/utils'
import type { SimState } from '@/lib/solver/simulate'
import { MiniBoard } from './tile'

// A position as a small card you can click to see it on the grid
export function MiniButton({ state, top, bottom, pressed, faded, onClick, label }: { state: SimState; top?: string; bottom?: string; pressed?: boolean; faded?: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-pressed={pressed} aria-label={label} onClick={onClick}
      className={cn('flex min-w-0 flex-col items-center gap-0.5 rounded-md border bg-background px-1 py-1.5 text-[0.7rem] leading-tight text-foreground hover:border-foreground', pressed && 'border-2 border-foreground', faded && 'opacity-55')}>
      {top && <span className="font-extrabold">{top}</span>}
      <MiniBoard state={state} className="h-auto w-full max-w-[76px] text-foreground" />
      {bottom && <span className="text-center tabular-nums text-muted-foreground">{bottom}</span>}
    </button>
  )
}
export const MiniGrid = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-[repeat(auto-fill,minmax(86px,1fr))] gap-2">{children}</div>
