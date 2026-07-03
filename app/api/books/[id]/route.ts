import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { books } from "@/db/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, finishedAt } = body;

    if (!["reading", "done", "want_to_read"].includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const [book] = await db
      .update(books)
      .set({ status, finishedAt: finishedAt ?? null })
      .where(and(eq(books.id, id), eq(books.userId, session.user.id)))
      .returning();

    if (!book) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, book });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
