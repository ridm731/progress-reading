# 読書ログツール — バックエンド実装プラン

> フロントUI設計（PLAN.md）と連動した、データ・認証・API・デプロイの実装計画。

---

## 0. プロジェクト初期セットアップ

### 0-1. Next.js プロジェクト作成

```bash
npx create-next-app@latest progress-reading \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*"
```

`package.json` の `next` バージョンを workspace-ui-kit に合わせて固定：

```json
{
  "dependencies": {
    "next": "^16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  }
}
```

### 0-2. shadcn/ui のセットアップ（base-nova）

```bash
npx shadcn@latest init
# style: base-nova, baseColor: neutral, cssVariables: true
```

`components.json` は workspace-ui-kit の設定をそのまま流用する。

### 0-3. 追加パッケージ一括インストール

```bash
npm install drizzle-orm @neondatabase/serverless ws
npm install -D drizzle-kit @types/ws
npm install next-auth@beta          # Auth.js v5
npm install @auth/drizzle-adapter   # Auth.js × Drizzle
npm install zod
npm install lucide-react
npm install @google/generative-ai   # Gemini SDK
```

### 0-4. ディレクトリ構造

```
progress-reading/
├── app/
│   ├── layout.tsx                  # RootLayout（SessionProvider）
│   ├── page.tsx                    # Server Component（データフェッチ → Workspace に渡す）
│   ├── globals.css                 # Tailwind v4 + カラートークン
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts            # Auth.js handlers
│   └── api/
│       └── feedback/
│           └── route.ts            # Gemini APIエンドポイント
├── auth.ts                         # Auth.js 設定（プロジェクトルート）
├── middleware.ts                   # 全ルート認証保護
├── db/
│   ├── schema.ts                   # Drizzle スキーマ定義
│   ├── client.ts                   # Drizzle クライアント（neon-http）
│   └── migrations/                 # drizzle-kit が生成
├── lib/
│   ├── types.ts                    # Book / Session / Quote / AIMode 型
│   ├── schemas.ts                  # Zod バリデーションスキーマ（APIと共用）
│   ├── mock-data.ts                # フェーズ1用モックデータ（フェーズ3でDB差替）
│   └── queries/
│       ├── books.ts                # Drizzle クエリ関数（本のCRUD）
│       ├── sessions.ts             # Drizzle クエリ関数（セッションCRUD）
│       └── quotes.ts               # Drizzle クエリ関数（引用CRUD）
├── components/
│   └── ...（UIコンポーネント、PLAN.md参照）
└── actions/
    ├── books.ts                    # Server Actions（本の登録・更新・削除）
    ├── sessions.ts                 # Server Actions（セッションCRUD）
    └── quotes.ts                   # Server Actions（引用CRUD）
```

---

## 1. データベース設計（Drizzle ORM × Neon）

### 1-1. Drizzle クライアント（`db/client.ts`）

```ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// Node.js 環境では ws が必要（Edge Runtime 使用時は不要）
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });
```

**`neon-serverless`（WebSocketドライバ）を使う理由**: `neon-http` はトランザクションをサポートしないため、`@auth/drizzle-adapter` が内部で行うセッション作成・アカウントリンク等のトランザクション操作でエラーになる。WebSocketドライバはトランザクション対応かつ Neon のコネクション管理とも相性が良い。

### 1-2. Drizzle スキーマ（`db/schema.ts`）

