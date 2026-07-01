import {
  pgTable,
  pgEnum,
  text,
  integer,
  numeric,
  date,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Auth.js v5 必須テーブル ─────────────────────────────────
export const users = pgTable("user", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:          text("name"),
  email:         text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image:         text("image"),
});

export const accounts = pgTable("account", {
  userId:            text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:              text("type").$type<AdapterAccountType>().notNull(),
  provider:          text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token:     text("refresh_token"),
  access_token:      text("access_token"),
  expires_at:        integer("expires_at"),
  token_type:        text("token_type"),
  scope:             text("scope"),
  id_token:          text("id_token"),
  session_state:     text("session_state"),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);

export const authSessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId:       text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token:      text("token").notNull(),
  expires:    timestamp("expires", { mode: "date" }).notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })]);

// ── Enum ────────────────────────────────────────────────────
export const bookStatusEnum   = pgEnum("book_status",   ["reading", "done", "want_to_read"]);
export const bookMediumEnum   = pgEnum("book_medium",   ["paper", "kindle"]);
export const progressTypeEnum = pgEnum("progress_type", ["page", "location", "percent", "chapter"]);
export const quoteSourceEnum  = pgEnum("quote_source",  ["manual", "kindle_import"]);

// ── books ───────────────────────────────────────────────────
export const books = pgTable("books", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:     text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:      text("title").notNull(),
  author:     text("author").notNull(),
  status:     bookStatusEnum("status").notNull().default("want_to_read"),
  medium:     bookMediumEnum("medium").notNull().default("paper"),
  totalPages: integer("total_pages"),
  isbn:       text("isbn"),
  coverUrl:   text("cover_url"),
  startedAt:  date("started_at"),
  finishedAt: date("finished_at"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull()
              .$onUpdate(() => new Date()),
});

// ── reading_sessions ─────────────────────────────────────────
// "session" は Auth.js テーブルと衝突するため reading_sessions とする
export const readingSessions = pgTable("reading_sessions", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookId:       text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  sessionDate:  date("session_date").notNull(),
  progressType: progressTypeEnum("progress_type").notNull().default("page"),
  progressFrom: numeric("progress_from", { precision: 8, scale: 2 }),
  progressTo:   numeric("progress_to",   { precision: 8, scale: 2 }),
  progressNote: text("progress_note"),
  impression:   text("impression"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ── quotes ──────────────────────────────────────────────────
export const quotes = pgTable("quotes", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookId:    text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => readingSessions.id, { onDelete: "set null" }),
  text:      text("text").notNull(),
  pageNo:    integer("page_no"),
  source:    quoteSourceEnum("source").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── リレーション ──────────────────────────────────────────────
export const booksRelations = relations(books, ({ many }) => ({
  sessions: many(readingSessions),
  quotes:   many(quotes),
}));

export const readingSessionsRelations = relations(readingSessions, ({ one, many }) => ({
  book:   one(books, { fields: [readingSessions.bookId], references: [books.id] }),
  quotes: many(quotes),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  book:    one(books,           { fields: [quotes.bookId],    references: [books.id] }),
  session: one(readingSessions, { fields: [quotes.sessionId], references: [readingSessions.id] }),
}));
