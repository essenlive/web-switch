"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { getTheme } from "@/lib/themes"
import { normalizeColor } from "@/lib/colorUtils"

function ThemeStyleInjector() {
  const { theme } = useTheme()

  React.useEffect(() => {
    if (!theme) return

    const currentTheme = getTheme(theme)
    if (!currentTheme) return

    // Apply CSS variables to the document root
    const root = document.documentElement

    // Map of theme properties to CSS variable names
    const cssVarMap: Record<string, string> = {
      background: '--background',
      foreground: '--foreground',
      primary: '--primary',
      secondary: '--secondary',
      card: '--card',
      muted: '--muted',
      accent: '--accent',
      destructive: '--destructive',
      border: '--border',
      input: '--input',
      ring: '--ring',
    }

    // Apply each theme property as a CSS variable
    Object.entries(cssVarMap).forEach(([key, cssVar]) => {
      const value = currentTheme[key as keyof typeof currentTheme]
      if (typeof value === 'string') {
        root.style.setProperty(cssVar, normalizeColor(value))
      }
    })
  }, [theme])

  return null
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeStyleInjector />
      {children}
    </NextThemesProvider>
  )
}
