import { handler as catalogBatchProcessHandler } from "../lib/product-service/catalogBatchProcess";
import {
  DynamoDBClient,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import { SQSEvent, SQSRecord } from "aws-lambda";

const dynamoMock = mockClient(DynamoDBClient);
const snsMock = mockClient(SNSClient);

describe("catalogBatchProcessHandler", () => {
  beforeEach(() => {
    dynamoMock.reset();
    snsMock.reset();
  });

  it("should process SQS messages, write to DynamoDB, and publish to SNS", async () => {
    dynamoMock.on(TransactWriteItemsCommand).resolves({});
    snsMock.on(PublishCommand).resolves({ MessageId: "mockMessageId" });

    const event: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            id: "product-id-1",
            title: "Product",
            description: "Product description",
            price: 100,
            count: 5,
          }),
        },
      ] as SQSRecord[],
    };

    const response = await catalogBatchProcessHandler(event);

    expect(dynamoMock.calls()).toHaveLength(1);
    expect(dynamoMock.call(0).args[0].input).toEqual({
      TransactItems: [
        {
          Put: {
            TableName: process.env.PRODUCTS_TABLE_NAME,
            Item: {
              id: { S: "product-id-1" },
              title: { S: "Product" },
              description: { S: "Product description" },
              price: { N: "100" },
            },
          },
        },
        {
          Put: {
            TableName: process.env.STOCK_TABLE_NAME,
            Item: {
              product_id: { S: "product-id-1" },
              count: { N: "5" },
            },
          },
        },
      ],
    });

    expect(snsMock.calls()).toHaveLength(1);
    expect(snsMock.call(0).args[0].input).toEqual({
      TopicArn: process.env.CREATE_PRODUCT_TOPIC_ARN,
      Message: JSON.stringify({
        id: "product-id-1",
        title: "Product",
        description: "Product description",
        price: 100,
        count: 5,
      }),
      Subject: "New product created",
      MessageAttributes: {
        price: {
          DataType: "Number",
          StringValue: "100",
        },
      },
    });

    expect(response).toEqual({
      statusCode: 200,
      message: "Success",
      headers: expect.any(Object),
    });
  });

  it("should handle errors from DynamoDB", async () => {
    dynamoMock
      .on(TransactWriteItemsCommand)
      .rejects(new Error("DynamoDB error"));

    const event: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            id: "product-id-1",
            title: "Product",
            description: "Product description",
            price: 100,
            count: 5,
          }),
        },
      ] as SQSRecord[],
    };

    await expect(catalogBatchProcessHandler(event)).rejects.toThrow(
      "DynamoDB error"
    );

    expect(dynamoMock.calls()).toHaveLength(1);
    expect(snsMock.calls()).toHaveLength(0);
  });

  it("should handle errors from SNS", async () => {
    dynamoMock.on(TransactWriteItemsCommand).resolves({});
    snsMock.on(PublishCommand).rejects(new Error("SNS error"));

    const event: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            id: "product-id-1",
            title: "Product",
            description: "Product description",
            price: 100,
            count: 5,
          }),
        },
      ] as SQSRecord[],
    };

    await expect(catalogBatchProcessHandler(event)).rejects.toThrow(
      "SNS error"
    );

    expect(dynamoMock.calls()).toHaveLength(1);
    expect(snsMock.calls()).toHaveLength(1);
  });

  it("should handle invalid SQS message format", async () => {
    const event: SQSEvent = {
      Records: [
        {
          body: "invalid-json",
        },
      ] as SQSRecord[],
    };

    await expect(catalogBatchProcessHandler(event)).rejects.toThrow();

    expect(dynamoMock.calls()).toHaveLength(0);
    expect(snsMock.calls()).toHaveLength(0);
  });

  it("should process multiple SQS messages", async () => {
    dynamoMock.on(TransactWriteItemsCommand).resolves({});
    snsMock.on(PublishCommand).resolves({ MessageId: "mockMessageId" });

    const event: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            id: "product-id-1",
            title: "Product 1",
            description: "Description 1",
            price: 50,
            count: 10,
          }),
        },
        {
          body: JSON.stringify({
            id: "product-id-2",
            title: "Product 2",
            description: "Description 2",
            price: 150,
            count: 20,
          }),
        },
      ] as SQSRecord[],
    };

    const response = await catalogBatchProcessHandler(event);

    expect(dynamoMock.calls()).toHaveLength(2);
    expect(snsMock.calls()).toHaveLength(2);

    expect(response).toEqual({
      statusCode: 200,
      message: "Success",
      headers: expect.any(Object),
    });
  });
});
