import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { WritingCoachClient } from "@/components/practice/WritingCoachClient";
import { getAuthContext } from "@/lib/auth";
import { getPublishedWritingPrompts, getUserWritingSubmissions } from "@/lib/writing/server";

export const metadata: Metadata = {
  title: "Writing Coach",
  description: "Practice TEF/TCF writing tasks with AI-powered correction and CEFR scoring.",
};

export default async function WritingCoachPage() {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect("/auth/login");
  }

  const [prompts, history] = await Promise.all([
    getPublishedWritingPrompts(),
    getUserWritingSubmissions(user.id),
  ]);

  return (
    <WritingCoachClient
      prompts={prompts}
      history={history}
      defaultExamType={normalizeExamType(profile?.target_exam)}
    />
  );
}

function normalizeExamType(value: string | null | undefined) {
  if (value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED") {
    return value;
  }

  return "MIXED" as const;
}
