import { cn } from "@/lib/utils"
import { RotateCcw, Trophy, MoveHorizontal, Dices } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function Score({
    className,
    score,
    highscore, 
    restart,
    randomUrl,
    growIn = null as number | null,
    ...props
}) {
    return (
        <div className={cn("flex space-x-4 w-full", className)} {...props}>
            <div className="grow flex items-center p-3 bg-background rounded-lg">
                <MoveHorizontal aria-hidden />
                <span className="ml-4 flex flex-col leading-none">
                    <span className="text-xs text-muted-foreground">moves</span>
                    <motion.span key={score} initial={score ? { y: 6, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }} className="text-xl font-bold" aria-hidden>{score}</motion.span>
                </span>
                <span role="status" className="sr-only">{score} moves</span>
                {growIn !== null && (
                    <span className="ml-4 flex flex-col leading-none">
                        <span className="text-xs text-muted-foreground">grows in</span>
                        <span className="text-xl font-bold">{growIn}s</span>
                    </span>
                )}
            </div>
            { randomUrl && 
                <Link href={randomUrl} aria-label="New random grid" className={cn("flex rounded-lg", ring)}>
                    <motion.div whileHover={{ scale: 1.1 }} className="flex justify-center items-center p-3 aspect-square bg-background rounded-lg">
                        <Dices />
                    </motion.div>
                </Link>
            }
            <motion.button type="button" aria-label="Restart grid" whileHover={{ scale: 1.1 }} className={cn("flex justify-center items-center p-3 aspect-square cursor-pointer bg-background rounded-lg", ring)} onClick={restart}>
                <RotateCcw />
            </motion.button>

            <div className="grow flex justify-end items-center p-3 bg-background rounded-lg">
                <span className="mr-4 flex flex-col items-end leading-none">
                    <span className="text-xs text-muted-foreground">best</span>
                    <span className="text-xl font-bold">{highscore === null ? "-" : highscore}</span>
                </span>
                <Trophy aria-hidden />
            </div>
        </div>
    )
}
