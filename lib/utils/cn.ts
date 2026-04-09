import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely. Resolves conflicts (e.g. `p-4` + `p-2` → `p-2`)
 * and conditionally applies classes via clsx.
 *
 * Usage: cn("base-class", condition && "conditional-class", { "object-class": true })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
