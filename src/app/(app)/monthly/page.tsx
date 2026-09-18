import DashboardCard from "@/components/DashboardCard";
import ItemList from "@/components/ItemList";
import PageHeader from "@/components/PageHeader";
import ReadOnlyList from "@/components/ReadOnlyList";
import { ZonesScoreCard } from "@/components/ZonesCard";

// Monthly: reads the quarter and year goals; writes this month's zone scores
// and maintains the permanent root-issues list.
export default function MonthlyPage() {
  return (
    <>
      <PageHeader title="Monthly" subtitle="Lo que revisas una vez al mes." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-4">
          <DashboardCard title="Metas del Trimestre" description="Hacia donde apunta este trimestre.">
            <ReadOnlyList category="quarter_goals" editHref="/yearly" editLabel="Quarterly & Yearly" />
          </DashboardCard>
          <DashboardCard title="Metas del Ano" description="Hacia donde apunta este ano.">
            <ReadOnlyList category="year_goals" editHref="/yearly" editLabel="Quarterly & Yearly" />
          </DashboardCard>
        </div>

        <DashboardCard
          title="7 Zonas"
          description="Puntaje de 1 a 10. Leido como diagnostico: que zona quedo desatendida?"
        >
          <ZonesScoreCard />
        </DashboardCard>

        <DashboardCard
          title="Issues Raiz"
          description="La lista permanente. Se revisa, no se reescribe."
        >
          <ItemList category="root_issues" emptyText="Sin issues raiz todavia." />
        </DashboardCard>
      </div>
    </>
  );
}
