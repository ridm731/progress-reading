import { cn } from "@/lib/utils";
import type { BookStatus } from "@/lib/types";

const config: Record<BookStatus, { label: string; className: string }> = {
  reading:      { label: "読書中", className: "bg-[oklch(0.37_0.06_258)] text-white" },
  done:         { label: "読了",   className: "bg-[oklch(0.45_0.12_145)] text-white" },
  want_to_read: { label: "積読",   className: "bg-[#d97706] text-white" },
};

export function StatusBadge({ status, className }: { status: BookStatus; className?: string }) {
  const { label, className: statusClass } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        statusClass,
        className,
      )}
    >
      {label}
    </span>
  );
}
