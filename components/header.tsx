'use client'

import { cn } from "@/lib/utils"
import { Info, Users, Medal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpScreen } from "@/components/helpScreen";
import React, { useState } from "react";
import { motion, MotionConfig } from "motion/react"
import { ThemePicker } from "@/components/theme-picker";

const tray = "flex justify-center items-center p-3 aspect-square shrink-0 rounded-lg"
const ring = "rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function Header({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"header">) {

    const [showHelp, setShowHelp] = useState(false)
    const pathname = usePathname()

    const navLink = (href: string, label: string, Icon: typeof Users) => {
        const active = pathname === href
        return (
            <Link href={href} aria-label={label} title={label} aria-current={active ? "page" : undefined} className={cn("shrink-0", ring)}>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className={cn(tray, active ? "bg-primary text-primary-foreground" : "bg-background text-foreground")}>
                    <Icon size={24} />
                </motion.div>
            </Link>
        )
    }

    return (
        <MotionConfig reducedMotion="user">
            <header className={cn("flex gap-2 w-full", className)} {...props}>
                <Link href="/" aria-label="switch, home" className={cn("grow min-w-0", ring)}>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center h-full min-h-12 px-3 sm:px-4 font-bold bg-background rounded-lg">
                        <span className="text-xl sm:text-2xl text-foreground truncate">switch</span>
                    </motion.div>
                </Link>
                <nav aria-label="Main" className="contents">
                    {navLink("/leaderboard", "Leaderboard", Medal)}
                    {navLink("/community", "Community", Users)}
                </nav>
                <motion.button
                    type="button"
                    aria-label="About, rules and controls"
                    title="Rules and about"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowHelp(true)}
                    className={cn(tray, "cursor-pointer bg-background text-foreground", ring)}>
                    <Info size={24} />
                </motion.button>
                <ThemePicker />
            </header>
            <HelpScreen visible={showHelp} closeHelp={() => setShowHelp(false)} />
        </MotionConfig>
    )
}
