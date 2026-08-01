/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "media.discordapp.net" }
    ]
  },
  transpilePackages: ["@thez/shared"]
};

module.exports = nextConfig;
