import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// numeric カラムは "20.00" のような固定小数の文字列で返るため、余分な末尾の0を落とす
export function trimProgress(value: string | null): string | null {
  if (value == null) return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? value : String(n);
}
