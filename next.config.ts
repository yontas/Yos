import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import path from 'node:path';

export default function createNextConfig(phase: string): NextConfig {
  return {
    ...(process.env.NEXT_OUTPUT_STANDALONE === 'true' ? { output: 'standalone' as const } : {}),
    outputFileTracingRoot: path.resolve(process.cwd()),
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: false,
    },

    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'picsum.photos',
          port: '',
          pathname: '/**',
        },
      ],
    },
    transpilePackages: ['motion'],
    webpack: (config, { dev }) => {
      if (dev && process.env.DISABLE_HMR === 'true') {
        config.watchOptions = {
          ignored: /.*/,
        };
      } else if (dev) {
        const existingIgnored = config.watchOptions?.ignored;
        const extraIgnored = ['**/data/**', '**/.playwright-cli/**'];
        config.watchOptions = {
          ...config.watchOptions,
          ignored: Array.isArray(existingIgnored)
            ? [...existingIgnored, ...extraIgnored]
            : extraIgnored,
        };
      }
      return config;
    },
  };
}
