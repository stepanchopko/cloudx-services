import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { HEADERS } from "./constants.js";

const BUCKET_NAME = process.env.IMPORT_BUCKET_NAME;
const SIGNED_URL_EXPIRATION = 3600;

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log("Incoming request:", event);

  try {
    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: "Name is required" }),
      };
    }

    if (!fileName.toLowerCase().endsWith(".csv")) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: "Invalid file type" }),
      };
    }

    const s3Key = `uploaded/${fileName}`;

    const putObjectCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: "text/csv",
    });

    const signedUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: SIGNED_URL_EXPIRATION,
    });

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        message: "Signed URL generated successfully",
        uploadUrl: signedUrl,
        fileName: fileName,
        key: s3Key,
        expiresIn: SIGNED_URL_EXPIRATION,
      }),
    };
  } catch (error) {
    console.error("Error generating signed URL:", error);

    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ message: "Failed to generate signed URL" }),
    };
  }
}
