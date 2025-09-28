import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { HEADERS } from "./constants.js";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME;

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const productId = event.pathParameters?.product_id;

  if (!productId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing productId in path parameters" }),
      headers: HEADERS,
    };
  }

  try {
    const productCommand = new GetItemCommand({
      TableName: PRODUCTS_TABLE_NAME,
      Key: {
        id: { S: productId },
      },
    });

    const productResult = await dynamoDBClient.send(productCommand);

    if (!productResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: `Product with ID ${productId} not found`,
        }),
        headers: HEADERS,
      };
    }

    const product = {
      id: productResult.Item.id?.S ?? "",
      title: productResult.Item.title?.S ?? "",
      description: productResult.Item.description?.S ?? "",
      price: parseInt(productResult.Item.price?.N ?? "0"),
    };

    const stockCommand = new GetItemCommand({
      TableName: STOCK_TABLE_NAME,
      Key: {
        product_id: { S: productId },
      },
    });

    const stockResult = await dynamoDBClient.send(stockCommand);

    const stock = stockResult.Item
      ? {
          product_id: stockResult.Item.product_id?.S ?? productId,
          count: parseInt(stockResult.Item.count?.N ?? "0"),
        }
      : { product_id: productId, count: 0 };

    const productWithStock = {
      ...product,
      count: stock.count,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(productWithStock),
      headers: HEADERS,
    };
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
      headers: HEADERS,
    };
  }
}
