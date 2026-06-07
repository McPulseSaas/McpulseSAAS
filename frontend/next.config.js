/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/McpulseSAAS',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}
module.exports = nextConfig
