import * as cdk from "aws-cdk-lib";
import { ProductServiceStack } from "../lib/product-service/product-service-stack.js";
import { ImportServiceStack } from "../lib/product-service/import-service-stack.js";
import { AuthorizerServiceStack } from "../lib/product-service/authorization-service-stack.js";

const app = new cdk.App();

const productsStack = new ProductServiceStack(app, "ProductServiceStack");

new AuthorizerServiceStack(app, "AuthorizerServiceStack");

const importStack = new ImportServiceStack(app, "ImportServiceStack", {
  catalogItemsQueue: productsStack.catalogItemsQueue,
});

importStack.addDependency(productsStack);
