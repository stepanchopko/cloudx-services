import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { Construct } from "constructs";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importBucket = new s3.Bucket(this, "import-bucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          id: "delete-old-files",
          enabled: true,
          prefix: "uploaded/",
          expiration: cdk.Duration.days(7),
        },
      ],
    });

    new s3deploy.BucketDeployment(this, "deploy-upload-folder", {
      sources: [
        s3deploy.Source.jsonData("uploaded/.keep", { placeholder: true }),
      ],
      destinationBucket: importBucket,
      retainOnDelete: false,
    });

    const importProductsFile = new lambda.Function(
      this,
      "import-products-file",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "importProductsFile.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../../dist")),
        environment: {
          IMPORT_BUCKET_NAME: importBucket.bucketName,
        },
      }
    );

    importBucket.grantPut(importProductsFile);
    importBucket.grantPutAcl(importProductsFile);

    importProductsFile.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:GetObjectAcl",
          "s3:DeleteObject",
          "s3:ListBucket",
        ],
        resources: [importBucket.bucketArn, `${importBucket.bucketArn}/*`],
      })
    );

    const api = new apigateway.RestApi(this, "import-service-api", {
      restApiName: "Import Service Gateway",
      description: "This API serves the import products file lambda",
    });

    const importProductsResource = api.root.addResource("import");

    importProductsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFile)
    );

    const importFileParser = new lambda.Function(this, "import-file-parser", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "importFileParser.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist")),
    });

    importBucket.grantPut(importFileParser);
    importBucket.grantPutAcl(importFileParser);
    importBucket.grantRead(importFileParser);

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      {
        prefix: "uploaded/",
        suffix: ".csv",
      }
    );
  }
}
