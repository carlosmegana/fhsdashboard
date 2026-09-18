interface DashboardCardProps {
  title: string;
  description?: string;
  className?: string;
  fillHeight?: boolean;
  children: React.ReactNode;
}

export default function DashboardCard({
  title,
  description,
  className = "",
  fillHeight = false,
  children,
}: DashboardCardProps) {
  return (
    <section
      className={`rounded-lg border border-line bg-paper ${
        fillHeight ? "md:relative" : ""
      } ${className}`}
    >
      <div
        className={`p-5 ${
          fillHeight ? "md:absolute md:inset-0 md:overflow-y-auto" : ""
        }`}
      >
        <h2
          className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3 ${
            description ? "mb-0.5" : "mb-3"
          }`}
        >
          {title}
        </h2>
        {description && (
          <p className="mb-3 text-xs text-ink-3">{description}</p>
        )}
        {children}
      </div>
    </section>
  );
}
