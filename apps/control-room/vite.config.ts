import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Relative assets and hash navigation also work under a GitHub Pages subpath.
// This build is deliberately separate from the current Pages publishing pipeline.
export default defineConfig({
  plugins: [react(), {
    name: 'stam-font-licenses',
    generateBundle() {
      const source = ['SUIT', 'OXANIUM', 'Pretendard', 'BARLOW', 'BARLOWSEMI', 'ROBOTOCONDENSED'].map(name => `${name}\n\n${readFileSync(new URL(`./src/assets/fonts/${name}-LICENSE.txt`, import.meta.url), 'utf8')}`).join('\n\n');
      this.emitFile({ type: 'asset', fileName: 'font-licenses.txt', source });
    },
  }],
  resolve: { dedupe: ['three'] },
  base: './',
  // Browser text tracks must remain real VTT files rather than data URIs.
  build: { outDir: 'dist', sourcemap: false, assetsInlineLimit: filePath => filePath.endsWith('.vtt') ? false : undefined },
});
