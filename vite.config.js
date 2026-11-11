import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { getBuildInfo } from './scripts/build-info.mjs';

export default defineConfig(async ({ command }) => {
  const buildInfo = await getBuildInfo();
  return {
  define: { __BUILD_INFO__: JSON.stringify(buildInfo), ...(command === 'build' ? { 'process.env.NODE_ENV': JSON.stringify('production') } : {}) },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  plugins: [tailwindcss(), {
    name: 'app-template',
    transformIndexHtml: (html) => html.replace('<!--app-->', readFileSync('src/template.html', 'utf8')),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify(buildInfo, null, 2) + '\n' });
    },
  }],
  build: {
    outDir: 'dist',
    target: 'es2022',
    minify: 'esbuild',
    cssCodeSplit: false,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('"use client"')) return;
        warn(warning);
      },
    },
    lib: {
      entry: 'src/main.jsx',
      name: 'PasswordWorkshop',
      formats: ['iife'],
      fileName: () => 'app.js',
      cssFileName: 'app',
    },
  },
  };
});
