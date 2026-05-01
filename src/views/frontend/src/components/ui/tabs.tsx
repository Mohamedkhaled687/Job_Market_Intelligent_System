/**
 * Tabs Component
 * Accessible tab interface component
 */

import { ReactNode, useState } from "react";
import { motion } from "framer-motion";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children }: TabsProps) {
  return (
    <div data-tabs-value={value} onChange={(e) => {}} className="w-full">
      {children}
    </div>
  );
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-1 ${className || ""}`}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
  return (
    <button
      role="tab"
      aria-selected={false}
      aria-controls={`tabpanel-${value}`}
      data-state="inactive"
      data-tab-value={value}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-[hsl(var(--background))] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[hsl(var(--background))] data-[state=active]:text-[hsl(var(--foreground))] data-[state=active]:shadow-sm"
      onClick={() => {
        // This will be handled by parent Tabs component
      }}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  return (
    <div
      role="tabpanel"
      aria-labelledby={`trigger-${value}`}
      data-state="active"
      data-tab-value={value}
      tabIndex={0}
      className={`mt-2 ring-offset-[hsl(var(--background))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 ${className || ""}`}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        {children}
      </motion.div>
    </div>
  );
}

export default {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
};
