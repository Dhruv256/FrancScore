import { redirect } from "next/navigation";
import { VocabularyBankClient } from "@/components/vocabulary/VocabularyBankClient";
import { getAuthContext } from "@/lib/auth";
import { getVocabularyBankWords } from "@/lib/live-data/server";

export default async function VocabularyPage() {
  const { user } = await getAuthContext();

  if (!user) {
    redirect("/auth/login");
  }

  const words = await getVocabularyBankWords(user.id);
  return <VocabularyBankClient words={words} />;
}
