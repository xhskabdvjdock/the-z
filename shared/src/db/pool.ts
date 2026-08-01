import { Pool, PoolConfig } from "pg";
import fs from "fs";
import path from "path";

let pool: Pool | null = null;

export interface ConnectOptions {
  /** مسار ملف شهادة الجذر (root.crt) المطلوب عند استخدام sslmode=verify-full/verify-ca */
  sslRootCertPath?: string;
}

/**
 * يتصل بقاعدة بيانات PostgreSQL (أو أي قاعدة متوافقة مثل YugabyteDB YSQL) مرة واحدة،
 * ويُعيد نفس الاتصال (Pool) في أي استدعاء لاحق طوال عمر العملية.
 */
export async function connectDatabase(
  connectionString: string,
  options: ConnectOptions = {}
): Promise<Pool> {
  if (pool) return pool;

  let ssl: PoolConfig["ssl"];
  let cleanedConnectionString = connectionString;

  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");

    // For Render and environments with self-signed certs, always allow SSL
    if (sslMode && sslMode !== "disable") {
      const certPath = options.sslRootCertPath ?? process.env.DB_SSL_CA_PATH;
      let ca: string | undefined;
      if (certPath) {
        try {
          ca = fs.readFileSync(path.resolve(certPath)).toString();
        } catch {
          // Certificate file not found, continue without it
        }
      }
      ssl = {
        rejectUnauthorized: false,
        ca
      };
    } else if (!sslMode) {
      // If no SSL mode specified, use SSL with rejectUnauthorized: false for Render
      ssl = {
        rejectUnauthorized: false
      };
    }

    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslrootcert");
    cleanedConnectionString = url.toString();
  } catch {
    // إن تعذّل تحليل السلسلة كرابط URL، استخدمها كما هي بدون أي إعداد SSL إضافي
    // Still set SSL with rejectUnauthorized: false for safety
    ssl = {
      rejectUnauthorized: false
    };
  }

  pool = new Pool({ connectionString: cleanedConnectionString, ssl });

  // فحص فوري للتأكد من صحة بيانات الاتصال قبل إعادة الـ Pool
  await pool.query("SELECT 1");

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error("قاعدة البيانات غير متصلة بعد. تأكد من استدعاء connectDatabase() أولاً.");
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
