import swc from "rollup-plugin-swc";
import { defineConfig } from "vitest/config";

// https://stackoverflow.com/questions/68570519/why-cant-reflect-metadata-be-used-in-vite
export default defineConfig({
  plugins: [
    swc({
      jsc: {
        parser: { syntax: "typescript", dynamicImport: true, decorators: true },
        target: "es2021",
        transform: { decoratorMetadata: true },
      },
    }),
  ],
  esbuild: false,
});
