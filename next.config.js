/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,   // ← must be inside `eslint`
  },
  typescript: {                 // optional, silences TS errors
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
