# 読書ログツール 設計書

## プロジェクト概要

紙・Kindleで読む本の読書ログツール。自分の感想と印象的な一文を記録し、後で見返したときに「こういう本だったな」とパッと思い出せることを目的とする。

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15（`"next": "^15.x.x"` で安定版に固定） |
| デプロイ | Vercel |
| データベース | Neon（PostgreSQL） |
| ORM | Drizzle ORM（`drizzle-orm/neon-http` でHTTPドライバ使用、Edge Runtime対応・コネクション問題を回避） |
| 認証 | Auth.js v5（旧NextAuth.js v5、Googleログイン、自分のメールアドレスのみ許可） |
| AI | Gemini 2.0 Flash（Google AI Studio APIキー、無料枠内で運用） |

参考リポジトリ: `/Users/riokominato/src/workspace-ui-kit`

---

## ペイン構成

### PC レイアウト（2ペイン構成）

```
[Pane1: 本棚 Sidebar] [Pane2: セッション一覧] [Pane3: セッション詳細 | AIフィードバック（タブ切り替え）]
```

- Pane1: Sidebar（collapsible="icon", 200px↔48px）、上部に検索インプット（⌘K対応）とステータスフィルタ
- Pane2: セッション一覧（前回まとめカードはPane3上部に移動）
- Pane3: セッション詳細 と AIフィードバック をタブで切り替え（常時4ペイン表示による幅不足を解消）

> **設計変更の理由（UIレビュー指摘）**: 1280px画面で4ペイン横並びにすると各ペイン約360pxしかなく、AIレスポンスや引用テキストが読みにくい。AIフィードバックは頻度が低い操作のため独立ペインの常時占有はスペースの無駄。

### スマホ レイアウト（ボトムナビゲーション 3タブ）

```
[本棚タブ] [セッションタブ] [AIタブ]
```

- ボトムナビゲーションで3タブを切り替え
- セッション詳細へはモーダルシートまたはスタックナビゲーションで遷移（1タップで戻れる）
- `activePane` はURLの search params で管理（`?pane=sessions` 等）してブラウザバックを有効化

> **設計変更の理由（UIレビュー指摘）**: 4ペイン遷移設計はPane4→Pane1に戻るまで3タップ必要でナビゲーション地獄になる。

---

## 各ペインの詳細

### Pane1: 本棚

- 本の一覧を表示
- ステータス: 読書中 / 読了 / 積読
  - バッジ色: 読書中=primary紺青 / 読了=深緑 / 積読=warm ochre（積読をネガティブに見せない）
- 上部に常時表示の検索インプット（⌘K対応）とステータスフィルタチップ
- 本の登録: 手動入力（タイトル・著者・媒体・総ページ数）
- 将来的な拡張候補: ISBN検索での自動取得（初期スコープ外）

### Pane2: セッション一覧

セッションの時系列一覧のみ（前回まとめカードはPane3上部へ移動）。

```
┌──────────────────────────────┐
│ セッション一覧                  │
│ ・7/1  p.80〜120  感想の冒頭...  │
│ ・6/28 p.50〜80   感想の冒頭...  │
│ ・6/25 p.1〜50    感想の冒頭...  │
│                               │
│ [＋ 今日のセッションを追加]      │
└──────────────────────────────┘
```

- セッションは日付単位で区切る
- 各セッション行に感想の冒頭プレビューを表示
- 「＋ 今日のセッションを追加」ボタンを目立つ位置に配置

### Pane3: セッション詳細（タブ1）

本を選択した直後、セッションがなければ「今日のセッションを開始」という空状態CTAを大きく表示する。

```
┌──────────────────────────────┐
│ 📖 前回（6/28）のまとめ         │  ← Pane3上部に移動
│ 感想の冒頭プレビュー...          │
│ [AIにおさらいを作ってもらう]     │
├──────────────────────────────┤
│ 読んだ日付（自動入力）           │
│ 読書媒体に応じた進捗入力         │  ← 紙: ページ範囲 / Kindle: 位置No or %
│ 印象的な一文（複数入力可）        │
│ その日の一言感想                │
└──────────────────────────────┘
```

- 読んだ日付（自動入力）
- 印象的な一文（複数入力可）
- その日の一言感想
- 読んだ進捗（媒体に応じて表示が変わる）
- インライン編集: Blur時に自動保存 + トースト通知で確認
- セッションの編集・削除: 右クリック（PC）/ 長押し（モバイル）でコンテキストメニュー → 削除は確認ダイアログ必須

### Pane3: AIフィードバック（タブ2）

