import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import csv from "csv-parser";
import { Readable } from "stream";

const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

export const handler = async (event: any) => {
  try {
    console.log("S3 event:", JSON.stringify(event));

    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, " ")
      );

      console.log(`Processing file: ${key} from bucket: ${bucket}`);

      const { Body } = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      const stream = Body as Readable;

      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv())
          .on("data", async (data: any) => {
            await sqsClient.send(
              new SendMessageCommand({
                QueueUrl: process.env.SQS_QUEUE_URL!,
                MessageBody: JSON.stringify(data),
              })
            );
          })
          .on("error", (error: any) => {
            console.error("Error parsing CSV:", error);
            reject(error);
          })
          .on("end", () => {
            console.log(`Finished parsing file: ${key}`);
            resolve();
          });
      });
    }

    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.log("Error:", error);
    return { statusCode: 500, body: "Error processing file" };
  }
};
