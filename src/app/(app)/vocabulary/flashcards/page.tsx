import { FlashcardsPageClient } from "@/components/flashcards/FlashcardsPageClient";
import { getAuthContext } from "@/lib/auth";

export default async function FlashcardsPage() {
  const { profile } = await getAuthContext();

  return (
    <FlashcardsPageClient defaultExamType={normalizeExamFilter(profile?.target_exam)} />
  );
}

function normalizeExamFilter(value: string | null | undefined) {
  if (value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED") {
    return value;
  }

  return "ALL" as const;
}
