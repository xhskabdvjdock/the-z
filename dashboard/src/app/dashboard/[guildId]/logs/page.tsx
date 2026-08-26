import LogsViewer from "./LogsViewer";

export default function LogsPage({
  params,
}: {
  params: { guildId: string };
}) {
  return <LogsViewer guildId={params.guildId} />;
}