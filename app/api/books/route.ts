import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { books } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, author, medium, totalPages } = body;

    if (!title || !author) {
      return NextResponse.json({ error: "title and author are required" }, { status: 400 });
    }

    const [book] = await db
      .insert(books)
      .values({
        userId:     session.user.id,
        title,
        author,
        medium:     medium ?? "paper",
        totalPages: totalPages ?? null,
      })
      .returning();

    return NextResponse.json({ success: true, book }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
