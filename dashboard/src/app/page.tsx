import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './api/auth/[...nextauth]/route';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-discord-blurple via-discord-blurple/80 to-discord-not-quite-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center px-4"
      >
        <h1 className="text-5xl font-bold text-white mb-4">Discord Bot Dashboard</h1>
        <p className="text-gray-300 mb-8 text-lg">إدارة بوت الديسكورد الخاص بك بسهولة</p>
        <a href="/api/auth/signin">
          <Button variant="primary" size="lg" className="text-lg px-8 py-4">
            تسجيل الدخول بـ Discord
          </Button>
        </a>
      </motion.div>
    </div>
  );
}
