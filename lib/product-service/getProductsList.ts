import {
  DynamoDBClient,
  ScanCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";

import type { Product } from "./mock-data/products.js";
import type { Stock } from "./mock-data/stock.js";
import { HEADERS } from "./constants.js";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME;

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export async function handler() {
  try {
    const productsCommand = new ScanCommand({ TableName: PRODUCTS_TABLE_NAME });
    const productsResult = await dynamoDBClient.send(productsCommand);

    const products: Product[] =
      productsResult.Items?.map((item) => ({
        id: item.id.S ?? "",
        title: item.title.S ?? "",
        description: item.description.S ?? "",
        price: parseInt(item.price.N ?? "0"),
      })) || [];

    const productWithStockPromises = products.map(async (product) => {
      const stockCommand = new GetItemCommand({
        TableName: STOCK_TABLE_NAME,
        Key: {
          product_id: { S: product.id },
        },
      });

      const stockResult = await dynamoDBClient.send(stockCommand);
      const stock: Stock = stockResult.Item
        ? {
            product_id: stockResult.Item.product_id.S ?? product.id,
            count: parseInt(stockResult.Item.count.N ?? "0"),
          }
        : { product_id: product.id, count: 0 };

      return {
        ...product,
        count: stock.count,
      };
    });

    const productsWithStock = await Promise.all(productWithStockPromises);

    return {
      statusCode: 200,
      body: JSON.stringify(productsWithStock),
      headers: HEADERS,
    };
  } catch (error) {
    console.error("Error fetching products list:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
      headers: HEADERS,
    };
  }
}
