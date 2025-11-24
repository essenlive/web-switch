import { addPadding } from '@/lib/matrixHelpers';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "motion/react";
import { useMemo } from 'react';
import { useTheme } from "next-themes";
import { getTheme } from "@/lib/themes";

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
    const { theme } = useTheme();

    const blockColors = useMemo(() => {
        const currentTheme = getTheme(theme || 'dark');
        return currentTheme?.blockColors || [
            { bg: "hsl(0 0% 18%)", text: "hsl(0 0% 70%)" },
            { bg: "hsl(0 90% 65%)", text: "hsl(0 0% 100%)" },
            { bg: "hsl(217 100% 70%)", text: "hsl(0 0% 100%)" },
            { bg: "hsl(142 80% 50%)", text: "hsl(0 0% 10%)" },
            { bg: "hsl(45 100% 60%)", text: "hsl(0 0% 10%)" },
        ];
    }, [theme]);

    const indexes = useMemo(() => {
        return {
            rows: ['bot', ...canvaIndexes.rows, 'top'],
            columns: ['left', ...canvaIndexes.columns, 'right']
        };
    }, [canva, canvaIndexes]);

    return (
        <div className={cn("flex-grow flex items-center justify-center flex-col-reverse  gap-2", className)} {...props}>

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
                                style={{
                                    backgroundColor: cursor.y === y && cursor.x === x ? blockColors[cursor.value].bg : blockColors[cell].bg,
                                    color: cursor.y === y && cursor.x === x ? blockColors[cursor.value].text : blockColors[cell].text
                                }}
                                className={cn(
                                    `column-${indexes.columns[x]}`,
                                    "cursor-pointer aspect-square w-6 h-6 rounded-sm flex justify-center items-center align-middle text-center font-semibold text-xs"
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
