import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "lib/product-service/getProductById.ts",
    "lib/product-service/getProductsList.ts",
  ],
  target: "node20",
  splitting: false,
  sourcemap: false,
  clean: true,
});
