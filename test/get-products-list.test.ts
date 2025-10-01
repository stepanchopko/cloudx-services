import { handler as getProductsListHandler } from "../lib/product-service/getProductsList";
import {
  DynamoDBClient,
  ScanCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";

const dynamoMock = mockClient(DynamoDBClient);

describe("getProductsListHandler", () => {
  beforeEach(() => {
    dynamoMock.reset();
  });

  it("should return all products with stock and status code 200", async () => {
    dynamoMock
      .on(ScanCommand, { TableName: process.env.PRODUCTS_TABLE_NAME })
      .resolves({
        Items: [
          {
            id: { S: "1" },
            title: { S: "Product 1" },
            description: { S: "Description 1" },
            price: { N: "100" },
          },
          {
            id: { S: "2" },
            title: { S: "Product 2" },
            description: { S: "Description 2" },
            price: { N: "200" },
          },
        ],
      });

    dynamoMock
      .on(GetItemCommand, { TableName: process.env.STOCK_TABLE_NAME })
      .resolvesOnce({
        Item: { product_id: { S: "1" }, count: { N: "10" } },
      })
      .resolvesOnce({
        Item: { product_id: { S: "2" }, count: { N: "20" } },
      });

    const response = await getProductsListHandler(
      {} as unknown as APIGatewayProxyEvent
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual([
      {
        id: "1",
        title: "Product 1",
        description: "Description 1",
        price: 100,
        count: 10,
      },
      {
        id: "2",
        title: "Product 2",
        description: "Description 2",
        price: 200,
        count: 20,
      },
    ]);
  });

  it("should return 500 when DynamoDB throws an error", async () => {
    dynamoMock.rejects(new Error("DynamoDB error"));

    const response = await getProductsListHandler(
      {} as unknown as APIGatewayProxyEvent
    );

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: "Internal server error",
    });
  });
});
