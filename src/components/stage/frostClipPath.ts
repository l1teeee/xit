export function frostClipPath(
  width: number,
  height: number,
  card: { left: number; top: number; right: number; bottom: number },
  radius: number,
): string {
  const innerLeft = card.left + radius;
  const innerTop = card.top + radius;
  const right = card.right;
  const bottom = card.bottom;
  const innerRight = right - radius;
  const innerBottom = bottom - radius;
  const rounded = (value: number) => Number(value.toFixed(2)).toString();
  const path = [
    `M0 0H${rounded(width)}V${rounded(height)}H0Z`,
    `M${rounded(innerLeft)} ${rounded(card.top)}`,
    `H${rounded(innerRight)}`,
    `A${rounded(radius)} ${rounded(radius)} 0 0 1 ${rounded(right)} ${rounded(innerTop)}`,
    `V${rounded(innerBottom)}`,
    `A${rounded(radius)} ${rounded(radius)} 0 0 1 ${rounded(innerRight)} ${rounded(bottom)}`,
    `H${rounded(innerLeft)}`,
    `A${rounded(radius)} ${rounded(radius)} 0 0 1 ${rounded(card.left)} ${rounded(innerBottom)}`,
    `V${rounded(innerTop)}`,
    `A${rounded(radius)} ${rounded(radius)} 0 0 1 ${rounded(innerLeft)} ${rounded(card.top)}`,
    'Z',
  ].join(' ');

  return `path(evenodd, "${path}")`;
}
