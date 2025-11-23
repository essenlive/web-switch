'use client'

import { cn } from "@/lib/utils"
import { Info, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { HelpScreen } from "@/components/helpScreen";
import React, { useState } from "react";
import { motion } from "motion/react"
import { ThemePicker } from "@/components/theme-picker";

export function Header({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"header">) {
    
    const [showHelp, setShowHelp] = useState(false)

    return (
        <>
            <header className={cn("flex space-x-4 w-full", className)} {...props}>
                <Link href="/" className="flex-grow">
                    <motion.div whileHover={{ scale: 1.05 }} className="flex-grow flex  items-center p-3 font-bold bg-background rounded-lg">
    
                    <ArrowUpDown  className="text-foreground" />
                    <h1 className="ml-4 text-2xl uppercase text-foreground">
                        Switch
                    </h1>
                    </motion.div>
                </Link>
                <motion.div
                whileHover={{ scale: 1.1 }}
                onClick={() => setShowHelp(true) }
                className="flex justify-center items-center p-3 aspect-square cursor-pointer bg-background rounded-lg">
                    <Info className="text-foreground" size={24} />
                </motion.div>
                <ThemePicker />
            </header>
            <HelpScreen visible={showHelp} closeHelp={() => setShowHelp(false)} />
        </> 
    )
}
