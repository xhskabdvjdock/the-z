import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LoginButton from "@/components/LoginButton";
import ThemeToggle from "@/components/ThemeToggle";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-brand/5 via-transparent to-transparent px-4">
      <div className="absolute left-4 top-4">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-2xl font-bold text-white shadow-lg shadow-brand/20">
          Z
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl text-slate-900 dark:text-slate-100">لوحة تحكم البوت</h1>
        <p className="max-w-md text-slate-600 dark:text-slate-400">
          تحكّم كامل بجميع ميزات بوتك: التذاكر، الرومات الصوتية، الحماية، المستويات، والمزيد
        </p>
      </div>

      <LoginButton />

      <div className="grid max-w-2xl grid-cols-2 gap-3 text-sm text-slate-500 sm:grid-cols-3 dark:text-slate-400">
        {[
          "نظام تذاكر",
          "رومات صوتية",
          "حماية متقدمة",
          "نظام مستويات",
          "ترحيب ومغادرة",
          "تحكم كامل"
        ].map((f) => (
          <div key={f} className="card !p-3 text-center">
            {f}
          </div>
        ))}
      </div>
    </main>
  );
}
