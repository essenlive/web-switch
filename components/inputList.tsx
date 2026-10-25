import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { type Direction } from "@/lib/switchMachine";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

const DIRECTION_ARROWS = new Map(Object.entries({
    'up': "⬆️",
    'right': "➡️",
    'down': "⬇️",
    'left': '⬅️',
}))

const transition = {
    duration: 0.2,
    ease: [0.16, 1, 0.3, 1] as const,
}

export function InputList({
    inputIndex,
    inputList,
    className,
}:{
    inputIndex? : number;
    inputList : Direction[];
    className? : string
}) {
    useEffect( () => {
        // If `scrollToRef` points to an element, then scroll it into view.
        if( scrollToRef.current ) {
            scrollToRef.current.scrollIntoView();
        }
    }, [inputIndex]);    

    const scrollToRef = useRef<HTMLDivElement>(null);

    return (
       <>
        { inputList.length === 0 ? (
            <div className='min-h-6 my-4 font-semibold text-sm'>
                No inputs logged yet. Use swipes or arrows to move.
            </div>
        ) : (
            <ScrollArea className="w-full whitespace-nowrap rounded-md ">
                <div className={cn("flex space-x-2 items-center min-h-6 my-4 ", className)}>
                    <AnimatePresence>
                        {inputList.map((input, i) => (

                            <motion.div
                                ref={i === inputIndex ? scrollToRef : null}
                                key={`input-${i}`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={transition}
                                className={cn(
                                    i === inputIndex && "bg-background ring-foreground ring-1 ring-inset",
                                    "aspect-square w-6 h-6 rounded-sm flex justify-center items-center align-middle text-center"
                                )}
                            >
                                {DIRECTION_ARROWS.get(input)}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
        ) }

       </> 
    )
}