```ts
import {
  pgTable, pgEnum, text, integer, numeric, date, timestamp, primaryKey
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Auth.js v5 必須テーブル ─────────────────────────────
// DrizzleAdapter が要求する4テーブル。読書データとは独立して管理する。
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

// ── pgEnum（DB レベルで値を制約）──────────────────────────
export const bookStatusEnum   = pgEnum("book_status",    ["reading", "done", "want_to_read"]);
export const bookMediumEnum   = pgEnum("book_medium",    ["paper", "kindle"]);
export const progressTypeEnum = pgEnum("progress_type",  ["page", "location", "percent", "chapter"]);
export const quoteSourceEnum  = pgEnum("quote_source",   ["manual", "kindle_import"]);

// ── books ──────────────────────────────────────────────
export const books = pgTable("books", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // 将来のマルチユーザー拡張に備えて userId を最初から持つ
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:       text("title").notNull(),
  author:      text("author").notNull(),
  status:      bookStatusEnum("status").notNull().default("want_to_read"),
  medium:      bookMediumEnum("medium").notNull().default("paper"),
  totalPages:  integer("total_pages"),
  isbn:        text("isbn"),
  coverUrl:    text("cover_url"),
  startedAt:   date("started_at"),
  finishedAt:  date("finished_at"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull()
               .$onUpdate(() => new Date()),  // UPDATE 時に自動更新
});

// ── reading_sessions ────────────────────────────────────
// Auth.js の "session" テーブルと名前が衝突するため reading_sessions とする
export const readingSessions = pgTable("reading_sessions", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookId:        text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  sessionDate:   date("session_date").notNull(),
  progressType:  progressTypeEnum("progress_type").notNull().default("page"),
  // ページ(integer)・パーセント(numeric)・location(integer) を1フィールドで兼用
  progressFrom:  numeric("progress_from", { precision: 8, scale: 2 }),
  progressTo:    numeric("progress_to",   { precision: 8, scale: 2 }),
  progressNote:  text("progress_note"),
  impression:    text("impression"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

// ── quotes ──────────────────────────────────────────────
export const quotes = pgTable("quotes", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookId:    text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => readingSessions.id, { onDelete: "set null" }),
             // NULL 許容: 本に直接紐づけたい引用のため
  text:      text("text").notNull(),
  pageNo:    integer("page_no"),            // ページ番号は整数で十分
  source:    quoteSourceEnum("source").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── リレーション定義 ──────────────────────────────────────
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
```

### 1-3. `drizzle.config.ts`（プロジェクトルート）

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema:    "./db/schema.ts",
  out:       "./db/migrations",
  dialect:   "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

### 1-4. マイグレーション手順

```bash
# 差分SQL を生成（コミット前に必ず確認）
npx drizzle-kit generate

# Neon に適用
npx drizzle-kit migrate

# Neon Studio でデータ確認
npx drizzle-kit studio
```

**注意**: `drizzle-kit` は `push`（スキーマ直接適用）と `migrate`（SQLファイル経由）の2モードがある。本番では必ず `migrate` を使う（`push` は migration 履歴が残らないため）。

---

## 2. 型定義・バリデーション

### 2-1. `lib/types.ts`（アプリ全体の型）

```ts
import type { InferSelectModel } from "drizzle-orm";
import type { books, readingSessions, quotes } from "@/db/schema";

export type Book    = InferSelectModel<typeof books>;
export type Session = InferSelectModel<typeof readingSessions>;
export type Quote   = InferSelectModel<typeof quotes>;

export type BookStatus    = "reading" | "done" | "want_to_read";
export type BookMedium    = "paper" | "kindle";
export type ProgressType  = "page" | "location" | "percent" | "chapter";
export type AIMode        = "today" | "recap" | "review";

// UI用: セッションに引用を含めたもの
export type SessionWithQuotes = Session & { quotes: Quote[] };

// UI用: 本にセッションと引用を含めたもの
export type BookWithSessions = Book & { sessions: SessionWithQuotes[] };

// Server Actions の統一戻り値型（コール側で型ナローイングを強制）
export type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: { formErrors: string[]; fieldErrors: Record<string, string[]> } };
```

### 2-2. `lib/schemas.ts`（Zod バリデーション、Server Actions / Route Handler 共用）

```ts
import { z } from "zod";

export const CreateBookSchema = z.object({
  title:      z.string().min(1).max(200),
  author:     z.string().min(1).max(100),
  medium:     z.enum(["paper", "kindle"]),
  totalPages: z.number().int().positive().optional(),
  isbn:       z.string().optional(),
});

export const UpdateBookStatusSchema = z.object({
  id:         z.string().uuid(),
  status:     z.enum(["reading", "done", "want_to_read"]),
  startedAt:  z.string().date().optional(),
  finishedAt: z.string().date().optional(),
});

export const CreateSessionSchema = z.object({
  bookId:       z.string().uuid(),
  sessionDate:  z.string().date(),
  progressType: z.enum(["page", "location", "percent", "chapter"]),
  progressFrom: z.number().nonnegative().optional(),
  progressTo:   z.number().nonnegative().optional(),
  progressNote: z.string().max(200).optional(),
  impression:   z.string().max(2000).optional(),
}).refine(
  (d) => d.progressFrom == null || d.progressTo == null || d.progressTo >= d.progressFrom,
  { message: "progressTo は progressFrom 以上である必要があります" }
);

export const CreateQuoteSchema = z.object({
  bookId:    z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  text:      z.string().min(1).max(1000),
  pageNo:    z.number().nonnegative().optional(),
});

export const FeedbackRequestSchema = z.object({
  mode:      z.enum(["today", "recap", "review"]),
  bookTitle: z.string().min(1),
  sessions:  z.array(z.object({
    sessionDate: z.string(),
    impression:  z.string().optional(),
    quotes:      z.array(z.string()),
    progressNote: z.string().optional(),
  })).min(1),
});
```

