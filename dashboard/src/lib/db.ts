import { connectDatabase } from "@thez/shared";

/** يضمن الاتصال بقاعدة البيانات مرة واحدة قبل أي عملية قراءة/كتابة في صفحات أو أفعال السيرفر */
export async function ensureDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("متغير البيئة DATABASE_URL غير مُعرَّف في dashboard/.env.local");
  }
  await connectDatabase(url, { sslRootCertPath: process.env.DB_SSL_CA_PATH || undefined });
}
