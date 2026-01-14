import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SonicUX',
      fileName: 'sonic-ux',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['tone'],
      output: {
        globals: {
          tone: 'Tone'
        }
      }
    },
    target: 'ES2020',
    sourcemap: true
  }
});
