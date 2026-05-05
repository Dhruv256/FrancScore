import { redirect } from "next/navigation";
import { BadgesPageClient } from "@/components/badges/BadgesPageClient";
import { getAuthContext } from "@/lib/auth";
import { syncUserBadges } from "@/lib/gamification/badges";

export default async function BadgesPage() {
  const { user } = await getAuthContext();

  if (!user) {
    redirect("/auth/login");
  }

  const badges = await syncUserBadges(user.id);
  return <BadgesPageClient badges={badges} />;
}
