import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [
      // Vercel Blob — fotos de perfil enviadas pelos usuários
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Google OAuth — fotos de perfil do Google
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
