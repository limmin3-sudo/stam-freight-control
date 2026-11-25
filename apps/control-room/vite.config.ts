import { defineConfig,searchForWorkspaceRoot } from 'vite';
import {fileURLToPath} from 'node:url';
import react from '@vitejs/plugin-react';
import {prepareIntroMedia} from './prepare-intro-media.mjs';
import { readFileSync } from 'node:fs';

// Relative assets and hash navigation also work under a GitHub Pages subpath.
// This build is deliberately separate from the current Pages publishing pipeline.
export default defineConfig({
  server:{fs:{allow:[searchForWorkspaceRoot(fileURLToPath(new URL('.',import.meta.url))),fileURLToPath(new URL('../../data',import.meta.url)),fileURLToPath(new URL('../../desktop/theme/optics',import.meta.url))]}},
  plugins: [react(), {
    name: 'stam-intro-media',
    config: prepareIntroMedia,
  }, {
    name: 'stam-font-licenses',
    generateBundle() {
      const source = ['SUIT', 'OXANIUM', 'Pretendard', 'BARLOW', 'BARLOWSEMI', 'ROBOTOCONDENSED'].map(name => `${name}\n\n${readFileSync(new URL(`./src/assets/fonts/${name}-LICENSE.txt`, import.meta.url), 'utf8')}`).join('\n\n');
      this.emitFile({ type: 'asset', fileName: 'font-licenses.txt', source: source + '\n\nMichroma\n\n' + readFileSync(new URL('../../desktop/theme/optics/Michroma-OFL.txt',import.meta.url),'utf8') });
    },
  }],
  resolve: { dedupe: ['three'] },
  base: './',
  // Browser text tracks must remain real VTT files rather than data URIs.
  build: { outDir: 'dist', sourcemap: false, assetsInlineLimit: filePath => filePath.endsWith('.vtt') ? false : undefined },
});
