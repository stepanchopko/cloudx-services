import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as dotenv from "dotenv";
import { Construct } from "constructs";

export class AuthorizerServiceStack extends cdk.Stack {
  public readonly basicAuthorizer: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const envConfig = dotenv.config();

    this.basicAuthorizer = new lambda.Function(this, "BasicAuthorizer", {
      functionName: "basicAuthorizer",
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "basicAuthorizer.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist")),
      environment: {
        ...(envConfig.parsed || {}),
      },
    });

    new cdk.CfnOutput(this, "BasicAuthorizerLambdaArn", {
      value: this.basicAuthorizer.functionArn,
      exportName: "BasicAuthorizerLambdaArn",
    });
  }
}
