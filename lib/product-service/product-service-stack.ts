import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

import { products } from "./mock-data/products.js";
import { stock } from "./mock-data/stock.js";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = new dynamodb.Table(this, "Products", {
      tableName: "Products",
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const stockTable = new dynamodb.Table(this, "Stock", {
      tableName: "Stock",
      partitionKey: {
        name: "product_id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const getProductsList = new lambda.Function(this, "get-products-list", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "getProductsList.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist")),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      },
    });

    const getProductById = new lambda.Function(this, "get-product-by-id", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "getProductById.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist")),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      },
    });

    // Dynamically seed mock data into 'products' table
    products.forEach((product, index) => {
      new cdk.custom_resources.AwsCustomResource(this, `SeedProduct${index}`, {
        onCreate: {
          service: "DynamoDB",
          action: "putItem",
          parameters: {
            TableName: productsTable.tableName,
            Item: {
              id: { S: product.id },
              title: { S: product.title },
              description: { S: product.description },
              price: { N: product.price.toString() },
            },
          },
          physicalResourceId: cdk.custom_resources.PhysicalResourceId.of(
            `Product-${product.id}`
          ),
        },
        policy: cdk.custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [productsTable.tableArn],
        }),
      });
    });

    // Dynamically seed mock data into 'stock' table
    stock.forEach((stockItem, index) => {
      new cdk.custom_resources.AwsCustomResource(this, `SeedStock${index}`, {
        onCreate: {
          service: "DynamoDB",
          action: "putItem",
          parameters: {
            TableName: stockTable.tableName,
            Item: {
              product_id: { S: stockItem.product_id },
              count: { N: stockItem.count.toString() },
            },
          },
          physicalResourceId: cdk.custom_resources.PhysicalResourceId.of(
            `Stock-${stockItem.product_id}`
          ),
        },
        policy: cdk.custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [stockTable.tableArn],
        }),
      });
    });

    const api = new apigateway.RestApi(this, "product-service-api", {
      restApiName: "Product Service Gateway",
      description: "This API serves the Lambda functions",
    });

    const productListLambdaIntegration = new apigateway.LambdaIntegration(
      getProductsList,
      {}
    );

    const productByIdLambdaIntegration = new apigateway.LambdaIntegration(
      getProductById,
      {}
    );

    const productResource = api.root.addResource("products");
    productResource.addMethod("GET", productListLambdaIntegration);

    const helloUserResource = productResource.addResource("{product_id}");
    helloUserResource.addMethod("GET", productByIdLambdaIntegration);

    productsTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductsList);

    productsTable.grantReadData(getProductById);
    stockTable.grantReadData(getProductById);
  }
}
