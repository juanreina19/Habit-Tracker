/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA will be configured via next-pwa or custom service worker
  // For now: standard Next.js config
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
