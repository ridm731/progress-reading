import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { readingSessions, quotes } from "@/db/schema";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookId, progressType, progressFrom, progressTo, impression, quoteTexts } = body;

    if (!bookId) {
      return NextResponse.json({ error: "bookId is required" }, { status: 400 });
    }

    const sessionDate = format(new Date(), "yyyy-MM-dd");
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

    if (quoteTexts && quoteTexts.length > 0) {
      await db.insert(quotes).values(
        quoteTexts.map((text: string) => ({ bookId, sessionId: session.id, text })),
      );
    }

    return NextResponse.json({ success: true, sessionId: session.id }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
