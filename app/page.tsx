import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/current-user";
import { getBooks as getMockBooks } from "@/lib/mock-data";
import { getBooksForUser } from "@/lib/queries/books";
import { ReadingWorkspace } from "@/components/_components/ReadingWorkspace";
import type { BookWithSessions } from "@/lib/types";

// ユーザーごとのデータを毎リクエスト取得する（キャッシュさせない）
export const dynamic = "force-dynamic";

export default async function Page() {
  let books: BookWithSessions[];

  if (process.env.USE_MOCK === "true") {
    books = await getMockBooks();
  } else {
    const userId = await getCurrentUserId();
    if (!userId) redirect("/login");
    books = await getBooksForUser(userId);
  }

  return (
    <Suspense>
      <ReadingWorkspace initialBooks={books} />
    </Suspense>
  );
}
