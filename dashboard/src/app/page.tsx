import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LoginButton from "@/components/LoginButton";
import ThemeToggle from "@/components/ThemeToggle";
import { 
  Ticket, 
  Mic, 
  Shield, 
  MessageSquare, 
  Zap, 
  Settings 
} from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-4">
      <div className="absolute left-6 top-6">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#5865F2] text-2xl font-bold text-white">
          Z
        </div>
        <h1 className="text-4xl font-bold sm:text-5xl text-[#F0F0F0]">
          لوحة تحكم البوت
        </h1>
        <p className="max-w-lg text-lg text-[#9CA3AF]">
          تحكّل كامل بجميع ميزات بوتك: التذاكر، الرومات الصوتية، الحماية، المستويات، والمزيد
        </p>
      </div>

      <LoginButton />

      <div className="grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { icon: Ticket, label: "نظام تذاكر" },
          { icon: Mic, label: "رومات صوتية" },
          { icon: Shield, label: "حماية متقدمة" },
          { icon: Zap, label: "نظام مستويات" },
          { icon: MessageSquare, label: "ترحيب ومغادرة" },
          { icon: Settings, label: "تحكم كامل" }
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="card !p-4 flex flex-col items-center gap-2 text-center">
              <Icon className="h-5 w-5 text-[#9CA3AF]" />
              <span className="text-sm font-medium text-[#9CA3AF]">{f.label}</span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
