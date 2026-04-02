/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Ensure leaflet works with SSR disabled on map components
  transpilePackages: ['react-leaflet'],
};

export default nextConfig;
