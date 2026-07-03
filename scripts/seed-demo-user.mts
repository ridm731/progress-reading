// 審査員公開用のデモユーザーを作成し、デモデータを投入するスクリプト（本番 Neon に書き込む）
// 実行: npx tsx scripts/seed-demo-user.mts
// 何度実行してもよい（デモユーザーの本を全削除してから入れ直す）
import { readFileSync } from "fs";
import { resolve } from "path";

const envFile = readFileSync(resolve(import.meta.dirname, "../.env.local"), "utf8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z_]+)\s*=\s*["']?(.*?)["']?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { db } = await import("../db/client");
const { users, books, readingSessions, quotes } = await import("../db/schema");
const { eq } = await import("drizzle-orm");

const DEMO_EMAIL = "demo@progress-reading.local";

// デモユーザーを取得（なければ作成）
let [demoUser] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL));
if (!demoUser) {
  [demoUser] = await db
    .insert(users)
    .values({ email: DEMO_EMAIL, name: "デモユーザー" })
    .returning();
  console.log("demo user created");
} else {
  console.log("demo user already exists");
}

// クリーンな状態にしてから投入（books の CASCADE で sessions/quotes も消える）
await db.delete(books).where(eq(books.userId, demoUser.id));

type SessionSeed = {
  sessionDate: string;
  progressType: "page" | "percent";
  progressFrom: string;
  progressTo: string;
  impression: string;
  quotes?: string[];
};

const seeds: Array<{
  book: Omit<typeof books.$inferInsert, "userId">;
  sessions: SessionSeed[];
}> = [
  {
    book: {
      title: "リーダブルコード",
      author: "ダスティン・ボズウェル",
      status: "reading",
      medium: "paper",
      totalPages: 260,
      startedAt: "2026-06-20",
    },
    sessions: [
      {
        sessionDate: "2026-06-20",
        progressType: "page",
        progressFrom: "1",
        progressTo: "45",
        impression: "命名の章。「名前に情報を詰め込む」という考え方が新鮮だった。tmp や retval のような汎用名を避ける理由が腑に落ちた。",
        quotes: ["名前は短いコメントだと思えばいい。"],
      },
      {
        sessionDate: "2026-06-24",
        progressType: "page",
        progressFrom: "45",
        progressTo: "98",
        impression: "コメントの章。「コードからすぐわかることをコメントに書かない」を自分のコードで早速やってしまっていることに気づいた。",
        quotes: ["優れたコード > ひどいコード + 優れたコメント"],
      },
      {
        sessionDate: "2026-07-01",
        progressType: "page",
        progressFrom: "98",
        progressTo: "152",
        impression: "制御フローの章。条件式の並び順やネストを浅くする話。ガード節はすでに使っていたが、do-while を避ける理由は考えたことがなかった。",
      },
    ],
  },
  {
    book: {
      title: "ハッカーと画家",
      author: "ポール・グレアム",
      status: "reading",
      medium: "kindle",
      totalPages: null,
      startedAt: "2026-06-25",
    },
    sessions: [
      {
        sessionDate: "2026-06-25",
        progressType: "percent",
        progressFrom: "0",
        progressTo: "18",
        impression: "オタクがなぜモテないかの章から。学校という閉じた社会の分析が面白い。",
      },
      {
        sessionDate: "2026-06-30",
        progressType: "percent",
        progressFrom: "18",
        progressTo: "42",
        impression: "富の作り方の章。スタートアップは圧縮された労働という見方。",
        quotes: ["富は作り出せる。そしてそれはゼロサムゲームではない。"],
      },
    ],
  },
  {
    book: {
      title: "銃・病原菌・鉄（上）",
      author: "ジャレド・ダイアモンド",
      status: "done",
      medium: "paper",
      totalPages: 420,
      startedAt: "2026-05-10",
      finishedAt: "2026-06-15",
    },
    sessions: [
      {
        sessionDate: "2026-06-10",
        progressType: "page",
        progressFrom: "300",
        progressTo: "380",
        impression: "文字の発明の章。シュメールとメソアメリカで独立に発明されたという事実に驚く。",
      },
      {
        sessionDate: "2026-06-15",
        progressType: "page",
        progressFrom: "380",
        progressTo: "420",
        impression: "上巻読了。大陸の軸の向きが伝播速度を決めるという主張が本書の核だと理解した。",
        quotes: ["歴史は、異なる人びとによって異なる経路をたどったが、それは人びとのおかれた環境の差異によるものであって、人びとの生物学的な差異によるものではない。"],
      },
    ],
  },
  {
    book: {
      title: "思考の整理学",
      author: "外山滋比古",
      status: "want_to_read",
      medium: "paper",
      totalPages: 240,
    },
    sessions: [],
  },
];

for (const seed of seeds) {
  const [book] = await db
    .insert(books)
    .values({ ...seed.book, userId: demoUser.id })
    .returning();
  console.log(`book: ${book.title} (${book.status}, sessions: ${seed.sessions.length})`);

  for (const s of seed.sessions) {
    const [session] = await db
      .insert(readingSessions)
      .values({
        bookId: book.id,
        sessionDate: s.sessionDate,
        progressType: s.progressType,
        progressFrom: s.progressFrom,
        progressTo: s.progressTo,
        impression: s.impression,
      })
      .returning();
    if (s.quotes?.length) {
      await db.insert(quotes).values(
        s.quotes.map((text) => ({ bookId: book.id, sessionId: session.id, text })),
      );
    }
  }
}

console.log("");
console.log("done. Vercel に設定する環境変数:");
console.log(`  DEMO_MODE=true`);
console.log(`  DEMO_USER_ID=${demoUser.id}`);
process.exit(0);
