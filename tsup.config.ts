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
    // P0-150 FR1: mermaid is an OPTIONAL peer dep, loaded via a non-analyzable
    // dynamic import in MermaidDiagram.tsx. Keep it external so neither this build
    // nor a consumer's Rollup tries to resolve it.
    'mermaid',
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
