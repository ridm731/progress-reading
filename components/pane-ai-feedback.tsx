"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AIResponseCard } from "@/components/primitives/AIResponseCard";
import type { BookWithSessions, SessionWithQuotes, AIMode } from "@/lib/types";
import { Sparkles, BookOpen, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackStatus = "idle" | "loading" | "streaming" | "done" | "error" | "empty";

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

const MOCK_RESPONSES: Record<AIMode, string> = {
  today: `今日もしっかり読み進めましたね！

「より少なく、しかしより良く」という哲学を腑に落とせたということ、とても大事な気づきだと思います。私たちはついつい「もっとできる」「全部やらなきゃ」と思いがちですが、本質的な問いは「これは本当に必要か？」ですよね。

次のセッションでは、具体的な実践方法に入っていくはず。楽しみに読み進めてみてください！`,
  recap: `**ここまでの読書まとめ**

序章から始まり、忙しさを美徳とする現代文化への批判、トレードオフの重要性、そして「正しいことをこなす」思考法へと展開しています。

あなたは特に「忙しさへの批判」と「トレードオフの意識」に共鳴しているようですね。この気づきをぜひ日常に活かしてみてください。`,
  review: `（本を読み終えてから使える機能です）

読了後、この本のどんな言葉や考えが最も自分の中に残りましたか？全セッションの感想と引用を振り返りながら、あなただけの「この本の総評」を一緒に作りましょう。`,
};

export function PaneAiFeedback({ book, session, allSessions }: PaneAiFeedbackProps) {
  const [mode,     setMode]     = useState<AIMode>("today");
  const [status,   setStatus]   = useState<FeedbackStatus>("idle");
  const [response, setResponse] = useState("");

  const handleRequest = async () => {
    if (allSessions.length === 0) {
      setStatus("empty");
      return;
    }
    setStatus("loading");
    setResponse("");
    await new Promise((r) => setTimeout(r, 1200));
    setStatus("done");
    setResponse(MOCK_RESPONSES[mode]);
  };

  const handleModeChange = (newMode: AIMode) => {
    setMode(newMode);
    setStatus("idle");
    setResponse("");
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
        <p className="text-xs text-muted-foreground">Gemini 2.0 Flash</p>
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
          disabled={status === "loading" || status === "streaming" || !canRequest}
          className="w-full"
          size="sm"
        >
          <Sparkles className={cn("mr-2 h-4 w-4", (status === "loading" || status === "streaming") && "animate-pulse")} />
          {status === "loading" || status === "streaming" ? "生成中..." : modeConfig[mode].label}
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
