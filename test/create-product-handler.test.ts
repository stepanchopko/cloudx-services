import { handler as createProductHandler } from "../lib/product-service/createProduct";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { APIGatewayProxyEvent } from "aws-lambda";

const dynamoMock = mockClient(DynamoDBClient);

describe("createProductHandler", () => {
  beforeEach(() => {
    dynamoMock.reset();
  });

  it("should create a product and return it with status code 201", async () => {
    dynamoMock.resolves({});

    const event = {
      body: JSON.stringify({
        title: "New Product",
        description: "This is a new product.",
        price: 19.99,
        count: 10,
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = await createProductHandler(event);

    expect(response.statusCode).toBe(201);
    const responseBody = JSON.parse(response.body);
    expect(responseBody).toHaveProperty("id");
    expect(responseBody.title).toBe("New Product");
    expect(responseBody.description).toBe("This is a new product.");
    expect(responseBody.price).toBe(19.99);
    expect(responseBody.count).toBe(10);
  });

  it("should return 400 for invalid product data", async () => {
    const event = {
      body: JSON.stringify({
        title: "",
        description: "Invalid product",
        price: -10,
        count: -5,
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = await createProductHandler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: "Invalid request" });
  });

  it("should return 400 when body is missing", async () => {
    const event = {} as unknown as APIGatewayProxyEvent;

    const response = await createProductHandler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: "Invalid product data",
    });
  });

  it("should return 500 when DynamoDB transaction fails", async () => {
    dynamoMock.rejects(new Error("DynamoDB error"));

    const event = {
      body: JSON.stringify({
        title: "New Product",
        description: "This is a new product.",
        price: 19.99,
        count: 10,
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = await createProductHandler(event);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      error: "Internal server error",
    });
  });
});
