import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "لوحة تحكم البوت",
  description: "لوحة تحكم إدارية متكاملة لبوت الديسكورد",
  icons: {
    icon: "https://raw.githubusercontent.com/xhskabdvjdock/the-z/main/dashboard/public/bot-logo.jpg",
    shortcut: "https://raw.githubusercontent.com/xhskabdvjdock/the-z/main/dashboard/public/bot-logo.jpg",
    apple: "https://raw.githubusercontent.com/xhskabdvjdock/the-z/main/dashboard/public/bot-logo.jpg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
