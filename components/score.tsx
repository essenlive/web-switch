import { cn } from "@/lib/utils"
import { RotateCcw, Trophy, MoveHorizontal, Dices } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

export function Score({
    className,
    score,
    highscore, 
    restart,
    randomUrl,
    ...props
}) {



    return (
        <div className={cn("flex space-x-4 w-full", className)} {...props}>
            <div className="grow flex  items-center p-3 bg-background rounded-lg">
                <MoveHorizontal />
                <span className="ml-4 text-xl font-bold">
                    {score}
                </span>
            </div>
            { randomUrl && 
                <Link
                className="flex"
                href={randomUrl} >
                    <motion.div className="flex justify-center items-center p-3 aspect-square cursor-pointer bg-background rounded-lg" onClick={restart}>
                        <Dices />
                    </motion.div>
                </Link>
            }
            <motion.div whileHover={{ scale: 1.1 }} className="flex justify-center items-center p-3 aspect-square cursor-pointer bg-background rounded-lg" onClick={restart}>
                <RotateCcw />
            </motion.div>

            <div className="grow flex justify-end items-center p-3 bg-background rounded-lg">
                <span className="mr-4 text-xl font-bold">
                    {highscore === null ? "-" : highscore}
                </span>
                <Trophy />
            </div>
        </div>
    )
}
