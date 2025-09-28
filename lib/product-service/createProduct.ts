import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  DynamoDBClient,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";

import { HEADERS } from "./constants.js";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME;

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log("Incoming request:", event);

  if (!event.body) {
    console.error("Missing request body");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid product data" }),
      headers: HEADERS,
    };
  }

  try {
    const requestBody = JSON.parse(event.body);
    const { title, description, price, count } = requestBody;

    if (!title || !description || !count || count < 0 || !price || price <= 0) {
      console.error("Invalid request");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid request" }),
        headers: HEADERS,
      };
    }

    const productId = randomUUID();

    const transactCommand = new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: PRODUCTS_TABLE_NAME,
            Item: {
              id: { S: productId },
              title: { S: title },
              description: { S: description },
              price: { N: price.toString() },
            },
          },
        },
        {
          Put: {
            TableName: STOCK_TABLE_NAME,
            Item: {
              product_id: { S: productId },
              count: { N: (count ?? 0).toString() },
            },
          },
        },
      ],
    });

    await dynamoDBClient.send(transactCommand);

    return {
      statusCode: 201,
      body: JSON.stringify({
        id: productId,
        title,
        description,
        price,
        count: count ?? 0,
      }),
    };
  } catch (error) {
    console.error("Error creating product and stock:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
      headers: HEADERS,
    };
  }
}
