import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { GenerateListeningScriptButton } from "@/components/admin/GenerateListeningScriptButton";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminListeningPage() {
  const records = await listAdminResource("listening");
  const missingAudioCount = records.filter(
    (record: Record<string, unknown>) => !record.audio_url,
  ).length;

  return (
    <div className="space-y-6">
      <GenerateListeningScriptButton />
      {missingAudioCount ? (
        <div className="rounded-[1.5rem] border border-accent-amber/30 bg-accent-amber/10 p-4 text-sm text-accent-amber">
          {missingAudioCount} listening item(s) have no unique audio URL. They will show “Audio not available yet” in practice instead of reusing fallback audio.
        </div>
      ) : null}
      <AdminResourcePageClient resource="listening" initialRecords={records} />
    </div>
  );
}
