"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BookWithSessions, SessionWithQuotes } from "@/lib/types";
import { Plus, Sparkles } from "lucide-react";

interface PaneSessionsProps {
  book:              BookWithSessions | null;
  sessions:          SessionWithQuotes[];
  selectedSessionId: string | null;
  onSelectSession:   (id: string) => void;
  onNewSession:      () => void;
  onRequestAI?:      () => void;
}

function formatProgress(session: SessionWithQuotes): string {
  const { progressType, progressFrom, progressTo } = session;
  if (!progressFrom && !progressTo) return "";
  if (progressType === "page") {
    return `p.${progressFrom}〜${progressTo}`;
  }
  if (progressType === "percent") {
    return `${progressFrom}〜${progressTo}%`;
  }
  if (progressType === "location") {
    return `loc.${progressFrom}〜${progressTo}`;
  }
  return session.progressNote ?? "";
}

export function PaneSessions({
  book,
  sessions,
  selectedSessionId,
  onSelectSession,
  onNewSession,
  onRequestAI,
}: PaneSessionsProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  if (!book) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">← 本を選んでください</p>
      </div>
    );
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
  );
  const lastSession = sorted[1]; // 2番目が「前回」

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 truncate text-sm font-semibold">
            <span className="shrink-0">📘</span>{book.title}
          </h2>
          <p className="text-xs text-muted-foreground">{book.author}</p>
        </div>
        <button
          onClick={onNewSession}
          className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-accent"
          title="セッションを追加"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* 前回のまとめ */}
      {lastSession && (
        <div className="border-b bg-muted/40 px-4 py-3">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              前回（{format(new Date(lastSession.sessionDate), "M/d", { locale: ja })}）のまとめ
            </span>
          </div>
          <button
            className="w-full text-left"
            onClick={() => setSummaryExpanded((v) => !v)}
          >
            <p className={cn("text-xs text-foreground/80", !summaryExpanded && "line-clamp-2")}>
              {lastSession.impression}
            </p>
            <span className="mt-0.5 text-xs text-muted-foreground underline-offset-2 hover:underline">
              {summaryExpanded ? "閉じる" : "続きを見る"}
            </span>
          </button>
          {onRequestAI && (
            <Button variant="outline" size="sm" className="mt-2 h-6 text-xs" onClick={onRequestAI}>
              AIにおさらいを作ってもらう
            </Button>
          )}
        </div>
      )}

      {/* セッション一覧 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          セッション一覧
        </p>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-center text-sm text-muted-foreground">まだセッションがありません</p>
            <Button size="sm" onClick={onNewSession}>
              <Plus className="mr-1.5 h-4 w-4" />
              今日のセッションを追加
            </Button>
          </div>
        ) : (
          sorted.map((session) => {
            const progress = formatProgress(session);
            return (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
                  selectedSessionId === session.id && "bg-accent",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {format(new Date(session.sessionDate), "M/d（EEE）", { locale: ja })}
                  </span>
                  {progress && (
                    <span className="shrink-0 text-xs text-muted-foreground">{progress}</span>
                  )}
                </div>
                {session.impression && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {session.impression}
                  </p>
                )}
              </button>
            );
          })
        )}
      </div>

      {sorted.length > 0 && (
        <div className="border-t px-4 py-3">
          <Button size="sm" className="w-full" onClick={onNewSession}>
            <Plus className="mr-1.5 h-4 w-4" />
            今日のセッションを追加
          </Button>
        </div>
      )}
    </div>
  );
}
