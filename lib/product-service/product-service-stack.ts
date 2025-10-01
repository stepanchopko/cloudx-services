import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new lambda.Function(this, "get-products-list", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "getProductsList.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist")),
    });

    const getProductById = new lambda.Function(this, "get-product-by-id", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "getProductById.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist")),
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
  }
}
