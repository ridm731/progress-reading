"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import type { SessionWithQuotes, BookWithSessions, ProgressType } from "@/lib/types";
import { Plus, Quote, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaneSessionDetailProps {
  book:        BookWithSessions | null;
  session:     SessionWithQuotes | null;
  isNew?:      boolean;
  onDelete?:   (sessionId: string) => void;
  onSaved?:    (session: SessionWithQuotes, isNew: boolean) => void;
}

const PROGRESS_TYPE_LABELS: Record<ProgressType, string> = {
  page:     "ページ",
  location: "位置No.",
  percent:  "%",
  chapter:  "章",
};

export function PaneSessionDetail({ book, session, isNew, onDelete, onSaved }: PaneSessionDetailProps) {
  const [impression,    setImpression]    = useState(session?.impression ?? "");
  const [quotes,        setQuotes]        = useState<string[]>(session?.quotes.map((q) => q.text) ?? []);
  const [newQuote,      setNewQuote]      = useState("");
  const [progressFrom,  setProgressFrom]  = useState(session?.progressFrom ?? "");
  const [progressTo,    setProgressTo]    = useState(session?.progressTo ?? "");
  const [progressType,  setProgressType]  = useState<ProgressType>(session?.progressType ?? (book?.medium === "kindle" ? "location" : "page"));
  const [showMenu,      setShowMenu]      = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    setImpression(session?.impression ?? "");
    setQuotes(session?.quotes.map((q) => q.text) ?? []);
    setProgressFrom(session?.progressFrom ?? "");
    setProgressTo(session?.progressTo ?? "");
    setProgressType(session?.progressType ?? (book?.medium === "kindle" ? "location" : "page"));
  }, [session?.id]);

  if (!session && !isNew) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        {book ? (
          <>
            <p className="text-lg font-semibold">{book.title}</p>
            <p className="text-sm text-muted-foreground">セッションを選ぶか、今日の記録を始めましょう</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">← 本を選んでください</p>
        )}
      </div>
    );
  }

  const dateLabel = session
    ? format(new Date(session.sessionDate), "yyyy年M月d日（EEE）", { locale: ja })
    : format(new Date(), "yyyy年M月d日（EEE）", { locale: ja });

  const handleSave = async () => {
    if (!book) return;
    setSaving(true);
    try {
      if (isNew) {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId: book.id,
            progressType,
            progressFrom,
            progressTo,
            impression,
            quoteTexts: quotes,
          }),
        });
        const data = await res.json();
        if (res.ok) onSaved?.(data.session, true);
        else alert("保存に失敗しました");
      } else if (session) {
        const res = await fetch(`/api/sessions/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId: book.id,
            progressType,
            progressFrom,
            progressTo,
            impression,
            quoteTexts: quotes,
          }),
        });
        const data = await res.json();
        if (res.ok) onSaved?.(data.session, false);
        else alert("保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const addQuote = () => {
    if (newQuote.trim()) {
      setQuotes([...quotes, newQuote.trim()]);
      setNewQuote("");
    }
  };

  const removeQuote = (index: number) => {
    setQuotes(quotes.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="flex h-full flex-col">
        {/* ヘッダー */}
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{dateLabel}</h2>
            {session && onDelete && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {showMenu && (
                  <div
                    className="absolute right-0 top-8 z-20 min-w-[120px] rounded-lg border bg-card shadow-md"
                    onMouseLeave={() => setShowMenu(false)}
                  >
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                      onClick={() => { setShowMenu(false); setShowDelete(true); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      削除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 進捗入力 */}
          <div className="mt-2 flex items-center gap-2">
            {/* progress type selector */}
            <select
              value={progressType}
              onChange={(e) => setProgressType(e.target.value as ProgressType)}
              className="h-7 rounded border border-input bg-background px-2 text-xs"
            >
              {(Object.entries(PROGRESS_TYPE_LABELS) as [ProgressType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <input
              type="number"
              value={progressFrom}
              onChange={(e) => setProgressFrom(e.target.value)}
              placeholder="開始"
              className="w-16 rounded border border-input bg-background px-2 py-0.5 text-xs"
            />
            <span className="text-xs text-muted-foreground">〜</span>
            <input
              type="number"
              value={progressTo}
              onChange={(e) => setProgressTo(e.target.value)}
              placeholder="終了"
              className="w-16 rounded border border-input bg-background px-2 py-0.5 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* 印象的な一文 */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Quote className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-xs font-medium">印象的な一文</label>
            </div>
            <div className="space-y-2">
              {quotes.map((q, i) => (
                <div
                  key={i}
                  className="group flex items-start gap-2 rounded-md border-l-2 border-primary/30 bg-primary/5 px-3 py-2"
                >
                  <p className="flex-1 text-xs leading-relaxed">{q}</p>
                  <button
                    onClick={() => removeQuote(i)}
                    className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <Textarea
                value={newQuote}
                onChange={(e) => setNewQuote(e.target.value)}
                placeholder="印象に残った一文を入力...（⌘+Enter で追加）"
                className="min-h-[60px] text-xs"
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) addQuote(); }}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-1.5 h-7 text-xs"
              onClick={addQuote}
              disabled={!newQuote.trim()}
            >
              <Plus className="mr-1 h-3 w-3" />
              追加
            </Button>
          </div>

          {/* 一言感想 */}
          <div>
            <label className="mb-2 block text-xs font-medium">その日の感想</label>
            <Textarea
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              placeholder="今日の読書の感想を書いてみましょう..."
              className="min-h-[120px] text-sm"
            />
          </div>
        </div>

        <div className="border-t px-4 py-3">
          <Button size="sm" className="w-full" onClick={handleSave} disabled={saving || !book}>
            {saving ? "保存中..." : isNew ? "セッションを保存" : "保存"}
          </Button>
        </div>
      </div>

      <DeleteConfirmDialog
        open={showDelete}
        title="セッションを削除しますか？"
        description="このセッションの感想と引用がすべて削除されます。この操作は取り消せません。"
        onConfirm={() => {
          setShowDelete(false);
          if (session && onDelete) onDelete(session.id);
        }}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}
