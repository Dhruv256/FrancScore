import { ListeningLabClient } from "@/components/practice/ListeningLabClient";
import { getAuthContext } from "@/lib/auth";

export default async function ListeningLabPage() {
  const { profile } = await getAuthContext();

  return <ListeningLabClient defaultExamType={normalizeExamFilter(profile?.target_exam)} />;
}

function normalizeExamFilter(value: string | null | undefined) {
  if (value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED") {
    return value;
  }

  return "ALL" as const;
}
