import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { books, readingSessions, quotes } from "@/db/schema";
import { trimProgress } from "@/lib/utils";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookId, sessionDate: clientDate, progressType, progressFrom, progressTo, impression, quoteTexts } = body;

    if (!bookId) {
      return NextResponse.json({ error: "bookId is required" }, { status: 400 });
    }

    // サーバーは UTC なので日付はクライアント（ユーザーのタイムゾーン）から受け取る
    const sessionDate =
      typeof clientDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)
        ? clientDate
        : format(new Date(), "yyyy-MM-dd");
    const [session] = await db
      .insert(readingSessions)
      .values({
        bookId,
        sessionDate,
        progressType: progressType ?? "page",
        progressFrom: progressFrom ? String(progressFrom) : null,
        progressTo:   progressTo   ? String(progressTo)   : null,
        impression:   impression   ?? null,
      })
      .returning();

    let savedQuotes: (typeof quotes.$inferSelect)[] = [];
    if (quoteTexts && quoteTexts.length > 0) {
      savedQuotes = await db
        .insert(quotes)
        .values(quoteTexts.map((text: string) => ({ bookId, sessionId: session.id, text })))
        .returning();
    }

    // 積読の本にセッションが付いたら読書中に進める
    const [updatedBook] = await db
      .update(books)
      .set({ status: "reading", startedAt: sessionDate })
      .where(and(eq(books.id, bookId), eq(books.status, "want_to_read")))
      .returning();

    return NextResponse.json(
      {
        success: true,
        sessionId: session.id,
        session: {
          ...session,
          progressFrom: trimProgress(session.progressFrom),
          progressTo:   trimProgress(session.progressTo),
          quotes: savedQuotes,
        },
        // 積読→読書中に変わった場合のみ入る
        bookPatch: updatedBook
          ? { status: updatedBook.status, startedAt: updatedBook.startedAt }
          : null,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
