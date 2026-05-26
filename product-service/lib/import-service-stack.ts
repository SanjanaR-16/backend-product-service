import { Stack, type StackProps, RemovalPolicy } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as path from "path";
import { Construct } from "constructs";

export class ImportServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 Bucket for import service
    const importBucket = new s3.Bucket(this, "ImportBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedOrigins: ["*"],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedHeaders: ["*"],
        },
      ],
    });

    // Create the "uploaded" folder in the bucket
    new s3deploy.BucketDeployment(this, "CreateUploadedFolder", {
      sources: [s3deploy.Source.data("uploaded/", "")],
      destinationBucket: importBucket,
    });

    // Lambda: importProductsFile - generates signed URL for uploading CSV
    const importProductsFile = new lambdaNode.NodejsFunction(
      this,
      "ImportProductsFileFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, "../lambda/importProductsFile.ts"),
        handler: "handler",
        functionName: "importProductsFile",
        environment: {
          BUCKET_NAME: importBucket.bucketName,
        },
      }
    );

    // Lambda: importFileParser - parses CSV files from S3
    const importFileParser = new lambdaNode.NodejsFunction(
      this,
      "ImportFileParserFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, "../lambda/importFileParser.ts"),
        handler: "handler",
        functionName: "importFileParser",
        environment: {
          BUCKET_NAME: importBucket.bucketName,
        },
      }
    );

    // Grant S3 permissions to Lambda functions
    importBucket.grantReadWrite(importProductsFile);
    importBucket.grantReadWrite(importFileParser);

    // S3 event notification for uploaded/ prefix
    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: "uploaded/" }
    );

    // API Gateway
    const api = new apigateway.RestApi(this, "ImportServiceApi", {
      restApiName: "Import Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFile)
    );
  }
}
