/**
 * Converts RGB values to HSL format
 * @param rgb - RGB string like "rgb(214 217 220)" or "214 217 220"
 * @returns HSL string like "210 6% 85%"
 */
export function rgbToHsl(rgb: string): string {
  // Extract numbers from rgb string
  const match = rgb.match(/(\d+)\s+(\d+)\s+(\d+)/);
  if (!match) return rgb; // Return original if not RGB format

  const r = parseInt(match[1]) / 255;
  const g = parseInt(match[2]) / 255;
  const b = parseInt(match[3]) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Normalizes a color value to HSL format
 * Accepts HSL, RGB, or already formatted values
 */
export function normalizeColor(color: string): string {
  // If it's already in HSL format (e.g., "200 50% 8%"), return as is
  if (/^\d+\s+\d+%\s+\d+%$/.test(color.trim())) {
    return color;
  }

  // If it's an rgb() format, convert to HSL
  if (color.includes('rgb')) {
    return rgbToHsl(color);
  }

  // If it looks like "214 217 220" (space-separated numbers), assume RGB
  if (/^\d+\s+\d+\s+\d+$/.test(color.trim())) {
    return rgbToHsl(color);
  }

  // Return original if we can't determine the format
  return color;
}
