import { addPadding } from '@/lib/matrixHelpers';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "motion/react";
import { useMemo } from 'react';

const BLOCK_COLORS = [
    'bg-gray-100 dark:bg-gray-900',
    'bg-red-500 dark:bg-red-600',
    'bg-blue-500 dark:bg-blue-600',
    'bg-green-500 dark:bg-green-600',
    'bg-yellow-500 dark:bg-yellow-600',
];
const BLOCK_VALUES = [
    '',
    '❤️',
    '🔷',
    '🟩',
    '🟡',
];
const showValues = false;
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

    return (
        <div className={cn("grow flex items-center justify-center flex-col-reverse  gap-2", className)} {...props}>

            <AnimatePresence>
                 {addPadding(canva, 0).map((row, y) => (
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
                            

                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                key={`column-${indexes.columns[x]}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={transition}

                                className={cn(
                                    `column-${indexes.columns[x]}`,
                                    "cursor-pointer aspect-square w-6 h-6 rounded-sm flex justify-center items-center align-middle text-center",
                                    BLOCK_COLORS[cell],
                                    cursor.y === y && cursor.x === x && BLOCK_COLORS[cursor.value]
                                )}
                            >
                                {showValues && (cursor.y === y && cursor.x === x) ? BLOCK_VALUES[cursor.value] : showValues && BLOCK_VALUES[cell]}
                            </motion.div>
                        ))}
                        </AnimatePresence>
                    </motion.div>
                ))}
                </AnimatePresence>
        </div>
    )
}
