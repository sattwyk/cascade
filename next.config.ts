import type { NextConfig } from 'next';

import { withWorkflow } from 'workflow/next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // cacheComponents: true,
};

export default withWorkflow(nextConfig);
