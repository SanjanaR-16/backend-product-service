import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { randomUUID } from "crypto";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const snsClient = new SNSClient({});

export const handler = async (event: SQSEvent) => {
  console.log("catalogBatchProcess event:", JSON.stringify(event));

  const createdProducts: any[] = [];

  for (const record of event.Records) {
    try {
      const product = JSON.parse(record.body);
      const { title, description, price, count } = product;

      if (!title || price === undefined) {
        console.error("Invalid product data, missing title or price:", product);
        continue;
      }

      const id = randomUUID();

      await ddbClient.send(
        new PutCommand({
          TableName: process.env.PRODUCTS_TABLE!,
          Item: { id, title, description: description || "", price: Number(price) },
        })
      );

      await ddbClient.send(
        new PutCommand({
          TableName: process.env.STOCK_TABLE!,
          Item: { product_id: id, count: Number(count) || 0 },
        })
      );

      const created = { id, title, description, price, count: count ?? 0 };
      createdProducts.push(created);
      console.log("Created product:", JSON.stringify(created));
    } catch (error) {
      console.error("Error processing record:", record.body, error);
    }
  }

  if (createdProducts.length > 0) {
    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN!,
        Subject: "New products created",
        Message: JSON.stringify({
          message: `${createdProducts.length} product(s) created successfully`,
          products: createdProducts,
        }),
      })
    );
    console.log("SNS notification sent for created products");
  }
};
