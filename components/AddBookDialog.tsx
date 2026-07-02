"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookMedium, BookWithSessions } from "@/lib/types";

interface AddBookDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (book: BookWithSessions) => void;
}

export function AddBookDialog({ open, onClose, onAdd }: AddBookDialogProps) {
  const [title, setTitle]   = useState("");
  const [author, setAuthor] = useState("");
  const [medium, setMedium] = useState<BookMedium>("paper");
  const [pages, setPages]   = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:      title.trim(),
          author:     author.trim(),
          medium,
          totalPages: pages ? parseInt(pages, 10) : null,
        }),
      });
      if (!res.ok) {
        alert("本の追加に失敗しました");
        return;
      }
      const data = await res.json();
      const newBook: BookWithSessions = { ...data.book, sessions: [] };

      onAdd(newBook);
      setTitle(""); setAuthor(""); setMedium("paper"); setPages("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card shadow-xl">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">本を追加</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium">タイトル *</label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="本のタイトル"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">著者 *</label>
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="著者名"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">媒体</label>
            <div className="flex gap-2">
              {(["paper", "kindle"] as BookMedium[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMedium(m)}
                  className={`flex-1 rounded-md border py-1.5 text-sm transition-colors ${
                    medium === m
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-accent"
                  }`}
                >
                  {m === "paper" ? "📖 紙" : "📱 Kindle"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">総ページ数（任意）</label>
            <Input
              type="number"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              placeholder="例: 320"
              min={1}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" className="flex-1" disabled={!title.trim() || !author.trim() || saving}>
              {saving ? "追加中..." : "追加"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
