/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['*'], // This allows Image component to work with blob URLs
  },
  env: {
    // Expose environment variable for the API key
    NEXT_PUBLIC_PLANT_ID_API_KEY: process.env.NEXT_PUBLIC_PLANT_ID_API_KEY,
  },
};

module.exports = nextConfig;
