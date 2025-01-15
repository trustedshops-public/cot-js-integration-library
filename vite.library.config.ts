import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  build: {
    minify: true,
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
  ],
});
