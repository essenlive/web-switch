import type { Frame } from '@/lib/replay'

// Tiles left on the grid after each move. The dot follows the replay, the dashed line is where the game ends.
export function ReplayChart({ frames, index, onSeek }: { frames: Frame[], index: number, onSeek: (i: number) => void }) {
    const W = 300, H = 80, PAD = 6
    const max = Math.max(...frames.map(f => f.area))
    const x = (i: number) => PAD + (frames.length < 2 ? 0 : (i / (frames.length - 1)) * (W - 2 * PAD))
    const y = (area: number) => PAD + (1 - area / max) * (H - 2 * PAD)
    const points = frames.map((f, i) => `${x(i)},${y(f.area)}`).join(' ')
    const seek = (e: React.MouseEvent<SVGSVGElement>) => {
        const box = e.currentTarget.getBoundingClientRect()
        const ratio = (e.clientX - box.left) / box.width
        onSeek(Math.min(frames.length - 1, Math.max(0, Math.round(ratio * (frames.length - 1)))))
    }
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20 cursor-pointer text-foreground" role="img" aria-label={`Tiles left over ${frames.length - 1} moves, ${frames[index].area} now`} onClick={seek}>
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.35" />
            <polyline points={frames.slice(0, index + 1).map((f, i) => `${x(i)},${y(f.area)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <line x1={x(index)} x2={x(index)} y1={PAD} y2={H - PAD} stroke="currentColor" strokeDasharray="3 3" opacity="0.3" />
            <circle cx={x(index)} cy={y(frames[index].area)} r="4" fill="currentColor" />
        </svg>
    )
}
