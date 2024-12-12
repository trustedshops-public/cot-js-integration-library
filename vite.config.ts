import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import dts from "vite-plugin-dts";
import fs from "fs";
import path from "path";

export default defineConfig({
  build: {
    minify: true,
    outDir: "dist",
    lib: {
      entry: "src/index.ts",
      name: "cot-integration-library",
      formats: ["es", "umd"],
      fileName: (format) => `cot-integration-library.${format}.js`,
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      treeshake: true,
    },
    reportCompressedSize: false,
  },
  esbuild: {
    legalComments: "none",
  },
  server: {
    port: 5174,
    open: "/index.html",
    host: true,
    https: {
      key: fs.existsSync("certs/localhost-key.pem")
        ? fs.readFileSync("certs/localhost-key.pem")
        : undefined,
      cert: fs.existsSync("certs/localhost.pem")
        ? fs.readFileSync("certs/localhost.pem")
        : undefined,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
