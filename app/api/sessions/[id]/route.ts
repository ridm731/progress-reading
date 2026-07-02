import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { readingSessions, quotes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { progressType, progressFrom, progressTo, impression, quoteTexts, bookId } = body;

    const [session] = await db
      .update(readingSessions)
      .set({
        progressType: progressType ?? "page",
        progressFrom: progressFrom ? String(progressFrom) : null,
        progressTo:   progressTo   ? String(progressTo)   : null,
        impression:   impression   ?? null,
      })
      .where(eq(readingSessions.id, id))
      .returning();

    let savedQuotes: (typeof quotes.$inferSelect)[] = [];
    if (quoteTexts !== undefined && bookId) {
      await db.delete(quotes).where(eq(quotes.sessionId, id));
      if (quoteTexts.length > 0) {
        savedQuotes = await db
          .insert(quotes)
          .values(quoteTexts.map((text: string) => ({ bookId, sessionId: id, text })))
          .returning();
      }
    }

    return NextResponse.json({ success: true, session: { ...session, quotes: savedQuotes } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.delete(quotes).where(eq(quotes.sessionId, id));
    await db.delete(readingSessions).where(eq(readingSessions.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
