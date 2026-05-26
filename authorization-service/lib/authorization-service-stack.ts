import { Stack, type StackProps, CfnOutput } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import * as fs from "fs";

const envFilePath = path.join(__dirname, "../.env");
const parsedEnv = fs.existsSync(envFilePath)
  ? dotenv.parse(fs.readFileSync(envFilePath))
  : {};

const lambdaEnv: Record<string, string> = {};
const validKey = /^[a-zA-Z][a-zA-Z0-9_]+$/;
for (const [key, value] of Object.entries(parsedEnv)) {
  if (validKey.test(key)) {
    lambdaEnv[key] = value;
  }
}

export class AuthorizationServiceStack extends Stack {
  public readonly basicAuthorizerArn: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const basicAuthorizer = new lambdaNode.NodejsFunction(
      this,
      "BasicAuthorizerFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, "../lambda/basicAuthorizer.ts"),
        handler: "handler",
        functionName: "basicAuthorizer",
        environment: lambdaEnv,
      }
    );

    this.basicAuthorizerArn = basicAuthorizer.functionArn;

    new CfnOutput(this, "BasicAuthorizerArn", {
      value: basicAuthorizer.functionArn,
      exportName: "BasicAuthorizerArn",
      description: "ARN of the basicAuthorizer Lambda function",
    });
  }
}
