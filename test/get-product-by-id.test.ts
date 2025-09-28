import { handler as getProductByIdHandler } from "../lib/product-service/getProductById";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { APIGatewayProxyEvent } from "aws-lambda";

const dynamoMock = mockClient(DynamoDBClient);

describe("getProductByIdHandler", () => {
  beforeEach(() => {
    dynamoMock.reset();
  });

  it("should return the correct product with stock for a valid product_id", async () => {
    dynamoMock
      .on(GetItemCommand, {
        TableName: process.env.PRODUCTS_TABLE_NAME,
        Key: { id: { S: "1" } },
      })
      .resolves({
        Item: {
          id: { S: "1" },
          title: { S: "Product 1" },
          description: { S: "Description 1" },
          price: { N: "100" },
        },
      });

    dynamoMock
      .on(GetItemCommand, {
        TableName: process.env.STOCK_TABLE_NAME,
        Key: { product_id: { S: "1" } },
      })
      .resolves({
        Item: { product_id: { S: "1" }, count: { N: "10" } },
      });

    const event = {
      pathParameters: { product_id: "1" },
    } as unknown as APIGatewayProxyEvent;

    const response = await getProductByIdHandler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      id: "1",
      title: "Product 1",
      description: "Description 1",
      price: 100,
      count: 10,
    });
  });

  it("should return 404 for an invalid product_id", async () => {
    dynamoMock
      .on(GetItemCommand, { TableName: process.env.PRODUCTS_TABLE_NAME })
      .resolves({});

    const event = {
      pathParameters: { product_id: "10" },
    } as unknown as APIGatewayProxyEvent;

    const response = await getProductByIdHandler(event);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      error: "Product with ID 10 not found",
    });
  });

  it("should return 400 when product_id is missing", async () => {
    const event = { pathParameters: {} } as APIGatewayProxyEvent;

    const response = await getProductByIdHandler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: "Missing productId in path parameters",
    });
  });

  it("should return 500 when DynamoDB throws an error", async () => {
    dynamoMock.rejects(new Error("DynamoDB error"));

    const event = {
      pathParameters: { product_id: "1" },
    } as unknown as APIGatewayProxyEvent;

    const response = await getProductByIdHandler(event);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: "Internal server error",
    });
  });
});
