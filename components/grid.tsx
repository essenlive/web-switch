import { addPadding } from '@/lib/matrixHelpers';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "motion/react";
import { useMemo } from 'react';
import type { Direction } from '@/lib/switchMachine';
import { Circle, Square, Triangle, Diamond } from 'lucide-react';

// Colors come from the active theme's tile tokens (globals.css)
const BLOCK_COLORS = [
    'bg-tile-0',
    'bg-tile-1',
    'bg-tile-2',
    'bg-tile-3',
    'bg-tile-4',
];
// One shape per color so tiles never rely on hue alone. Index = tile value.
const BLOCK_SHAPES = [null, Circle, Square, Triangle, Diamond];
const BLOCK_NAMES = ['empty', 'circle', 'square', 'triangle', 'diamond'];
const BLOCK_INK = ['', 'text-tile-ink-1', 'text-tile-ink-2', 'text-tile-ink-3', 'text-tile-ink-4'];
const EASE = [0.16, 1, 0.3, 1] as const; // exponential ease-out
const DIR = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] } as const;
type Slide = { x: number, y: number, delay: number }

export function Grid({
    canva,
    canvaIndexes,
    cursor,
    lastMove = null,
    moveId = 0,
    className,
    ...props
}: {
    canva: number[][], canvaIndexes: { rows: number[], columns: number[] }, cursor: { x: number, y: number, value: number },
    lastMove?: Direction | null, moveId?: number, className?: string
} & Record<string, unknown>) {
    

    const indexes = useMemo(() => {
        return {
            rows: ['bot', ...canvaIndexes.rows, 'top'],
            columns: ['left', ...canvaIndexes.columns, 'right']
        };
    }, [canva, canvaIndexes]);

    const isCursor = (x: number, y: number) => cursor.y === y && cursor.x === x
    const padded = addPadding(canva, 0)
    const cols = padded[0]?.length ?? 1
    // Tiles shrink to fit the column; 2.5rem max, 8px gaps, 4rem = page + tray padding
    const tile = `min(2.5rem, calc((min(100vw, 36rem) - 4rem) / ${cols} - 0.5rem))`

    // A move that pushes the cursor tile into an inner row/column slides that whole line one step the way
    // the player swiped. Cursor-only moves (along the border ring) slide nothing.
    const h = canva.length, w = canva[0]?.length ?? 0
    const line = lastMove && moveId > 0
        ? (lastMove === 'left' || lastMove === 'right'
            ? (cursor.y >= 1 && cursor.y <= h ? { axis: 'row', at: cursor.y } : null)
            : (cursor.x >= 1 && cursor.x <= w ? { axis: 'col', at: cursor.x } : null))
        : null
    const slideFor = (x: number, y: number): Slide | null => {
        if (!line || !lastMove) return null
        const onLine = line.axis === 'row' ? y === line.at && x >= 1 && x <= w : x === line.at && y >= 1 && y <= h
        if (!onLine) return null
        const [dx, dy] = DIR[lastMove]
        return { x: -dx * 60, y: -dy * 60, delay: 0 }
    }

    return (
        <div role="img" aria-label={`Grid of ${h} rows by ${w} columns`} className={cn("grow relative flex items-center justify-center flex-col-reverse  gap-2", className)} {...props}>

            <AnimatePresence mode="popLayout">
                 {padded.map((row, y) => (
                     <motion.div 
                         key={`row-${indexes.rows[y]}`} 
                         layout="position"
                         className={`row-${indexes.rows[y]} relative flex gap-2`}
                         initial={{ opacity: 0 }}
                         animate={{  opacity: 1 }}
                         exit={{ opacity: 0, transition: { duration: 0.15 } }}
                         transition={{ duration: 0.15, ease: EASE }}
                     >
                    <AnimatePresence mode="popLayout">
                        {row.map((cell, x) => (
                            <Tile
                                key={`column-${indexes.columns[x]}`}
                                name={`column-${indexes.columns[x]}`}
                                size={tile}
                                value={isCursor(x, y) ? cursor.value : cell}
                                isCursor={isCursor(x, y)}
                                slide={slideFor(x, y)}
                                moveId={moveId}
                                mountDelay={Math.min((x + y) * 0.025, 0.35)}
                            />
                        ))}
                        </AnimatePresence>
                    </motion.div>
                ))}
                </AnimatePresence>
        </div>
    )
}


function Tile({ name, size, value, isCursor, slide, moveId, mountDelay }: {
    name: string, size: string, value: number, isCursor: boolean, slide: Slide | null, moveId: number, mountDelay: number
}) {
    const Shape = BLOCK_SHAPES[value]
    return (
        <motion.div
            layout="position"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.25, ease: EASE, delay: mountDelay } }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
            style={{ width: size }}
            title={BLOCK_NAMES[value]}
            className={cn(name, "relative aspect-square")}
        >
            {/* the ring moves with the cursor at once: any glide reads as input lag */}
            {isCursor && <span className="pointer-events-none absolute -inset-1 z-10 rounded-md ring-2 ring-foreground" />}
            {/* remounts on a slide: the tile arrives from where it came */}
            <motion.div
                key={slide ? `slide-${moveId}` : 'still'}
                initial={slide ? { x: `${slide.x}%`, y: `${slide.y}%` } : false}
                animate={{ x: 0, y: 0 }}
                transition={{ duration: 0.12, ease: EASE }}
                className={cn("size-full rounded-sm flex justify-center items-center", BLOCK_COLORS[value], BLOCK_INK[value])}
            >
                {Shape && <Shape aria-hidden className="size-1/2" fill="currentColor" strokeWidth={2.5} />}
            </motion.div>
        </motion.div>
    )
}
