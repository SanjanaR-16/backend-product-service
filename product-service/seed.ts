import { DynamoDB } from "aws-sdk";
import { v4 as uuid } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient({
  region: "us-east-1",
});

const products = [
  {
    id: uuid(),
    title: "Laptop",
    description: "Gaming laptop",
    price: 80000,
  },
  {
    id: uuid(),
    title: "Phone",
    description: "Smartphone",
    price: 20000,
  },
];

async function seed() {
  for (const product of products) {
    // Insert product
    await dynamoDB.put({
      TableName: "products",
      Item: product,
    }).promise();

    // Insert stock
    await dynamoDB.put({
      TableName: "stock",
      Item: {
        product_id: product.id,
        count: Math.floor(Math.random() * 10),
      },
    }).promise();

    console.log("Inserted:", product.title);
  }
}

seed();
