export const ICON_SIZE = 38;
export const ICON_GAP = 12;
export const PILL_PAD = 14;
export const PILL_PAD_Y = 10;
export const PILL_BORDER = 2;
export const PILL_HEIGHT = ICON_SIZE + PILL_PAD_Y * 2 + PILL_BORDER;
export const DOCK_MARGIN = 35;
export const DOCK_SIDE = 20;

export function pillWidth(count: number): number {
  if (count === 0) return 0;
  return PILL_PAD * 2 + PILL_BORDER + count * ICON_SIZE + (count - 1) * ICON_GAP;
}
