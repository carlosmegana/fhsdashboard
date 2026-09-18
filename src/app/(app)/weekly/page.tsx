import DashboardCard from "@/components/DashboardCard";
import ItemList from "@/components/ItemList";
import PageHeader from "@/components/PageHeader";
import ReadOnlyList from "@/components/ReadOnlyList";
import { ZonesReadCard } from "@/components/ZonesCard";
import { periodStartStr } from "@/lib/date";

// Weekly: reads this month's goals and the last zone scores; writes this
// week's friction. The week is anchored to its Monday (local time).
export default function WeeklyPage() {
  const weekStart = periodStartStr("weekly");

  return (
    <>
      <PageHeader title="Weekly" subtitle="Lo que revisas una vez por semana." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DashboardCard title="Metas del Mes" description="Lo que este mes tiene que lograr.">
          <ReadOnlyList category="metas" editHref="/" editLabel="Daily" />
        </DashboardCard>

        <DashboardCard title="7 Zonas" description="Como quedo cada zona en el ultimo puntaje.">
          <ZonesReadCard />
        </DashboardCard>

        <DashboardCard
          title="Friccion"
          description="Que se interpuso esta semana. Superficial, desechable, materia prima."
        >
          <ItemList
            category="friction"
            weekStart={weekStart}
            emptyText="Sin friccion esta semana. Agrega lo que se interpuso."
          />
        </DashboardCard>
      </div>
    </>
  );
}
