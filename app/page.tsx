import { Suspense } from "react";
import { getBooks } from "@/lib/mock-data";
import { ReadingWorkspace } from "@/components/_components/ReadingWorkspace";

export default async function Page() {
  const books = await getBooks();
  return (
    <Suspense>
      <ReadingWorkspace initialBooks={books} />
    </Suspense>
  );
}
