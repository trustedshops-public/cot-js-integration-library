import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  build: {
    minify: "esbuild",
    outDir: "dist",
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "index",
      formats: ["es", "umd"],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      treeshake: true,
    },
    reportCompressedSize: false,
    sourcemap: true,
  },
  esbuild: {
    legalComments: "none",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: ["package.json", "README.md"],
          dest: "./",
        },
      ],
    }),
    dts({ rollupTypes: true }),
    nodePolyfills(),
  ],
});
