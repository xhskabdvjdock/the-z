import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LoginButton from "@/components/LoginButton";
import ThemeToggle from "@/components/ThemeToggle";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-black px-4">
      <div className="absolute left-6 top-6">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800 text-3xl font-bold text-white border border-gray-700">
          Z
        </div>
        <h1 className="text-4xl font-bold sm:text-5xl text-white">
          لوحة تحكم البوت
        </h1>
        <p className="max-w-lg text-lg text-gray-400">
          تحكّم كامل بجميع ميزات بوتك: التذاكر، الرومات الصوتية، الحماية، المستويات، والمزيد
        </p>
      </div>

      <LoginButton />

      <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          "نظام تذاكر",
          "رومات صوتية",
          "حماية متقدمة",
          "نظام مستويات",
          "ترحيب ومغادرة",
          "تحكم كامل"
        ].map((f) => (
          <div key={f} className="card !p-4 text-center text-sm font-medium text-gray-400">
            {f}
          </div>
        ))}
      </div>
    </main>
  );
}
