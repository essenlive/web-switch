"use client"

import * as React from "react"
import { Check, Palette } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "motion/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { THEMES } from "@/lib/themes"

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const current = mounted ? theme : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          type="button"
          aria-label="Choose theme"
          title="Theme"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex justify-center items-center p-3 aspect-square shrink-0 cursor-pointer bg-background text-foreground rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Palette size={24} />
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {THEMES.map(({ id, name }) => (
          <DropdownMenuItem key={id} onClick={() => setTheme(id)} className="cursor-pointer justify-between">
            {name}
            {current === id && <Check aria-label="current" size={16} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
