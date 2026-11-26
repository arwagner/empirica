import { defineConfig } from 'vite'

/** Builds the empirica-api server into one file, with the lab's catalog and every dependency bundled in. */
export default defineConfig({
  publicDir: false,
  build: {
    ssr: 'server/src/main.ts',
    outDir: 'dist-server',
    emptyOutDir: true,
    target: 'node24',
    rollupOptions: { output: { entryFileNames: 'main.mjs' } },
  },
  ssr: { noExternal: true, target: 'node' },
})
