import { notFound } from "next/navigation";
import { BookChapterStudyClient } from "@/components/book/BookChapterStudyClient";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";
import { getBookChapterStudy } from "@/lib/book/server";

export default async function BookChapterQuizPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const auth = await resolveAuthState();
  if (auth.status !== "ready") return null;

  const { chapterId } = await params;
  const study = await getBookChapterStudy(chapterId, auth.userId);
  if (!study) notFound();

  return <BookChapterStudyClient study={study} initialTab="quiz" />;
}
