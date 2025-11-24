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
  blockColors: Array<{
    bg: string;
    text?: string;
  }>;
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
    blockColors: [
      { bg: "hsl(0 0% 88%)", text: "hsl(0 0% 20%)" },
      { bg: "hsl(0 85% 55%)", text: "hsl(0 0% 100%)" },
      { bg: "hsl(217 91% 60%)", text: "hsl(0 0% 100%)" },
      { bg: "hsl(142 76% 40%)", text: "hsl(0 0% 100%)" },
      { bg: "hsl(45 100% 50%)", text: "hsl(0 0% 20%)" },
    ],
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
    blockColors: [
      { bg: "hsl(0 0% 18%)", text: "hsl(0 0% 70%)" },
      { bg: "hsl(0 90% 65%)", text: "hsl(0 0% 100%)" },
      { bg: "hsl(217 100% 70%)", text: "hsl(0 0% 100%)" },
      { bg: "hsl(142 80% 50%)", text: "hsl(0 0% 10%)" },
      { bg: "hsl(45 100% 60%)", text: "hsl(0 0% 10%)" },
    ],
  },
  ittoqqortoormiit: {
    name: "Ittoqqortoormiit",
    background: "rgb(214 217 220)",
    foreground: "rgb(3 70 105)",
    primary: "rgb(229 202 100)",
    secondary: "200 30% 15%",
    card: "rgb(214 217 220)",
    muted: "210 6% 75%",
    accent: "187 85% 53%",
    destructive: "0 84.2% 60.2%",
    border: "210 6% 70%",
    input: "210 6% 70%",
    ring: "41 54% 65%",
    blockColors: [
      { bg: "rgb(214 217 220)", text: "rgb(60 70 80)" },
      { bg: "rgb(3 70 105)", text: "rgb(255 255 255)" },
      { bg: "rgb(229 202 100)", text: "rgb(30 30 30)" },
      { bg: "rgb(22 153 57)", text: "rgb(255 255 255)" },
      { bg: "rgb(224 70 18)", text: "rgb(255 255 255)" },
    ],
  },
  lecap: {
    name: "Le Cap",
    background: "0 0% 100%",
    foreground: "0 0% 3.9%",
    primary: "rgb(229 202 100)",
    secondary: "200 30% 15%",
    card: "rgb(214 217 220)",
    muted: "210 6% 75%",
    accent: "187 85% 53%",
    destructive: "0 84.2% 60.2%",
    border: "210 6% 70%",
    input: "210 6% 70%",
    ring: "41 54% 65%",
    blockColors: [
      { bg: "rgb(156 198 80)", text: "rgb(255 255 255)" },
      { bg: "rgb(230 121 171)", text: "rgb(60 70 80)" },
      { bg: "rgb(51 188 220)", text: "rgb(30 30 30)" },
      { bg: "rgb(22 153 57)", text: "rgb(255 255 255)" },
      { bg: "rgb(236 181 63)", text: "rgb(255 255 255)" },
    ],
  },
  copenhague: {
    name: "Copenhague",
    background: "0 0% 100%",
    foreground: "0 0% 3.9%",
    primary: "rgb(229 202 100)",
    secondary: "200 30% 15%",
    card: "rgb(214 217 220)",
    muted: "210 6% 75%",
    accent: "187 85% 53%",
    destructive: "0 84.2% 60.2%",
    border: "210 6% 70%",
    input: "210 6% 70%",
    ring: "41 54% 65%",
    blockColors: [
      { bg: "rgb(168 207239)", text: "rgb(255 255 255)" },
      { bg: "rgb(236 125 128)", text: "rgb(60 70 80)" },
      { bg: "rgb(89 149 152)", text: "rgb(30 30 30)" },
      { bg: "rgb(245 215 148)", text: "rgb(255 255 255)" },
      { bg: "rgb(43 103 162)", text: "rgb(255 255 255)" },
    ],
  },
};

export const getThemeNames = () => Object.keys(themes);

export const getTheme = (name: string): Theme | undefined => themes[name];
