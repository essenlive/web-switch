"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "motion/react"

const NEXT = { light: "dark", dark: "system", system: "light" } as const
const ICONS = { light: Sun, dark: Moon, system: Monitor }

// One tap cycles light -> dark -> system
export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const current = (mounted && theme && theme in NEXT ? theme : "system") as keyof typeof NEXT
  const Icon = ICONS[current]

  return (
    <motion.button
      type="button"
      aria-label={`Theme: ${current}. Switch to ${NEXT[current]}`}
      title={`Theme: ${current}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(NEXT[current])}
      className="flex justify-center items-center p-3 aspect-square shrink-0 cursor-pointer bg-background text-foreground rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Icon size={24} />
    </motion.button>
  )
}
