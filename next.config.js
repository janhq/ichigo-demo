/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    config.experiments = { ...config.experiments, topLevelAwait: true };
    return config;
  },
};
