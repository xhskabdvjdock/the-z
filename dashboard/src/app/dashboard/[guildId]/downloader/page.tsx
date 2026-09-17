import DownloaderClient from "@/components/Downloader";

export default function DownloaderPage({
  searchParams
}: {
  searchParams?: { url?: string; sig?: string };
}) {
  return <DownloaderClient initialUrl={searchParams?.url ?? ""} initialSig={searchParams?.sig ?? ""} />;
}
