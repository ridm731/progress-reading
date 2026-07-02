import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { books, readingSessions } from "@/db/schema";
import { trimProgress } from "@/lib/utils";
import type { BookWithSessions } from "@/lib/types";

export async function getBooksForUser(userId: string): Promise<BookWithSessions[]> {
  const result = await db.query.books.findMany({
    where: eq(books.userId, userId),
    orderBy: [desc(books.updatedAt)],
    with: {
      sessions: {
        orderBy: [desc(readingSessions.sessionDate), desc(readingSessions.createdAt)],
        with: { quotes: true },
      },
    },
  });

  return result.map((book) => ({
    ...book,
    sessions: book.sessions.map((s) => ({
      ...s,
      progressFrom: trimProgress(s.progressFrom),
      progressTo:   trimProgress(s.progressTo),
    })),
  }));
}
