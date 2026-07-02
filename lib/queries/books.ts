import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { books, readingSessions } from "@/db/schema";
import type { BookWithSessions } from "@/lib/types";

export async function getBooksForUser(userId: string): Promise<BookWithSessions[]> {
  return db.query.books.findMany({
    where: eq(books.userId, userId),
    orderBy: [desc(books.updatedAt)],
    with: {
      sessions: {
        orderBy: [desc(readingSessions.sessionDate), desc(readingSessions.createdAt)],
        with: { quotes: true },
      },
    },
  });
}
