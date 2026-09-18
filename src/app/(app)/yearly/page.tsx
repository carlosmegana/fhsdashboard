import DashboardCard from "@/components/DashboardCard";
import ItemList from "@/components/ItemList";
import LifeVisionCard from "@/components/LifeVisionCard";
import PageHeader from "@/components/PageHeader";

// Quarterly & Yearly: writes the life vision and the goal ladder. The
// quarter rung is what Monthly reads; the year rung is read there too.
export default function YearlyPage() {
  return (
    <>
      <PageHeader
        title="Quarterly & Yearly"
        subtitle="Lo que revisas cada trimestre y cada ano."
      />
      <div className="flex flex-col gap-4">
        <DashboardCard title="Vision de Vida" description="Se escribe una vez al ano.">
          <LifeVisionCard />
        </DashboardCard>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DashboardCard title="Metas a 3 Anos" description="Escalera · el escalon largo.">
            <ItemList category="three_year_goals" emptyText="Sin metas a 3 anos todavia." />
          </DashboardCard>
          <DashboardCard title="Metas del Ano" description="Escalera · este ano.">
            <ItemList category="year_goals" emptyText="Sin metas del ano todavia." />
          </DashboardCard>
          <DashboardCard title="Metas del Trimestre" description="Escalera · el trimestre que viene.">
            <ItemList category="quarter_goals" emptyText="Sin metas del trimestre todavia." />
          </DashboardCard>
        </div>
      </div>
    </>
  );
}
