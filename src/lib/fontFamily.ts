// Reads the font-family list that next/font exposes through a CSS variable on the root element.
export function readFontFamily(variableName: string): string {
  const family = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  if (!family) throw new Error(`Font variable ${variableName} is not defined`);
  return family;
}
