import { DynamoDB } from "aws-sdk";

const dynamoDB = new DynamoDB.DocumentClient();

export const handler = async () => {
  try {
    console.log("GET /products called");

    const products = await dynamoDB.scan({
      TableName: process.env.PRODUCTS_TABLE!,
    }).promise();

    const stocks = await dynamoDB.scan({
      TableName: process.env.STOCK_TABLE!,
    }).promise();

    const result = products.Items!.map((product) => {
      const stock = stocks.Items!.find(
        (s) => s.product_id === product.id
      );

      return {
        ...product,
        count: stock?.count || 0,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.log(error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal error" }),
    };
  }
};
