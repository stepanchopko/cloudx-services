import { SQSEvent } from "aws-lambda";
import {
  DynamoDBClient,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { randomUUID } from "crypto";

import { HEADERS } from "./constants.js";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME;
const CREATE_PRODUCT_TOPIC_ARN = process.env.CREATE_PRODUCT_TOPIC_ARN;

const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: SQSEvent) => {
  console.log("Incoming event:", event);

  for (const record of event.Records) {
    try {
      console.log("Message:", record.body);

      const product = JSON.parse(record.body);
      const productId = product.id || randomUUID();

      const item = {
        id: product.id || randomUUID(),
        title: product.title,
        description: product.description || "",
        price: Number(product.price),
        count: Number(product.count) || 0,
      };

      const transactCommand = new TransactWriteItemsCommand({
        TransactItems: [
          {
            Put: {
              TableName: PRODUCTS_TABLE_NAME,
              Item: {
                id: { S: productId },
                title: { S: product.title },
                description: { S: product.description || "" },
                price: { N: product.price.toString() },
              },
            },
          },
          {
            Put: {
              TableName: STOCK_TABLE_NAME,
              Item: {
                product_id: { S: productId },
                count: { N: (product.count || 0).toString() },
              },
            },
          },
        ],
      });

      await dynamoDBClient.send(transactCommand);

      console.log(`Created product: ${item.id}`);

      const publishCommand = new PublishCommand({
        TopicArn: CREATE_PRODUCT_TOPIC_ARN,
        Message: JSON.stringify({
          id: item.id,
          title: item.title,
          description: item.description,
          price: item.price,
          count: item.count,
        }),
        Subject: "New product created",
      });

      await snsClient.send(publishCommand);

      console.log(`Published event to SNS for product: ${item.id}`);
    } catch (error) {
      console.error("Error processing message:", error);

      throw error;
    }
  }

  return { statusCode: 200, message: "Success", headers: HEADERS };
};
