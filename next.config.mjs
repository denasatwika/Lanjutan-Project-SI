import withPWA from "@ducanh2912/next-pwa";

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lavender-obvious-iguana-875.mypinata.cloud",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "*.mypinata.cloud",
        pathname: "/ipfs/**",
      },
    ],
  },
  // Allow access from local network devices (for mobile testing)
  experimental: {
    allowedDevOrigins: [
      "http://192.168.1.31:3000",
      "http://192.168.1.31",
    ],
  },
};

export default withPWA({
  dest: "public",
  disable: false,
  register: true,
  skipWaiting: true,
})(nextConfig);
