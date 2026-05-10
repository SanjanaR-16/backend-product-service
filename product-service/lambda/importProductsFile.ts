import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({});

export const handler = async (event: any) => {
  try {
    console.log("GET /import called with:", JSON.stringify(event));

    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({ message: "Missing file name parameter" }),
      };
    }

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: `uploaded/${fileName}`,
      ContentType: "text/csv",
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    console.log("Generated signed URL for:", fileName);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: signedUrl,
    };
  } catch (error) {
    console.log("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Internal error" }),
    };
  }
};
