"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AIResponseCard } from "@/components/primitives/AIResponseCard";
import type { BookWithSessions, SessionWithQuotes, AIMode } from "@/lib/types";
import { Sparkles, BookOpen, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackStatus = "idle" | "loading" | "done" | "error" | "empty";

interface PaneAiFeedbackProps {
  book:        BookWithSessions | null;
  session:     SessionWithQuotes | null;
  allSessions: SessionWithQuotes[];
}

const modeConfig: Record<AIMode, { label: string; description: string; icon: React.ReactNode }> = {
  today: {
    label:       "今日のフィードバック",
    description: "このセッションの感想へのコメント・励まし",
    icon:        <Sparkles className="h-4 w-4" />,
  },
  recap: {
    label:       "おさらい生成",
    description: "ここまでの全セッションを元に読んだ内容を要約",
    icon:        <BookOpen className="h-4 w-4" />,
  },
  review: {
    label:       "読了後の総評",
    description: "本全体を振り返ったフィードバック",
    icon:        <Star className="h-4 w-4" />,
  },
};

export function PaneAiFeedback({ book, session, allSessions }: PaneAiFeedbackProps) {
  const [mode,     setMode]     = useState<AIMode>("today");
  const [status,   setStatus]   = useState<FeedbackStatus>("idle");
  const [response, setResponse] = useState(() => {
    // セッションに保存済みの today フィードバックを初期表示
    return "";
  });

  const handleRequest = async () => {
    if (allSessions.length === 0) {
      setStatus("empty");
      return;
    }
    if (mode === "today" && !session) return;

    setStatus("loading");
    setResponse("");

    const sessionId = mode === "today" ? session!.id : "book";

    try {
      const res = await fetch(`/api/sessions/${sessionId}/ai-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          impression:      session?.impression ?? null,
          quotes:          session?.quotes.map((q) => q.text) ?? [],
          allImpressions:  allSessions.map((s) => s.impression ?? "").filter(Boolean),
        }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setResponse(data.text);
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleModeChange = (newMode: AIMode) => {
    setMode(newMode);
    setStatus("idle");
    // today モードに切り替えた際、保存済みフィードバックがあれば表示
    if (newMode === "today" && session?.aiFeedback) {
      setResponse(session.aiFeedback);
      setStatus("done");
    } else {
      setResponse("");
    }
  };

  if (!book) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">← 本を選んでください</p>
      </div>
    );
  }

  const canRequest = mode !== "today" || session !== null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          AIフィードバック
        </h2>
        <p className="text-xs text-muted-foreground">Gemini 2.5 Flash</p>
      </div>

      {/* モード選択 */}
      <div className="space-y-1.5 border-b px-4 py-3">
        {(Object.entries(modeConfig) as [AIMode, (typeof modeConfig)[AIMode]][]).map(
          ([m, config]) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-colors",
                mode === m
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-accent",
              )}
            >
              <span className={cn("mt-0.5 shrink-0", mode === m ? "text-primary" : "text-muted-foreground")}>
                {config.icon}
              </span>
              <div>
                <p className="text-xs font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </button>
          ),
        )}
      </div>

      {/* 生成ボタン */}
      <div className="px-4 py-3">
        <Button
          onClick={handleRequest}
          disabled={status === "loading" || !canRequest}
          className="w-full"
          size="sm"
        >
          <Sparkles className={cn("mr-2 h-4 w-4", status === "loading" && "animate-pulse")} />
          {status === "loading" ? "生成中..." : modeConfig[mode].label}
        </Button>
        {mode === "today" && !session && (
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            セッションを選択してください
          </p>
        )}
      </div>

      {/* レスポンスエリア */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {status === "idle" ? (
          <p className="text-center text-xs text-muted-foreground">
            ボタンを押すとAIがフィードバックを生成します
          </p>
        ) : (
          <AIResponseCard
            status={status}
            text={response}
            onRetry={handleRequest}
          />
        )}
      </div>
    </div>
  );
}
