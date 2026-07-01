import type { BookWithSessions } from "./types";

export const MOCK_BOOKS: BookWithSessions[] = [
  {
    id: "book-1",
    userId: "mock-user-1",
    title: "エッセンシャル思考",
    author: "グレッグ・マキューン",
    status: "reading",
    medium: "paper",
    totalPages: 320,
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
        progressFrom: "80",
        progressTo: "120",
        progressNote: null,
        impression:
          "「より少なく、しかしより良く」という哲学が腑に落ちた。何かを選ぶことは、他の何かを捨てることだという当たり前の事実を改めて意識させられる。",
        createdAt: new Date("2026-07-01"),
        quotes: [
          {
            id: "q-1",
            bookId: "book-1",
            sessionId: "sess-1",
            text: "エッセンシャル思考とは、より多くのことをこなすための方法ではない。正しいことをこなすための方法だ。",
            pageNo: 95,
            source: "manual",
            createdAt: new Date("2026-07-01"),
          },
        ],
      },
      {
        id: "sess-2",
        bookId: "book-1",
        sessionDate: "2026-06-28",
        progressType: "page",
        progressFrom: "50",
        progressTo: "80",
        progressNote: null,
        impression:
          "トレードオフを意識することの重要性を学んだ。全てを「イエス」と言うことは、実は何も選んでいないのと同じだという視点が新鮮だった。",
        createdAt: new Date("2026-06-28"),
        quotes: [
          {
            id: "q-2",
            bookId: "book-1",
            sessionId: "sess-2",
            text: "もし優先事項を選ばないなら、誰かが代わりに選んでくれるだろう。",
            pageNo: 62,
            source: "manual",
            createdAt: new Date("2026-06-28"),
          },
        ],
      },
      {
        id: "sess-3",
        bookId: "book-1",
        sessionDate: "2026-06-25",
        progressType: "page",
        progressFrom: "1",
        progressTo: "50",
        progressNote: null,
        impression:
          "序章から引き込まれた。忙しさを美徳とする現代文化への批判は痛烈で、自分自身の働き方を振り返るきっかけになった。",
        createdAt: new Date("2026-06-25"),
        quotes: [],
      },
    ],
  },
  {
    id: "book-2",
    userId: "mock-user-1",
    title: "DEEP WORK",
    author: "カル・ニューポート",
    status: "done",
    medium: "kindle",
    totalPages: 368,
    isbn: null,
    coverUrl: null,
    startedAt: "2026-05-01",
    finishedAt: "2026-06-15",
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-06-15"),
    sessions: [
      {
        id: "sess-4",
        bookId: "book-2",
        sessionDate: "2026-06-15",
        progressType: "percent",
        progressFrom: "80",
        progressTo: "100",
        progressNote: null,
        impression: "後半の実践パートが特に良かった。深い集中のためのルーティン設計を試してみたい。",
        createdAt: new Date("2026-06-15"),
        quotes: [
          {
            id: "q-3",
            bookId: "book-2",
            sessionId: "sess-4",
            text: "深い仕事とは、認知的に困難な課題に集中して取り組む能力だ。",
            pageNo: null,
            source: "manual",
            createdAt: new Date("2026-06-15"),
          },
        ],
      },
    ],
  },
  {
    id: "book-3",
    userId: "mock-user-1",
    title: "ハーモニー",
    author: "伊藤計劃",
    status: "want_to_read",
    medium: "paper",
    totalPages: 314,
    isbn: null,
    coverUrl: null,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date("2026-06-20"),
    updatedAt: new Date("2026-06-20"),
    sessions: [],
  },
  {
    id: "book-4",
    userId: "mock-user-1",
    title: "アトミック・ハビット",
    author: "ジェームズ・クリアー",
    status: "done",
    medium: "paper",
    totalPages: 360,
    isbn: null,
    coverUrl: null,
    startedAt: "2026-04-01",
    finishedAt: "2026-05-10",
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-05-10"),
    sessions: [],
  },
];

export async function getBooks(): Promise<BookWithSessions[]> {
  return MOCK_BOOKS;
}

export async function getBookWithSessions(id: string): Promise<BookWithSessions | undefined> {
  return MOCK_BOOKS.find((b) => b.id === id);
}
