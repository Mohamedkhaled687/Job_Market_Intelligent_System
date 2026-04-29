import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export const CATEGORY_COLORS: Record<string, string> = {
  backend: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  frontend: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  fullstack: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  data: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  devops: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  mobile: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  design: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  management: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  qa: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
};

export const SENIORITY_COLORS: Record<string, string> = {
  junior: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  mid: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  senior: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  lead: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};
