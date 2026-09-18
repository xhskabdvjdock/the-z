export type Platform = "tiktok" | "instagram" | "twitter";

const ALLOWED_HOSTS: Record<Platform, string[]> = {
  tiktok: ["tiktok.com", "vm.tiktok.com", "vt.tiktok.com", "m.tiktok.com"],
  instagram: ["instagram.com", "instagr.am"],
  twitter: ["twitter.com", "x.com", "t.co", "mobile.twitter.com"]
};

export function detectPlatform(url: string): Platform | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    for (const [platform, hosts] of Object.entries(ALLOWED_HOSTS) as Array<[Platform, string[]]>) {
      if (hosts.some((h) => host === h || host.endsWith(`.${h}`))) return platform;
    }
    return null;
  } catch {
    return null;
  }
}

export function isAllowedUrl(url: string): boolean {
  return detectPlatform(url) !== null;
}

export function validateUrl(url: string): { valid: boolean; error?: string; platform?: Platform } {
  if (!url || typeof url !== "string") return { valid: false, error: "Invalid URL." };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL." };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, error: "Invalid URL." };
  }

  // SSRF protection - block private/internal hosts
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "::" ||
    host.startsWith("[::ffff:") ||
    host.startsWith("169.254.") ||
    host.startsWith("100.64.") ||
    host.startsWith("[fd") ||
    host.startsWith("[fe80") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.16.") ||
    host.startsWith("172.17.") ||
    host.startsWith("172.18.") ||
    host.startsWith("172.19.") ||
    host.startsWith("172.20.") ||
    host.startsWith("172.21.") ||
    host.startsWith("172.22.") ||
    host.startsWith("172.23.") ||
    host.startsWith("172.24.") ||
    host.startsWith("172.25.") ||
    host.startsWith("172.26.") ||
    host.startsWith("172.27.") ||
    host.startsWith("172.28.") ||
    host.startsWith("172.29.") ||
    host.startsWith("172.30.") ||
    host.startsWith("172.31.")
  ) {
    return { valid: false, error: "This platform is not supported." };
  }

  const platform = detectPlatform(url);
  if (!platform) return { valid: false, error: "This platform is not supported." };

  return { valid: true, platform };
}