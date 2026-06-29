import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/api/index.ts', 'src/wallet/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: [
    'react', 'react-dom', 'next', 'next/server',
    // Wallet deps — peer dependencies, not bundled
    '@privy-io/react-auth', '@privy-io/wagmi',
    'wagmi', '@wagmi/core', '@wagmi/connectors',
    'viem', '@tanstack/react-query',
    // Node.js-only — kept external so browser bundles don't pull them in
    // Only used by @flowstack/sdk/api entry point (server-side route generators)
    'jsonwebtoken', 'crypto',
  ],
  treeshake: true,
  splitting: false,  // Disable chunk splitting — prevents Node.js code from leaking into browser entry points
  sourcemap: true,
  minify: false,
  outDir: 'dist',
});
