import { Stack, type StackProps } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";
import { Construct } from "constructs";

export class ProductServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Reference existing DynamoDB tables
    const productsTable = dynamodb.Table.fromTableName(
      this,
      "ProductsTable",
      "products"
    );

    const stockTable = dynamodb.Table.fromTableName(
      this,
      "StockTable",
      "stock"
    );

    const getProductsList = new lambda.Function(this, "GetProductsListFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "getProductsList.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../dist")),
      functionName: "getProductsList",
      environment: {
        PRODUCTS_TABLE: "products",
        STOCK_TABLE: "stock",
      },
    });

    const getProductsById = new lambda.Function(this, "GetProductsByIdFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "getProductsById.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../dist")),
      functionName: "getProductsById",
      environment: {
        PRODUCTS_TABLE: "products",
        STOCK_TABLE: "stock",
      },
    });

    const createProduct = new lambda.Function(this, "CreateProductFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "createProduct.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../dist")),
      functionName: "createProduct",
      environment: {
        PRODUCTS_TABLE: "products",
        STOCK_TABLE: "stock",
      },
    });

    // Grant read permissions
    productsTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductsList);

    productsTable.grantReadData(getProductsById);
    stockTable.grantReadData(getProductsById);

    productsTable.grantWriteData(createProduct);
    stockTable.grantWriteData(createProduct);

    const api = new apigateway.RestApi(this, "ProductServiceApi", {
      restApiName: "Product Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const productsResource = api.root.addResource("products");
    productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsList)
    );
    productsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProduct)
    );

    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsById)
    );
  }
}
