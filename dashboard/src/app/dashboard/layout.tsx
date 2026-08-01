import Image from "next/image";
import { requireSession } from "@/lib/guildAccess";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
        <a href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            🤖
          </span>
          <span>لوحة التحكم</span>
        </a>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "user"}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <span className="hidden text-sm font-medium sm:inline">{session.user?.name}</span>
          <LogoutButton />
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
