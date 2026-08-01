import { requireSession } from "@/lib/guildAccess";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#2A2D37] bg-[#090A0F] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5865F2] text-sm font-bold text-white">
            Z
          </div>
          <span className="text-base font-semibold text-[#F0F0F0]">لوحة التحكم</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg bg-[#1A1C23] border border-[#2A2D37]">
            <span className="text-sm font-medium text-[#F0F0F0]">{session.user?.name}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