---

## 3. 認証（Auth.js v5）

### 3-1. `auth.ts`（プロジェクトルート）

```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [Google],
  session: { strategy: "database" }, // strategy を明示（DrizzleAdapter使用時のデフォルト）
  callbacks: {
    signIn({ user }) {
      // ALLOWED_EMAIL 未設定は設定ミスとして即エラーにする
      const allowed = process.env.ALLOWED_EMAIL;
      if (!allowed) throw new Error("ALLOWED_EMAIL is not set");
      return user.email === allowed;
    },
    session({ session, user }) {
      // strategy: "database" では user は必ず存在するが防御的に確認
      if (user) session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error:  "/login",
    // /login?error=AccessDenied が渡るのでログインページ側でエラー表示を実装する
  },
});
```

**Note**: `DrizzleAdapter` を使うと Auth.js が要求するセッション・アカウントテーブルを自動管理する。`db/schema.ts` に `users` / `accounts` / `authSessions` / `verificationTokens` を定義したあと、`drizzle-kit generate && drizzle-kit migrate` で一括適用する。

### 3-2. `app/auth/[...nextauth]/route.ts`

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### 3-3. `middleware.ts`（全ルート保護）

```ts
import { auth } from "@/auth";

export default auth((req) => {
  // 未認証ならログインページへリダイレクト
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // 認証不要なパスを除外: login / 静的ファイル / Auth.js API（/api/auth/...）
  matcher: ["/((?!login|_next/static|_next/image|favicon\\.ico|api/auth).*)"],
};
```

**Note**: `export { auth as middleware }` の省略記法は内部で DB アクセスが走るため、WebSocket ドライバとの組み合わせによっては Edge Runtime で動作しない場合がある。明示的なリダイレクト関数形式にすることで挙動が明確になる。

### 3-4. 必要な環境変数

```bash
# .env.local
AUTH_SECRET="（openssl rand -base64 32 で生成）"
AUTH_GOOGLE_ID="Google Cloud Console から取得"
AUTH_GOOGLE_SECRET="Google Cloud Console から取得"
ALLOWED_EMAIL="your-email@gmail.com"
DATABASE_URL="postgresql://...@neon.tech/..."
GEMINI_API_KEY="Google AI Studio から取得"（NEXT_PUBLIC_ は絶対につけない）
```

### 3-5. Auth.js テーブルと読書セッションの名前衝突について

Auth.js の `sessions` テーブルと読書セッションが衝突するため、以下の命名で分離する：

| テーブル名 | 用途 |
|-----------|------|
| `session` | Auth.js が管理するログインセッション（`authSessions` として export） |
| `reading_sessions` | 本アプリの読書セッション（`readingSessions` として export） |

スキーマは `db/schema.ts` に一元管理し、`drizzle-kit generate` で両方まとめてマイグレーションファイルを生成する。

---

## 4. データアクセス層（`lib/queries/`）

### 4-1. `lib/queries/books.ts`

```ts
import { db } from "@/db/client";
import { books, readingSessions, quotes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getBooks() {
  return db.select().from(books).orderBy(desc(books.createdAt));
}

export async function getBookWithSessions(bookId: string) {
  return db.query.books.findFirst({
    where: eq(books.id, bookId),
    with: {
      sessions: {
        orderBy: desc(readingSessions.sessionDate),
        with: { quotes: true },
      },
    },
  });
}

export async function createBook(values: typeof books.$inferInsert) {
  const [book] = await db.insert(books).values(values).returning();
  return book;
}

export async function updateBook(id: string, values: Partial<typeof books.$inferInsert>) {
  const [book] = await db.update(books).set({
    ...values,
    updatedAt: new Date(),
  }).where(eq(books.id, id)).returning();
  return book;
}

export async function deleteBook(id: string) {
  await db.delete(books).where(eq(books.id, id));
}
```

