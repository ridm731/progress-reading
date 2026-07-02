import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
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
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    books = await getBooksForUser(session.user.id);
  }

  return (
    <Suspense>
      <ReadingWorkspace initialBooks={books} />
    </Suspense>
  );
}
