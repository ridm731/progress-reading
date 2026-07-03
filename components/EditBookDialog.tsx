"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Trash2 } from "lucide-react";
import type { Book, BookMedium, BookWithSessions } from "@/lib/types";

export type BookEditPatch = Pick<Book, "title" | "author" | "medium" | "totalPages">;

interface EditBookDialogProps {
  book:      BookWithSessions;
  onClose:   () => void;
  onUpdated: (bookId: string, patch: BookEditPatch) => void;
  onDeleted: (bookId: string) => void;
}

export function EditBookDialog({ book, onClose, onUpdated, onDeleted }: EditBookDialogProps) {
  const [title, setTitle]   = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [medium, setMedium] = useState<BookMedium>(book.medium);
  const [pages, setPages]   = useState(book.totalPages?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    setSaving(true);
    try {
      const patch: BookEditPatch = {
        title:      title.trim(),
        author:     author.trim(),
        medium,
        totalPages: pages ? parseInt(pages, 10) : null,
      };
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        alert("本の更新に失敗しました");
        return;
      }
      onUpdated(book.id, patch);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("本の削除に失敗しました");
        return;
      }
      onDeleted(book.id);
      onClose();
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-xl border bg-card shadow-xl">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">本の情報を編集</h2>
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
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
            <div className="border-t pt-3">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-destructive underline-offset-2 hover:underline disabled:opacity-50"
                disabled={deleting}
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "削除中..." : "この本を削除"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <DeleteConfirmDialog
        open={confirmingDelete}
        title="この本を削除しますか？"
        description={`『${book.title}』とすべてのセッション・引用が削除されます。この操作は取り消せません。`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
