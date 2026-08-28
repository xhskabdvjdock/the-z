import AnalyticsDashboard from "./AnalyticsDashboard";

export default function StatsPage({ params }: { params: { guildId: string } }) {
  return <AnalyticsDashboard guildId={params.guildId} />;
}