import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "lib/product-service/getProductById.ts",
    "lib/product-service/getProductsList.ts",
    "lib/product-service/createProduct.ts",
    "lib/product-service/importProductsFile.ts",
    "lib/product-service/importFileParser.ts",
    "lib/product-service/catalogBatchProcess.ts",
    "lib/product-service/basicAuthorizer.ts",
  ],
  target: "node20",
  splitting: false,
  sourcemap: false,
  clean: true,
  external: ["aws-sdk", "@aws-sdk/client-dynamodb"],
  noExternal: ["csv-parser", "dotenv"],
});