- 手動リクエスト方式（ボタンを押したときだけAPI呼び出し）
- モード1: **今日のフィードバック** — そのセッションの感想へのコメント・励まし
- モード2: **おさらい生成** — ここまでの全セッションを元に読んだ内容を要約
- モード3: **読了後の総評** — 本全体を振り返ったフィードバック
- AIResponseCard の3状態を必ず実装:
  - ローディング: skeleton（Vercelコールドスタート遅延で2〜3秒想定）
  - エラー: 「生成に失敗しました。再試行する」
  - 空状態: 「まだセッションがありません」
- 使用モデル: Gemini 2.0 Flash（Google AI Studio、無料枠 1日1,500リクエスト）

---

## カラートークン設計

`globals.css` の `@theme inline` ブロックに以下を追加。既存トークンを最大限再利用し、新規は2つのみ。

| トークン | 値 | 用途 |
|---------|-----|------|
| `--color-background` | oklch warm off-white | ページ背景 |
| `--color-card` | white | カード背景 |
| `--color-primary` | oklch(0.37 0.06 258) 紺青 | 見出し・選択・ユーザー入力の引用ボーダー |
| `--color-ai-surface` | amber系 | AI生成コンテンツカード背景（新規追加） |
| badge-reading | primary紺青 | 読書中バッジ |
| badge-done | 深緑 oklch(0.45 0.12 145) | 読了バッジ |
| badge-unread | warm ochre #d97706 | 積読バッジ（前向きなニュアンス） |

> **変更の理由（UIレビュー指摘）**: 紺青・紫・amberの3系統はアクセントが競合する。「ユーザーが書いた情報=紺青系」「AI生成コンテンツ=amber系」に整理し、紫は廃止。

### タイポグラフィスケール（最低限定義）

| 用途 | クラス |
|------|--------|
| ペイン見出し | `text-sm font-semibold tracking-wide uppercase text-muted-foreground` |
| 主要コンテンツ | `text-base` |
| メタ情報（日付・ページ数） | `text-xs text-muted-foreground` |

---

## データ設計（Neon / PostgreSQL）

### テーブル構成

```sql
-- 本
books (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'want_to_read', -- 'reading' | 'done' | 'want_to_read'
  medium      TEXT NOT NULL DEFAULT 'paper',        -- 'paper' | 'kindle'
  total_pages INT,             -- 進捗率計算用（任意）
  isbn        TEXT,            -- 将来的なISBN検索拡張用
  cover_url   TEXT,            -- 表紙画像URL
  started_at  DATE,            -- 読み始めた日（created_atと分離）
  finished_at DATE,            -- 読了日
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
)

-- 読書セッション
sessions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id         TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_type   TEXT NOT NULL DEFAULT 'page', -- 'page' | 'location' | 'percent' | 'chapter'
  progress_from   REAL,         -- INTでなくREALにしてパーセント対応
  progress_to     REAL,
  progress_note   TEXT,         -- 「第3章まで」などの補足（任意）
  impression      TEXT,         -- 一言感想
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

-- 印象的な一文
quotes (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, -- 追加
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,      -- NULL許容に変更
  text       TEXT NOT NULL,
  page_no    REAL,             -- 引用元ページ（任意）
  source     TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'kindle_import'（拡張用）
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

> **変更の理由（エンジニアレビュー指摘）**:
> - `page_from/to` INT型: KindleはlocationNo、電子書籍はパーセント進捗で表現できない → REAL型 + `progress_type` で柔軟化
> - `books` テーブル: 進捗率計算に `total_pages`、媒体判定に `medium`、読書期間管理に `started_at/finished_at` が必要
> - `quotes.session_id`: 本に直接紐づけたい引用のために `book_id` を追加し `session_id` をNULL許容に変更
> - `quotes.source`: Kindleハイライトインポートの将来拡張に備えてフィールドを追加

---

## 認証

- Auth.js v5（旧NextAuth.js v5）+ Google Provider
- App RouterのServer Actionsとネイティブ統合
- 許可メールアドレスを環境変数（`ALLOWED_EMAIL`）で管理

```ts
// auth.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  callbacks: {
    signIn({ user }) {
      return user.email === process.env.ALLOWED_EMAIL;
    },
  },
});
```

---

## セキュリティ方針

- **`/api/feedback` は必ず認証ガードを入れる**（デプロイした瞬間エンドポイントが公開されるため）

```ts
// app/api/feedback/route.ts
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });
  // ...Gemini呼び出し
}
```

- **`GEMINI_API_KEY` は `NEXT_PUBLIC_` プレフィックスを絶対につけない**（Route Handler内のみで使用）
- Drizzle + `drizzle-orm/neon-http` のHTTPドライバを使うことでServerless Functionのコネクション上限問題を回避
- 入力値バリデーションは `zod` でスキーマを定義し、Route HandlerとServer Actionsで共用

---

## コンポーネント構成

```
app/
  page.tsx                       ← Server Component（DBフェッチ or mockデータ渡し）
  _components/
    ReadingWorkspace.tsx          ← Client Component（useReducer + Context で状態管理）
    BookshelfPane.tsx             ← Sidebar（検索・フィルタ含む）
    SessionListPane.tsx           ← セッション一覧
    SessionDetailPane.tsx         ← セッション詳細（QuoteList + ImpressionField）
    AIFeedbackPane.tsx            ← AIフィードバック（3モード + AIResponseCard）
    GlobalHeader.tsx
    AddBookDialog.tsx
    DeleteConfirmDialog.tsx
  primitives/
    StatusBadge.tsx
    AIResponseCard.tsx            ← loading / error / empty / response の4状態
