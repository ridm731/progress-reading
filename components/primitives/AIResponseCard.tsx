"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

type Status = "idle" | "loading" | "streaming" | "done" | "error" | "empty";

interface AIResponseCardProps {
  status: Status;
  text: string;
  onRetry?: () => void;
}

export function AIResponseCard({ status, text, onRetry }: AIResponseCardProps) {
  if (status === "idle") return null;

  if (status === "empty") {
    return (
      <div className="rounded-lg border border-dashed px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">まだセッションがありません</p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="space-y-2 rounded-lg border bg-[var(--color-ai-surface)] px-4 py-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="flex-1 text-sm text-destructive">生成に失敗しました。</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="h-7 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" />
            再試行
          </Button>
        )}
      </div>
    );
  }

  // streaming or done
  return (
    <div className="rounded-lg border bg-[var(--color-ai-surface)] px-4 py-3">
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      {status === "streaming" && (
        <span className="mt-1 inline-block h-4 w-0.5 animate-pulse bg-foreground/50" />
      )}
    </div>
  );
}
