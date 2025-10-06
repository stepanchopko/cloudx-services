import { mockClient } from "aws-sdk-client-mock";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import { Readable } from "stream";

jest.mock("csv-parser", () => {
  return jest.fn(() => {
    const { PassThrough } = require("stream");
    const stream = new PassThrough();

    setImmediate(() => {
      stream.emit("data", { name: "Product1", price: "100" });
      stream.emit("data", { name: "Product2", price: "200" });
      stream.emit("end");
    });

    return stream;
  });
});

const s3Mock = mockClient(S3Client);

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

import { handler } from "../lib/product-service/importFileParser";

describe("importFileParser handler", () => {
  beforeEach(() => {
    s3Mock.reset();
    jest.clearAllMocks();
  });

  it("should successfully parse CSV and move file", async () => {
    const mockStream = new Readable();
    mockStream.push("name");
    mockStream.push(null);

    s3Mock.on(GetObjectCommand).resolves({ Body: mockStream as any });
    s3Mock.on(CopyObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});

    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: "test-bucket" },
            object: { key: "uploaded/test.csv" },
          },
        },
      ],
    } as S3Event;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe(
      "File parsed and moved successfully"
    );
    expect(s3Mock.calls()).toHaveLength(3);
  });

  it("should handle S3 GetObject failure", async () => {
    s3Mock.on(GetObjectCommand).rejects(new Error("S3 Get Error"));

    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: "test-bucket" },
            object: { key: "uploaded/test.csv" },
          },
        },
      ],
    } as S3Event;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe("Failed to parse file");
  });

  it("should handle file move failure", async () => {
    const mockStream = new Readable();
    mockStream.push("name");
    mockStream.push(null);

    s3Mock.on(GetObjectCommand).resolves({ Body: mockStream as any });
    s3Mock.on(CopyObjectCommand).rejects(new Error("Copy failed"));

    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: "test-bucket" },
            object: { key: "uploaded/test.csv" },
          },
        },
      ],
    } as S3Event;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(0);
  });

  it("should process multiple S3 records", async () => {
    const mockStream = new Readable();
    mockStream.push("data");
    mockStream.push(null);

    s3Mock.on(GetObjectCommand).resolves({ Body: mockStream as any });
    s3Mock.on(CopyObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});

    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: "test-bucket" },
            object: { key: "uploaded/file1.csv" },
          },
        },
        {
          s3: {
            bucket: { name: "test-bucket" },
            object: { key: "uploaded/file2.csv" },
          },
        },
      ],
    } as S3Event;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(2);
    expect(s3Mock.commandCalls(CopyObjectCommand)).toHaveLength(2);
    expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(2);
  });
});
