import type { DockPosition } from "@/stores/IconsDrag";

export const defaultLayout: Record<DockPosition, string[]> = {
  "top-left": ["home", "alarm-clock", "count-clock", "tasks"],
  "top-right": ["theme", "palette", "time-format", "sound"],
  "bottom-left": ["loading", "language", "update"],
  "bottom-right": ["visibility"],
  top: [],
  bottom: [],
};
