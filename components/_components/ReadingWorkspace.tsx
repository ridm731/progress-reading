"use client";

import { useReducer, useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PaneBookshelf } from "@/components/pane-bookshelf";
import { PaneSessions } from "@/components/pane-sessions";
import { PaneSessionDetail } from "@/components/pane-session-detail";
import { PaneAiFeedback } from "@/components/pane-ai-feedback";
import { AddBookDialog } from "@/components/AddBookDialog";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookWithSessions, SessionWithQuotes } from "@/lib/types";
import { MOCK_BOOKS } from "@/lib/mock-data";

// ── State ──────────────────────────────────────────────────
type MobilePane = "bookshelf" | "sessions" | "detail" | "ai";
type Pane3Tab   = "detail" | "ai";

type WorkspaceState = {
  books:             BookWithSessions[];
  selectedBookId:    string | null;
  selectedSessionId: string | null;
  isNewSession:      boolean;
  pane3Tab:          Pane3Tab;
};

type WorkspaceAction =
  | { type: "SELECT_BOOK";     bookId: string }
  | { type: "SELECT_SESSION";  sessionId: string }
  | { type: "NEW_SESSION" }
  | { type: "SET_PANE3_TAB";  tab: Pane3Tab }
  | { type: "ADD_BOOK";       book: BookWithSessions }
  | { type: "DELETE_SESSION"; sessionId: string };

function reducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "SELECT_BOOK":
      return { ...state, selectedBookId: action.bookId, selectedSessionId: null, isNewSession: false, pane3Tab: "detail" };
    case "SELECT_SESSION":
      return { ...state, selectedSessionId: action.sessionId, isNewSession: false, pane3Tab: "detail" };
    case "NEW_SESSION":
      return { ...state, selectedSessionId: null, isNewSession: true, pane3Tab: "detail" };
    case "SET_PANE3_TAB":
      return { ...state, pane3Tab: action.tab };
    case "ADD_BOOK":
      return { ...state, books: [action.book, ...state.books] };
    case "DELETE_SESSION": {
      const books = state.books.map((b) =>
        b.id === state.selectedBookId
          ? { ...b, sessions: b.sessions.filter((s) => s.id !== action.sessionId) }
          : b,
      );
      return { ...state, books, selectedSessionId: null, isNewSession: false };
    }
    default:
      return state;
  }
}

// ── Component ──────────────────────────────────────────────
interface ReadingWorkspaceProps {
  initialBooks: BookWithSessions[];
}

const MOBILE_PANE_ORDER: MobilePane[] = ["bookshelf", "sessions", "detail", "ai"];