### 4-2. `lib/queries/sessions.ts` / `quotes.ts`

同様のパターンで実装。関数シグネチャのみ列挙：

```ts
// sessions
getSessionsByBook(bookId: string): Promise<Session[]>
createSession(values): Promise<Session>
updateSession(id: string, values): Promise<Session>
deleteSession(id: string): Promise<void>
getLastSession(bookId: string): Promise<Session | undefined>

// quotes
getQuotesBySession(sessionId: string): Promise<Quote[]>
getQuotesByBook(bookId: string): Promise<Quote[]>
createQuote(values): Promise<Quote>
deleteQuote(id: string): Promise<void>
```

---

## 5. Server Actions（`actions/`）

**方針**: UI の状態変更はすべて Server Actions 経由にする。Route Handler（`/api/...`）は AI フィードバックのストリーミングのみに絞る。

### 5-1. `actions/books.ts`

```ts
"use server";

import { auth } from "@/auth";
import { CreateBookSchema, UpdateBookStatusSchema } from "@/lib/schemas";
import { createBook, updateBook, deleteBook } from "@/lib/queries/books";
import { revalidatePath } from "next/cache";
import type { ActionResult, Book } from "@/lib/types";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function createBookAction(formData: unknown): Promise<ActionResult<Book>> {
  await requireAuth();
  const parsed = CreateBookSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }
  try {
    const book = await createBook(parsed.data);
    revalidatePath("/");
    return { success: true, data: book };
  } catch (e) {
    console.error("createBook failed:", e);
    return { success: false, error: { formErrors: ["保存に失敗しました"], fieldErrors: {} } };
  }
}

export async function updateBookStatusAction(formData: unknown): Promise<ActionResult<Book>> {
  await requireAuth();
  const parsed = UpdateBookStatusSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }
  try {
    const { id, ...values } = parsed.data;
    const book = await updateBook(id, values);
    revalidatePath("/");
    return { success: true, data: book };
  } catch (e) {
    console.error("updateBook failed:", e);
    return { success: false, error: { formErrors: ["更新に失敗しました"], fieldErrors: {} } };
  }
}

export async function deleteBookAction(id: string): Promise<ActionResult<void>> {
  await requireAuth();
  try {
    await deleteBook(id);
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (e) {
    console.error("deleteBook failed:", e);
    return { success: false, error: { formErrors: ["削除に失敗しました"], fieldErrors: {} } };
  }
}
```

同パターンで `actions/sessions.ts` / `actions/quotes.ts` を実装する。コール側は `result.success` で型ナローイングすること。

### 5-2. `app/page.tsx`（Server Component として初期データ取得）

```ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBooks } from "@/lib/queries/books";
import { ReadingWorkspace } from "@/components/_components/ReadingWorkspace";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // 初期データはすべて Server Component でフェッチ
  const books = await getBooks();

  return <ReadingWorkspace initialBooks={books} />;
}
```

---

## 6. AI フィードバック（Gemini 2.0 Flash）

### 6-1. `app/api/feedback/route.ts`

```ts
import { auth } from "@/auth";
import { FeedbackRequestSchema } from "@/lib/schemas";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel Hobby プランのデフォルトタイムアウトは 10 秒。
// Pro プラン以上なら maxDuration を延ばせる（最大 300 秒）。
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  // 認証ガード（必須 — デプロイ後にエンドポイントが公開されるため）
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const parsed = FeedbackRequestSchema.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const { mode, bookTitle, sessions } = parsed.data;

  // セッション数が多い場合は直近10件に絞ってトークン上限超過を防ぐ
  const recentSessions = sessions.slice(-10);
  const prompt = buildPrompt(mode, bookTitle, recentSessions);

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContentStream(prompt);

  // ストリーミングレスポンス
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          controller.enqueue(new TextEncoder().encode(chunk.text()));
        }
        controller.close();
      } catch (e) {
        // エラーを伝播しないとクライアントがハングする
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function buildPrompt(
  mode: "today" | "recap" | "review",
  bookTitle: string,
  sessions: FeedbackRequestSchema["sessions"]
): string {
  const sessionSummary = sessions
    .map((s) => [
      `日付: ${s.sessionDate}`,
      s.progressNote ? `進捗: ${s.progressNote}` : "",
      s.impression ? `感想: ${s.impression}` : "",
      s.quotes.length ? `引用: ${s.quotes.join(" / ")}` : "",
    ].filter(Boolean).join("\n"))
    .join("\n\n");

  const prompts = {
    today: `
