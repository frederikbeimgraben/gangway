const runtimeCaching = require("next-pwa/cache");

const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
    fallbacks: {
        document: "/offline",
    },
    cacheOnFrontEndNav: true,
    reloadOnOnline: true,
    cacheStartUrl: true,
    dynamicStartUrl: true,
    buildExcludes: [/middleware-manifest\.json$/],
    runtimeCaching,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ["lucide-react"],
};

module.exports = withPWA(nextConfig);
