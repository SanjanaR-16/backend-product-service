import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent } from "aws-lambda";
const dynamoDB = new DynamoDB.DocumentClient();

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    console.log("GET /products/{id}", event.pathParameters);

    const productId = event.pathParameters?.productId;

    if (!productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "productId is required" }),
      };
    }

    const product = await dynamoDB.get({
      TableName: process.env.PRODUCTS_TABLE!,
      Key: { id: productId },
    }).promise();

    const stock = await dynamoDB.get({
      TableName: process.env.STOCK_TABLE!,
      Key: { product_id: productId },
    }).promise();

    if (!product.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...product.Item,
        count: stock.Item?.count || 0,
      }),
    };
  } catch (error) {
    console.log(error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal error" }),
    };
  }
};
