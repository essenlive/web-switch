"use client"

import * as React from "react"
import { Palette } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "motion/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getThemeNames, themes } from "@/lib/themes"

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const themeNames = getThemeNames()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="flex justify-center items-center aspect-square cursor-pointer bg-background rounded-lg p-2"
        >
          <Palette className="h-[1.2rem] w-[1.2rem] text-foreground" />
          <span className="sr-only">Choose theme</span>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Choose Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeNames.map((themeName) => (
          <DropdownMenuItem
            key={themeName}
            onClick={() => setTheme(themeName)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span>{themes[themeName].name}</span>
              {theme === themeName && (
                <motion.div
                  layoutId="active-theme"
                  className="w-2 h-2 rounded-full bg-primary"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
