/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // SSR mode (no static export). Backend proxies / → 127.0.0.1:3001
};
