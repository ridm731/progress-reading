"use client";

import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { cn } from "@/lib/utils";
import type { BookStatus, BookWithSessions } from "@/lib/types";

const STATUS_ORDER: BookStatus[] = ["reading", "want_to_read", "done"];

interface PaneBookshelfProps {
  books:          BookWithSessions[];
  selectedBookId: string | null;
  onSelectBook:   (id: string) => void;
  onAddBook:      () => void;
}

export function PaneBookshelf({ books, selectedBookId, onSelectBook, onAddBook }: PaneBookshelfProps) {
  const [query,         setQuery]         = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<BookStatus>>(new Set());

  // ⌘K でフォーカス
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("bookshelf-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleFilter = (status: BookStatus) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  };

  const filtered = books.filter((b) => {
    const matchesQuery =
      query === "" ||
      b.title.toLowerCase().includes(query.toLowerCase()) ||
      b.author.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = activeFilters.size === 0 || activeFilters.has(b.status);
    return matchesQuery && matchesFilter;
  });

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    books: filtered.filter((b) => b.status === status),
  })).filter(({ books }) => books.length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <div className="border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">本棚</h2>
          <button
            onClick={onAddBook}
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent"
            title="本を追加"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* 検索 */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="bookshelf-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="検索　⌘K"
            className="h-7 pl-8 text-xs"
          />
        </div>
        {/* ステータスフィルタ */}
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              onClick={() => toggleFilter(status)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                activeFilters.has(status)
                  ? "border-transparent bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground",
              )}
            >
              <StatusBadge status={status} className={activeFilters.has(status) ? "bg-transparent text-inherit" : ""} />
            </button>
          ))}
        </div>
      </div>

      {/* 本一覧 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {grouped.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {query ? "該当する本がありません" : "本を追加してください"}
          </p>
        ) : (
          grouped.map(({ status, books: groupBooks }) => (
            <div key={status} className="mb-4">
              <div className="mb-1 px-2">
                <StatusBadge status={status} />
              </div>
              {groupBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => onSelectBook(book.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
                    selectedBookId === book.id && "bg-accent",
                  )}
                >
                  <p className="text-sm font-medium leading-snug">{book.title}</p>
                  <p className="text-xs text-muted-foreground">{book.author}</p>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
