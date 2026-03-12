import { clsx, type ClassValue } from "clsx";

/** Merge Tailwind class names safely. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Pick a random item from an array. */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Derive initials from a full name. */
export function initials(fullName: string): string {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

/** Format a track ID into a display label. */
export function trackLabel(track: string): string {
  const map: Record<string, string> = {
    hr: "HR",
    warehouse: "Warehouse",
    administrative: "Administrative",
  };
  return map[track] ?? track;
}

/** Pluralise a word. */
export function plural(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
