#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ProductServiceStack } from "../lib/product-service/product-service-stack.js";
import { ImportServiceStack } from "../lib/product-service/import-service-stack.js";

const app = new cdk.App();

new ProductServiceStack(app, "ProductServiceStack");
new ImportServiceStack(app, "ImportServiceStack");
