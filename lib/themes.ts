export interface Theme {
  name: string;
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  card: string;
  muted: string;
  accent: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
}

export const themes: Record<string, Theme> = {
  light: {
    name: "Light",
    background: "0 0% 100%",
    foreground: "0 0% 3.9%",
    primary: "0 0% 9%",
    secondary: "0 0% 96.1%",
    card: "0 0% 100%",
    muted: "0 0% 96.1%",
    accent: "0 0% 96.1%",
    destructive: "0 84.2% 60.2%",
    border: "0 0% 89.8%",
    input: "0 0% 89.8%",
    ring: "0 0% 3.9%",
  },
  dark: {
    name: "Dark",
    background: "0 0% 3.9%",
    foreground: "0 0% 98%",
    primary: "0 0% 98%",
    secondary: "0 0% 14.9%",
    card: "0 0% 3.9%",
    muted: "0 0% 14.9%",
    accent: "0 0% 14.9%",
    destructive: "0 62.8% 30.6%",
    border: "0 0% 14.9%",
    input: "0 0% 14.9%",
    ring: "0 0% 83.1%",
  },
  ocean: {
    name: "Ocean",
    background: "200 50% 8%",
    foreground: "200 20% 98%",
    primary: "200 90% 60%",
    secondary: "200 30% 15%",
    card: "200 40% 12%",
    muted: "200 20% 20%",
    accent: "180 80% 50%",
    destructive: "0 84.2% 60.2%",
    border: "200 30% 18%",
    input: "200 30% 18%",
    ring: "200 90% 60%",
  },
  forest: {
    name: "Forest",
    background: "140 40% 10%",
    foreground: "140 20% 95%",
    primary: "140 60% 50%",
    secondary: "140 30% 18%",
    card: "140 35% 12%",
    muted: "140 25% 20%",
    accent: "90 60% 55%",
    destructive: "0 84.2% 60.2%",
    border: "140 25% 22%",
    input: "140 25% 22%",
    ring: "140 60% 50%",
  },
  sunset: {
    name: "Sunset",
    background: "15 40% 12%",
    foreground: "30 20% 98%",
    primary: "25 95% 60%",
    secondary: "15 30% 20%",
    card: "15 35% 15%",
    muted: "15 25% 25%",
    accent: "340 80% 60%",
    destructive: "0 84.2% 60.2%",
    border: "15 25% 28%",
    input: "15 25% 28%",
    ring: "25 95% 60%",
  },
  lavender: {
    name: "Lavender",
    background: "270 30% 12%",
    foreground: "270 10% 98%",
    primary: "270 70% 65%",
    secondary: "270 25% 18%",
    card: "270 28% 14%",
    muted: "270 20% 22%",
    accent: "300 65% 70%",
    destructive: "0 84.2% 60.2%",
    border: "270 20% 25%",
    input: "270 20% 25%",
    ring: "270 70% 65%",
  },
  midnight: {
    name: "Midnight",
    background: "240 40% 6%",
    foreground: "240 15% 95%",
    primary: "210 100% 70%",
    secondary: "240 30% 12%",
    card: "240 35% 9%",
    muted: "240 25% 15%",
    accent: "280 80% 65%",
    destructive: "0 84.2% 60.2%",
    border: "240 25% 18%",
    input: "240 25% 18%",
    ring: "210 100% 70%",
  },
};

export const getThemeNames = () => Object.keys(themes);

export const getTheme = (name: string): Theme | undefined => themes[name];
