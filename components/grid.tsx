import { addPadding } from '@/lib/matrixHelpers';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "motion/react";
import { useMemo } from 'react';
import { Circle, Square, Triangle, Diamond } from 'lucide-react';

const BLOCK_COLORS = [
    'bg-gray-100 dark:bg-gray-900',
    'bg-red-500 dark:bg-red-600',
    'bg-blue-500 dark:bg-blue-600',
    'bg-green-500 dark:bg-green-600',
    'bg-yellow-500 dark:bg-yellow-600',
];
// One shape per color so tiles never rely on hue alone. Index = tile value.
const BLOCK_SHAPES = [null, Circle, Square, Triangle, Diamond];
const BLOCK_NAMES = ['empty', 'red circle', 'blue square', 'green triangle', 'yellow diamond'];
const BLOCK_INK = ['', 'text-white', 'text-white', 'text-white', 'text-gray-900'];
const transition = {
    duration: 0.2,
}

export function Grid({
    canva,
    canvaIndexes,
    cursor,
    className,
    ...props
}) {
    

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

    return (
        <div role="img" aria-label={`Grid of ${canva.length} rows by ${canva[0]?.length ?? 0} columns`} className={cn("grow flex items-center justify-center flex-col-reverse  gap-2", className)} {...props}>

            <AnimatePresence>
                 {padded.map((row, y) => (
                     <motion.div 
                         key={`row-${indexes.rows[y]}`} 
                         className={`row-${indexes.rows[y]} flex gap-2`}
                         initial={{ opacity: 0 }}
                         animate={{  opacity: 1 }}
                         exit={{ opacity: 0 }}
                         transition={transition}
                     >
                    <AnimatePresence>
                        {row.map((cell, x) => (
                            

                            <Tile
                                key={`column-${indexes.columns[x]}`}
                                name={`column-${indexes.columns[x]}`}
                                size={tile}
                                value={isCursor(x, y) ? cursor.value : cell}
                                isCursor={isCursor(x, y)}
                            />
                        ))}
                        </AnimatePresence>
                    </motion.div>
                ))}
                </AnimatePresence>
        </div>
    )
}


function Tile({ name, size, value, isCursor }: { name: string, size: string, value: number, isCursor: boolean }) {
    const Shape = BLOCK_SHAPES[value]
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            style={{ width: size }}
            title={BLOCK_NAMES[value]}
            className={cn(
                name,
                "aspect-square rounded-sm flex justify-center items-center",
                BLOCK_COLORS[value],
                BLOCK_INK[value],
                isCursor && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
            )}
        >
            {Shape && <Shape aria-hidden className="size-1/2" fill="currentColor" strokeWidth={2.5} />}
        </motion.div>
    )
}
