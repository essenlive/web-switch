// Theme ids are the class names in app/globals.css; "system" follows the OS between light and dark.
export const THEMES = [
  { id: 'system', name: 'System' },
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'ittoqqortoormiit', name: 'Ittoqqortoormiit' },
  { id: 'lecap', name: 'Le Cap' },
  { id: 'copenhague', name: 'Copenhague' },
  { id: 'faro', name: 'Faro' },
  { id: 'havane', name: 'La Havane' },
  { id: 'darjeeling', name: 'Darjeeling' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export const THEME_IDS: string[] = THEMES.map((t) => t.id)
