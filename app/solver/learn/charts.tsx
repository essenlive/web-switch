import type { ReactNode } from 'react'

// A line over a shared scale, the point `mark` emphasised. Colors come from the theme (currentColor, muted axis).
export function LineChart({ points, xmax, ymin, ymax, label, mark, height = 70 }: { points: [number, number][]; xmax: number; ymin: number; ymax: number; label: string; mark?: number | null; height?: number }) {
  const w = 300, px = (x: number) => 6 + (xmax ? x / xmax : 0) * (w - 12), py = (y: number) => 6 + (1 - (ymax === ymin ? 0 : (y - ymin) / (ymax - ymin))) * (height - 12)
  const m = mark != null ? points.find(p => p[0] === mark) : points.at(-1)
  return (
    <svg viewBox={`0 0 ${w} ${height}`} role="img" aria-label={label} className="block h-auto w-full overflow-visible text-foreground">
      <line x1={6} x2={w - 6} y1={height - 6} y2={height - 6} className="stroke-border" />
      {points.length > 0 && <polyline points={points.map(p => `${px(p[0])},${py(p[1])}`).join(' ')} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />}
      {m && <circle cx={px(m[0])} cy={py(m[1])} r={4.5} fill="currentColor" />}
    </svg>
  )
}

export function ChartBox({ title, value, children }: { title: string; value: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between gap-2 text-xs text-muted-foreground"><span>{title}</span><span>{value}</span></div>
      {children}
    </div>
  )
}
