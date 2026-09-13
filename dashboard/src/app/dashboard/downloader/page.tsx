import DownloaderClient from "@/components/Downloader";

export default function DownloaderPage({ searchParams }: { searchParams?: { url?: string } }) {
  return <DownloaderClient initialUrl={searchParams?.url ?? ""} />;
}