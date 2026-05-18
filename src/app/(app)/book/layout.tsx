import { FeatureDisabled } from "@/components/FeatureDisabled";
import { isPdfBookFeatureEnabled } from "@/lib/features";

export default function BookFeatureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isPdfBookFeatureEnabled()) {
    return (
      <FeatureDisabled
        title="PDF Book Import is temporarily disabled"
        description="This feature will be rebuilt and the French All-in-One material will be imported again from scratch later."
      />
    );
  }

  return children;
}
