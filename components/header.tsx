'use client'

import { cn } from "@/lib/utils"
import { Info, ArrowUpDown, Users, Trophy } from "lucide-react";
import Link from "next/link";
import { HelpScreen } from "@/components/helpScreen";
import React, { useState } from "react";
import { motion } from "motion/react"
import { ModeToggle } from "@/components/mode-toggle";

export function Header({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"header">) {
    
    const [showHelp, setShowHelp] = useState(false)

    return (
        <>
            <header className={cn("flex space-x-4 w-full", className)} {...props}>
                <Link href="/" className="grow">
                    <motion.div whileHover={{ scale: 1.05 }} className="grow flex  items-center p-3 font-bold bg-background rounded-lg">
    
                    <ArrowUpDown  className="text-foreground" />
                    <h1 className="ml-4 text-2xl uppercase text-foreground">
                        Switch
                    </h1>
                    </motion.div>
                </Link>
                <Link href="/leaderboard" aria-label="Leaderboard">
                    <motion.div whileHover={{ scale: 1.1 }} className="flex justify-center items-center p-3 aspect-square bg-background rounded-lg">
                        <Trophy className="text-foreground" size={24} />
                    </motion.div>
                </Link>
                <Link href="/community" aria-label="Community">
                    <motion.div whileHover={{ scale: 1.1 }} className="flex justify-center items-center p-3 aspect-square bg-background rounded-lg">
                        <Users className="text-foreground" size={24} />
                    </motion.div>
                </Link>
                <motion.div 
                whileHover={{ scale: 1.1 }} 
                onClick={() => setShowHelp(true) } 
                className="flex justify-center items-center p-3 aspect-square cursor-pointer bg-background rounded-lg">
                    <Info className="text-foreground" size={24} />
                </motion.div>
                <ModeToggle />
            </header>
            <HelpScreen visible={showHelp} closeHelp={() => setShowHelp(false)} />
        </> 
    )
}
