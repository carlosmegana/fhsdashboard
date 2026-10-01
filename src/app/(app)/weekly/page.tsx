import DashboardCard from "@/components/DashboardCard";
import ItemList from "@/components/ItemList";
import PageHeader from "@/components/PageHeader";
import ReadOnlyList from "@/components/ReadOnlyList";
import { ZonesReadCard } from "@/components/ZonesCard";

// Weekly: reads this month's goals and the last zone scores. Creencias is one
// shared list, editable here and on Monthly until its final home is decided.
export default function WeeklyPage() {
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
          title="Creencias"
          description="Las ideas que guian como actuas. Identifica y refuerza las que te sirven."
        >
          <ItemList category="beliefs" emptyText="Sin creencias todavia." />
        </DashboardCard>
      </div>
    </>
  );
}
