/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // pdf-parse を externals に追加（Next.js 14.2 互換）
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdf-parse');
    }
    return config;
  },
};

export default nextConfig;
