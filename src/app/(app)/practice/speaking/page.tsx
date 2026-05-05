import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SpeakingCoachClient } from "@/components/practice/SpeakingCoachClient";
import { getAuthContext } from "@/lib/auth";
import { getPublishedSpeakingPrompts, getUserSpeakingSubmissions } from "@/lib/speaking/server";

export const metadata: Metadata = {
  title: "Speaking Coach",
  description: "Practice TEF/TCF speaking tasks with AI transcript analysis and pronunciation coaching.",
};

export default async function SpeakingCoachPage() {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect("/auth/login");
  }

  const [prompts, history] = await Promise.all([
    getPublishedSpeakingPrompts(),
    getUserSpeakingSubmissions(user.id),
  ]);

  return (
    <SpeakingCoachClient
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