あなたは読書の伴走者です。以下の読書記録を読んで、励ましとコメントを200字以内で書いてください。
本: 『${bookTitle}』
最新セッション:
${sessions.at(-1) ? sessionSummary.split("\n\n").at(-1) : ""}
`,
    recap: `
あなたは読書サマリーの専門家です。以下の全セッションの記録を元に、読んだ内容のおさらいを300字以内で書いてください。
本: 『${bookTitle}』
セッション記録:
${sessionSummary}
`,
    review: `
あなたは書評家です。以下の全読書記録を元に、この本全体への総評を400字以内で書いてください。
本: 『${bookTitle}』
全セッション記録:
${sessionSummary}
`,
  };

  return prompts[mode];
}
```

### 6-2. クライアント側ストリーミング受信（`AIFeedbackPane.tsx` 内）

```ts
async function requestFeedback(mode: AIMode) {
  setStatus("loading");
  setResponse("");

  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, bookTitle, sessions }),
    });

    if (!res.ok) throw new Error("API error");

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    setStatus("streaming");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setResponse((prev) => prev + decoder.decode(value));
    }
    setStatus("done");
  } catch {
    setStatus("error");
  }
}
```

---

## 7. フェーズ1用モックデータ（`lib/mock-data.ts`）

`Book` 型（`InferSelectModel`）に厳密に合わせておくことで、フェーズ3移行時の型エラーをゼロにする。

```ts
import type { BookWithSessions } from "./types";

// Book 型に合わせた全フィールド定義（型エラーが出たら型定義側を先に直す）
const MOCK_BOOKS: BookWithSessions[] = [
  {
    id: "book-1",
    userId: "mock-user-1",
    title: "思考の整理学",
    author: "外山滋比古",
    status: "reading",
    medium: "paper",
    totalPages: 232,
    isbn: null,
    coverUrl: null,
    startedAt: "2026-06-25",
    finishedAt: null,
    createdAt: new Date("2026-06-25"),
    updatedAt: new Date("2026-07-01"),
    sessions: [
      {
        id: "sess-1",
        bookId: "book-1",
        sessionDate: "2026-07-01",
        progressType: "page",
        progressFrom: "80",   // numeric 型は Drizzle が string で返す
        progressTo:   "120",
        progressNote: null,
        impression: "朝に読書を習慣化するヒントをたくさんもらった。",
        createdAt: new Date("2026-07-01"),
        quotes: [
          {
            id: "q-1",
            bookId: "book-1",
            sessionId: "sess-1",
            text: "朝の頭は夜よりも冴えている",
            pageNo: 95,
            source: "manual",
            createdAt: new Date("2026-07-01"),
          },
        ],
      },
    ],
  },
];

// lib/queries/ と同じシグネチャを持つモック関数
// フェーズ3では USE_MOCK 環境変数フラグで切り替える
export async function getBooks()                          { return MOCK_BOOKS; }
export async function getBookWithSessions(id: string)    { return MOCK_BOOKS.find((b) => b.id === id); }
```

### モックとDBの切り替え方針

```ts
// lib/queries/books.ts
import { getMockBooks, getMockBookWithSessions } from "@/lib/mock-data";
import { getBooksFromDB, getBookWithSessionsFromDB } from "@/lib/queries/books.db";

const useMock = process.env.USE_MOCK === "true";

export const getBooks             = useMock ? getMockBooks             : getBooksFromDB;
export const getBookWithSessions  = useMock ? getMockBookWithSessions  : getBookWithSessionsFromDB;
```

`.env.local` に `USE_MOCK=true` を設定するだけでモードを切り替えられる。フェーズ3では `USE_MOCK` を削除するだけでよい。

---

## 8. 環境変数と Vercel デプロイ

### 8-1. `.env.local`（ローカル開発）

```bash
AUTH_SECRET="openssl rand -base64 32 の出力"
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
ALLOWED_EMAIL="your-email@gmail.com"
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
GEMINI_API_KEY="..."     # NEXT_PUBLIC_ を絶対につけない
USE_MOCK="true"          # フェーズ1はモード。フェーズ3で削除する
```

