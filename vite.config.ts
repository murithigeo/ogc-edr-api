import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr:true,
    outDir: "dist",
    target: "esnext",
    emptyOutDir: true,
    sourcemap: true,
    // lib: {
    //   formats: ["es"],
    //   entry: "index.ts",
    //   fileName: "index",
    // },
    rollupOptions: {
      input: "index.ts",
      output: { entryFileNames: "index.js" },
    },
  },
});
