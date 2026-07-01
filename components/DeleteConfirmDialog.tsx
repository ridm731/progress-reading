"use client";

import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  open:        boolean;
  title?:      string;
  description?: string;
  onConfirm:   () => void;
  onCancel:    () => void;
}

export function DeleteConfirmDialog({
  open,
  title = "削除しますか？",
  description = "この操作は取り消せません。",
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xs rounded-xl border bg-card shadow-xl">
        <div className="px-5 py-5">
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2 border-t px-5 py-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            キャンセル
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm}>
            削除
          </Button>
        </div>
      </div>
    </div>
  );
}
