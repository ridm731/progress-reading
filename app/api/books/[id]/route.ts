import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/current-user";
import { db } from "@/db/client";
import { books } from "@/db/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, author, medium, totalPages, status, finishedAt } = body;

    const patch: Partial<typeof books.$inferInsert> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "invalid title" }, { status: 400 });
      }
      patch.title = title.trim();
    }
    if (author !== undefined) {
      if (typeof author !== "string" || !author.trim()) {
        return NextResponse.json({ error: "invalid author" }, { status: 400 });
      }
      patch.author = author.trim();
    }
    if (medium !== undefined) {
      if (!["paper", "kindle"].includes(medium)) {
        return NextResponse.json({ error: "invalid medium" }, { status: 400 });
      }
      patch.medium = medium;
    }
    if (totalPages !== undefined) {
      if (totalPages !== null && (!Number.isInteger(totalPages) || totalPages < 1)) {
        return NextResponse.json({ error: "invalid totalPages" }, { status: 400 });
      }
      patch.totalPages = totalPages;
    }
    if (status !== undefined) {
      if (!["reading", "done", "want_to_read"].includes(status)) {
        return NextResponse.json({ error: "invalid status" }, { status: 400 });
      }
      patch.status = status;
      patch.finishedAt = finishedAt ?? null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const [book] = await db
      .update(books)
      .set(patch)
      .where(and(eq(books.id, id), eq(books.userId, userId)))
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // reading_sessions / quotes は ON DELETE CASCADE で一緒に消える
    const [deleted] = await db
      .delete(books)
      .where(and(eq(books.id, id), eq(books.userId, userId)))
      .returning({ id: books.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
