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
      className={`rounded-2xl border border-orange-100/70 bg-white shadow-sm ${
        fillHeight ? "md:relative" : ""
      } ${className}`}
    >
      <div
        className={`p-5 ${
          fillHeight ? "md:absolute md:inset-0 md:overflow-y-auto" : ""
        }`}
      >
        <h2
          className={`text-sm font-bold uppercase tracking-wide text-stone-500 ${
            description ? "mb-0.5" : "mb-3"
          }`}
        >
          {title}
        </h2>
        {description && (
          <p className="mb-3 text-xs text-stone-400">{description}</p>
        )}
        {children}
      </div>
    </section>
  );
}
