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
        hostname: "*.mypinata.cloud", // Allow all Pinata subdomains
        pathname: "/ipfs/**",
      },
    ],
  },
};

export default withPWA({
  dest: "public",
  disable: false, // Enable PWA even in development for mobile testing
  register: true,
  skipWaiting: true,
})(nextConfig);
