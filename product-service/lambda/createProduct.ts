import { DynamoDB } from "aws-sdk";
import { v4 as uuid } from "uuid";
import { APIGatewayProxyEvent } from "aws-lambda";

const dynamoDB = new DynamoDB.DocumentClient();

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    console.log("POST /products", event.body);

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Request body is required" }),
      };
    }

    const body = JSON.parse(event.body);
    const { title, description, price, count } = body;

    if (!title || price === undefined) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Title and price are required" }),
      };
    }

    const id = uuid();

    await dynamoDB.put({
      TableName: process.env.PRODUCTS_TABLE!,
      Item: {
        id,
        title,
        description: description || "",
        price,
      },
    }).promise();

    await dynamoDB.put({
      TableName: process.env.STOCK_TABLE!,
      Item: {
        product_id: id,
        count: count ?? 0,
      },
    }).promise();

    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ id, title, description, price, count: count ?? 0 }),
    };
  } catch (error) {
    console.log(error);

    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Internal error" }),
    };
  }
};