### 8-2. Vercel へのデプロイ手順

1. Vercel プロジェクト作成（GitHub 連携 or `vercel` CLI）
2. 上記の環境変数をすべて Vercel の Environment Variables に追加
3. `DATABASE_URL` は Neon の Connection String（Pooled ではなく Direct を使う）
4. `AUTH_SECRET` は `openssl rand -base64 32` の出力を使用
5. Google Cloud Console → OAuth 2.0 の「承認済みのリダイレクト URI」に
   `https://your-app.vercel.app/auth/callback/google` を追加
6. **初回デプロイは認証（Phase 2）完了後のみ行う**

### 8-3. `next.config.ts`（workspace-ui-kit から流用）

```ts
import path from "node:path";
const projectRoot = path.resolve(__dirname);

const nextConfig = {
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
```

---

## 9. エラーハンドリング方針

| レイヤー | 方針 |
|---------|------|
| Server Actions | `safeParse` で Zod バリデーション → `{ error }` を返す（throw しない） |
| Route Handler | `try/catch` + 適切な HTTP ステータスコード |
| クライアント | Server Actions の戻り値を確認、エラー時は `sonner` トースト通知 |
| AIResponseCard | `status: 'error'` 状態で「再試行する」ボタンを表示 |

---

## 10. 実装チェックリスト（フェーズ別）

### Phase 1: UIの骨格

- [ ] Next.js プロジェクト作成
- [ ] shadcn/ui base-nova セットアップ
- [ ] `lib/types.ts` 型定義
- [ ] `lib/mock-data.ts`（getBooks / getBookWithSessions）
- [ ] UIコンポーネント全件（PLAN.md参照）

### Phase 2: 認証

- [ ] `npm install next-auth@beta @auth/drizzle-adapter`
- [ ] Neon プロジェクト作成・`DATABASE_URL` 取得（Auth.js テーブルを DB に作るために先に必要）
- [ ] `npm install drizzle-orm @neondatabase/serverless ws && npm install -D drizzle-kit @types/ws`
- [ ] `db/schema.ts`（Auth.js テーブル + 読書テーブルを一括定義）
- [ ] `drizzle.config.ts`
- [ ] `npx drizzle-kit generate && npx drizzle-kit migrate`（Auth.js テーブルを先に作る）
- [ ] `db/client.ts`（neon-serverless / WebSocket ドライバ）
- [ ] `auth.ts`（DrizzleAdapter + Google Provider + ALLOWED_EMAIL ガード）
- [ ] `app/auth/[...nextauth]/route.ts`
- [ ] `middleware.ts`（明示的なリダイレクト関数形式）
- [ ] Google Cloud Console で OAuth 設定（リダイレクト URI 追加）
- [ ] `.env.local` に AUTH_* / DATABASE_URL 変数を設定
- [ ] 動作確認（自分のGoogleアカウントでのみログインできることを確認）
- [ ] **ここで初回 Vercel デプロイ（認証なしのデプロイ禁止）**

### Phase 3: DB接続

- [ ] `lib/queries/books.db.ts` / `sessions.db.ts` / `quotes.db.ts`（DB実装）
- [ ] `lib/queries/books.ts`（`USE_MOCK` フラグで切り替え）
- [ ] `.env.local` の `USE_MOCK=true` を削除して DB モードに切り替え
- [ ] `actions/books.ts` / `sessions.ts` / `quotes.ts`（`ActionResult<T>` 型で統一）
- [ ] `app/page.tsx` で Server Component データフェッチ
- [ ] 全 Actions の try/catch とエラーレスポンス確認

### Phase 4: AI機能

- [ ] `npm install @google/generative-ai`
- [ ] `.env.local` に `GEMINI_API_KEY`（NEXT_PUBLIC_ 禁止）
- [ ] `app/api/feedback/route.ts`（認証ガード + Zod バリデーション）
- [ ] `buildPrompt` 関数（3モード分）
- [ ] クライアント側ストリーミング受信（`AIFeedbackPane.tsx`）
- [ ] AIResponseCard 4状態確認（loading / error / empty / done）

### Phase 5: 仕上げ

- [ ] `lib/schemas.ts` 全スキーマ確認
- [ ] エラーハンドリング全件確認
- [ ] `sonner` トースト通知の導入
- [ ] モバイルレイアウト確認
- [ ] Vercel 本番デプロイ・動作確認
