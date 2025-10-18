import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Readable } from "stream";
import csvParser from "csv-parser";
import { S3Event, APIGatewayProxyResult } from "aws-lambda";

import { HEADERS } from "./constants";

const QUEUE_URL = process.env.SQS_QUEUE_URL;

const s3 = new S3Client({ region: process.env.AWS_REGION });
const sqs = new SQSClient({ region: process.env.AWS_REGION });

async function moveFile(
  bucketName: string,
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  try {
    const copyCommand = new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${sourceKey}`,
      Key: destinationKey,
    });

    await s3.send(copyCommand);

    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: sourceKey,
    });

    await s3.send(deleteCommand);
  } catch (error) {
    console.error("Error moving file:", error);
    throw error;
  }
}

async function sendToSQS(data: any): Promise<void> {
  try {
    const command = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(data),
    });

    await sqs.send(command);
  } catch (error) {
    console.error("Error sending to SQS:", error);
    throw error;
  }
}

export async function handler(event: S3Event): Promise<APIGatewayProxyResult> {
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
          .on("data", async (data) => {
            count++;

            await sendToSQS(data);
          })
          .on("end", () => {
            resolve(undefined);
          })
          .on("error", (error) => {
            console.error("Error parsing CSV:", error);
            reject(error);
          });
      });

      const destinationKey = objectKey.replace("uploaded/", "parsed/");
      await moveFile(bucketName, objectKey, destinationKey);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "File parsed and sent to SQS successfully",
      }),
      headers: HEADERS,
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to parse file" }),
      headers: HEADERS,
    };
  }
}
