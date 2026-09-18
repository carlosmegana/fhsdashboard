import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}

// Page title row shared by all four horizon pages and the admin page.
export default function PageHeader({ title, subtitle, aside }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}