```

**状態管理方針**

`useReducer` + `Context` でWorkspace内にローカルstoreを構築（外部ライブラリ不要）。

```ts
type WorkspaceState = {
  selectedBookId: string | null;
  selectedSessionId: string | null;
  activePane: 'bookshelf' | 'sessions' | 'detail' | 'ai'; // モバイル用
};
type WorkspaceAction =
  | { type: 'SELECT_BOOK'; bookId: string }
  | { type: 'SELECT_SESSION'; sessionId: string }
  | { type: 'SET_PANE'; pane: WorkspaceState['activePane'] };
```

> **変更の理由（エンジニアレビュー指摘）**: props drilling でコールバックが雪だるま式に増えるのを防ぐ。

---

## 実装優先順位

**方針: まず完成形の見た目（UI）を作り、その後データとロジックを繋ぐ**

### フェーズ1: UIの骨格（モックデータで動かす）

1. Next.jsプロジェクト作成（workspace-ui-kitをベースに構成を流用）
2. `globals.css` にカラートークン追加（`--color-ai-surface`）
3. `lib/types.ts` に Book / Session / Quote 型定義
4. `lib/mock-data.ts` にモックデータ（**フェーズ2でDB呼び出しに差し替えるだけにするため抽象化**）
5. `app/page.tsx`（Server Component）→ `ReadingWorkspace.tsx`（Client Component）の構造を最初から作る
6. BookshelfPane（Sidebar、検索・フィルタ）
7. SessionListPane（新規セッション追加CTA含む）
8. SessionDetailPane（空状態CTA、QuoteList、InlineTextarea、セッション削除）
9. AIFeedbackPane（3モードボタン + AIResponseCard 4状態）
10. スマホ対応（ボトムナビ3タブ、`?pane=` URLパラメータ）

### フェーズ2: 認証（DBより先に実装する）

11. Auth.js v5 セットアップ（Google Provider）
12. `callbacks.signIn` でメールアドレス制限
13. 認証ミドルウェアで全ルートを保護
14. **認証が完成してからVercelにデプロイ**（未認証状態でのデプロイ禁止）

### フェーズ3: データベース接続

15. Neonプロジェクト作成・スキーマ定義（上記DDL）
16. Drizzle ORM セットアップ（`drizzle-orm/neon-http`）
17. `drizzle-kit` でマイグレーション（挙動を事前確認すること）
18. `lib/mock-data.ts` をDB呼び出しに差し替え
19. Server Actionsで本の登録・セッションCRUD実装

### フェーズ4: AI機能

20. Gemini API（Google AI Studio）キー取得・設定
21. `/api/feedback` Route Handler実装（認証ガード必須・`GEMINI_API_KEY` はサーバーのみ）
22. ストリーミングレスポンス対応
23. おさらい生成・読了後総評の実装

### フェーズ5: 仕上げ

24. Zodバリデーションスキーマを `lib/schemas.ts` に集約（Route Handler・Server Actions共用）
25. エラーハンドリング・トースト通知の整備
26. 本番デプロイ確認

---

## 未決事項（実装しながら決めてOK）

- AIへのプロンプト設計（口調、フィードバックの具体的な内容）
- `progress_type` 別の入力UI詳細（Kindle位置Noの入力形式）
- 本の登録時に表紙画像を入れるか（ISBN検索拡張）
- セッション詳細とAIフィードバックのタブ切り替えのデフォルト表示
