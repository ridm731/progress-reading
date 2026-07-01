// Phase 1: manually defined types matching Drizzle InferSelectModel output for Phase 3
// numeric columns (progressFrom/To) return string in Drizzle; date columns return string

export type BookStatus   = "reading" | "done" | "want_to_read";
export type BookMedium   = "paper" | "kindle";
export type ProgressType = "page" | "location" | "percent" | "chapter";
export type QuoteSource  = "manual" | "kindle_import";
export type AIMode       = "today" | "recap" | "review";

export type Book = {
  id:          string;
  userId:      string;
  title:       string;
  author:      string;
  status:      BookStatus;
  medium:      BookMedium;
  totalPages:  number | null;
  isbn:        string | null;
  coverUrl:    string | null;
  startedAt:   string | null; // DATE → string
  finishedAt:  string | null;
  createdAt:   Date;
  updatedAt:   Date;
};

export type Session = {
  id:           string;
  bookId:       string;
  sessionDate:  string; // DATE → string
  progressType: ProgressType;
  progressFrom: string | null; // numeric → string
  progressTo:   string | null;
  progressNote: string | null;
  impression:   string | null;
  createdAt:    Date;
};

export type Quote = {
  id:        string;
  bookId:    string;
  sessionId: string | null;
  text:      string;
  pageNo:    number | null;
  source:    QuoteSource;
  createdAt: Date;
};

export type SessionWithQuotes = Session & { quotes: Quote[] };
export type BookWithSessions  = Book  & { sessions: SessionWithQuotes[] };

export type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: { formErrors: string[]; fieldErrors: Record<string, string[]> } };
