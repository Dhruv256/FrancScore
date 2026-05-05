import { ReadingLabClient } from "@/components/practice/ReadingLabClient";
import { getAuthContext } from "@/lib/auth";

export default async function ReadingLabPage() {
  const { profile } = await getAuthContext();

  return <ReadingLabClient defaultExamType={normalizeExamFilter(profile?.target_exam)} />;
}

function normalizeExamFilter(value: string | null | undefined) {
  if (value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED") {
    return value;
  }

  return "ALL" as const;
}
