import Link from "next/link";

export function FeatureDisabled({
  title = "PDF Book Import is temporarily disabled",
  description = "This feature will be rebuilt and imported from scratch later.",
  href = "/dashboard",
  cta = "Return to dashboard",
}: {
  title?: string;
  description?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4">
      <div className="card-soft rounded-[2rem] p-8 text-center">
        <p className="page-kicker justify-center">Feature disabled</p>
        <h1 className="mt-3 text-3xl font-black text-text-primary">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">{description}</p>
        <Link href={href} className="btn btn-primary mt-6">
          {cta}
        </Link>
      </div>
    </div>
  );
}