export function ReadingWorkspace({ initialBooks }: ReadingWorkspaceProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [state, dispatch] = useReducer(reducer, {
    books:             initialBooks,
    selectedBookId:    initialBooks[0]?.id ?? null,
    selectedSessionId: initialBooks[0]?.sessions[0]?.id ?? null,
    isNewSession:      false,
    pane3Tab:          "detail",
  });

  const [showAddBook, setShowAddBook] = useState(false);

  const selectedBook    = state.books.find((b) => b.id === state.selectedBookId) ?? null;
  const bookSessions    = (selectedBook?.sessions ?? []) as SessionWithQuotes[];
  const selectedSession = bookSessions.find((s) => s.id === state.selectedSessionId) ?? null;

  // モバイル: URL search params でペイン管理
  const mobilePane = (searchParams.get("pane") as MobilePane) ?? "bookshelf";

  const setMobilePane = useCallback(
    (pane: MobilePane) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("pane", pane);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const handleSelectBook = (id: string) => {
    dispatch({ type: "SELECT_BOOK", bookId: id });
    setMobilePane("sessions");
  };
  const handleSelectSession = (id: string) => {
    dispatch({ type: "SELECT_SESSION", sessionId: id });
    setMobilePane("detail");
  };
  const handleNewSession = () => {
    dispatch({ type: "NEW_SESSION" });
    setMobilePane("detail");
  };
  const handleRequestAI = () => {
    dispatch({ type: "SET_PANE3_TAB", tab: "ai" });
    setMobilePane("ai");
  };

  const mobilePaneIndex = MOBILE_PANE_ORDER.indexOf(mobilePane);
  const mobileBack = () => {
    if (mobilePaneIndex > 0) setMobilePane(MOBILE_PANE_ORDER[mobilePaneIndex - 1]);
  };

  const mobilePaneLabels: Record<MobilePane, string> = {
    bookshelf: "本棚",
    sessions:  selectedBook?.title ?? "記録",
    detail:    "セッション詳細",
    ai:        "AIフィードバック",
  };

  return (
    <>
      {/* ── PC: 3ペイン ─────────────────────────────────────── */}
      <div className="hidden h-full md:grid md:grid-cols-[220px_260px_1fr]">
        {/* Pane1: 本棚 */}
        <div className="h-full overflow-hidden border-r">
          <PaneBookshelf
            books={state.books}
            selectedBookId={state.selectedBookId}
            onSelectBook={(id) => dispatch({ type: "SELECT_BOOK", bookId: id })}
            onAddBook={() => setShowAddBook(true)}
          />
        </div>

        {/* Pane2: セッション一覧 */}
        <div className="h-full overflow-hidden border-r">
          <PaneSessions
            book={selectedBook}
            sessions={bookSessions}
            selectedSessionId={state.selectedSessionId}
            onSelectSession={(id) => dispatch({ type: "SELECT_SESSION", sessionId: id })}
            onNewSession={() => dispatch({ type: "NEW_SESSION" })}
            onRequestAI={handleRequestAI}
          />
        </div>

        {/* Pane3: セッション詳細 + AI タブ */}
        <div className="flex h-full flex-col overflow-hidden">
          {/* タブ */}
          <div className="flex border-b">
            {(["detail", "ai"] as Pane3Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => dispatch({ type: "SET_PANE3_TAB", tab })}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  state.pane3Tab === tab
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "detail" ? "✏️ セッション詳細" : "🤖 AIフィードバック"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {state.pane3Tab === "detail" ? (
              <PaneSessionDetail
                book={selectedBook}
                session={state.isNewSession ? null : selectedSession}
                isNew={state.isNewSession}
                onDelete={(id) => dispatch({ type: "DELETE_SESSION", sessionId: id })}
              />
            ) : (
              <PaneAiFeedback
                book={selectedBook}
                session={selectedSession}
                allSessions={bookSessions}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── スマホ: 1ペインずつ ──────────────────────────────── */}
      <div className="flex h-full flex-col md:hidden">
        {/* スマホヘッダー */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          {mobilePaneIndex > 0 && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={mobileBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="flex-1 truncate text-sm font-medium">{mobilePaneLabels[mobilePane]}</span>
          {mobilePane === "sessions" && selectedBook && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setMobilePane("ai")}
            >
              AI
            </Button>
          )}
          {mobilePane === "bookshelf" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setShowAddBook(true)}
            >
              追加
            </Button>
          )}
        </div>

        {/* ペイン本体 */}
        <div className="flex-1 overflow-hidden">
          {mobilePane === "bookshelf" && (
            <PaneBookshelf
              books={state.books}
              selectedBookId={state.selectedBookId}
              onSelectBook={handleSelectBook}
              onAddBook={() => setShowAddBook(true)}
            />
          )}
          {mobilePane === "sessions" && (
            <PaneSessions
              book={selectedBook}
              sessions={bookSessions}
              selectedSessionId={state.selectedSessionId}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onRequestAI={handleRequestAI}
            />
          )}
          {mobilePane === "detail" && (
            <PaneSessionDetail
              book={selectedBook}
              session={state.isNewSession ? null : selectedSession}
              isNew={state.isNewSession}
              onDelete={(id) => dispatch({ type: "DELETE_SESSION", sessionId: id })}
            />
          )}
          {mobilePane === "ai" && (
            <PaneAiFeedback
              book={selectedBook}
              session={selectedSession}
              allSessions={bookSessions}
            />
          )}
        </div>
      </div>

      <AddBookDialog
        open={showAddBook}
        onClose={() => setShowAddBook(false)}
        onAdd={(book) => dispatch({ type: "ADD_BOOK", book })}
      />
    </>
  );
}
