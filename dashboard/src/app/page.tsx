import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LoginButton from "@/components/LoginButton";
import ThemeToggle from "@/components/ThemeToggle";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-4">
      <div className="absolute left-6 top-6">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl font-bold text-white shadow-2xl shadow-indigo-500/40">
          Z
        </div>
        <h1 className="text-5xl font-bold sm:text-6xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          لوحة تحكم البوت
        </h1>
        <p className="max-w-lg text-xl text-slate-400">
          تحكّل كامل بجميع ميزات بوتك: التذاكر، الرومات الصوتية، الحماية، المستويات، والمزيد
        </p>
      </div>

      <LoginButton />

      <div className="grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-3">
        {[
          "نظام تذاكر",
          "رومات صوتية",
          "حماية متقدمة",
          "نظام مستويات",
          "ترحيب ومغادرة",
          "تحكم كامل"
        ].map((f) => (
          <div key={f} className="card !p-6 text-center text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
            {f}
          </div>
        ))}
      </div>
    </main>
  );
}
