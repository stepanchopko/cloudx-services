import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import csvParser from "csv-parser";
import { S3Event, APIGatewayProxyResult } from "aws-lambda";

import { HEADERS } from "./constants";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function handler(event: S3Event): Promise<APIGatewayProxyResult> {
  console.log("Incoming Request:", event);

  try {
    for (const record of event.Records) {
      const bucketName = record.s3.bucket.name;
      const objectKey = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, " ")
      );

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });

      const response = await s3.send(command);
      const stream = response.Body as Readable;

      await new Promise((resolve, reject) => {
        let count = 0;

        stream
          .pipe(csvParser())
          .on("data", (data) => {
            count++;
            console.log(`Record #${count}:`, data);
          })
          .on("end", () => {
            console.log(`Total records: ${count}`);
            resolve(undefined);
          })
          .on("error", (error) => {
            console.error("Error parsing CSV:", error);
            reject(error);
          });
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "File parsed successfully" }),
      headers: HEADERS,
    };
  } catch (error: any) {
    console.error("Error parsing file:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to parse file" }),
      headers: HEADERS,
    };
  }
}
