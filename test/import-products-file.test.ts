import { mockClient } from "aws-sdk-client-mock";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { handler } from "../lib/product-service/importProductsFile";
import { APIGatewayProxyEvent } from "aws-lambda";

const s3Mock = mockClient(S3Client);

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

process.env.IMPORT_BUCKET_NAME = "test-bucket";
process.env.AWS_REGION = "us-east-1";

describe("importProductsFile handler", () => {
  beforeEach(() => {
    s3Mock.reset();
    jest.clearAllMocks();
  });

  it("should generate signed URL for valid CSV file", async () => {
    const mockSignedUrl = "https://";
    (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);

    const event = {
      queryStringParameters: { name: "products.csv" },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).uploadUrl).toBe(mockSignedUrl);
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(S3Client),
      expect.any(PutObjectCommand),
      { expiresIn: 3600 }
    );
  });

  it("should return 400 if fileName is missing", async () => {
    const event = {
      queryStringParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe("Name is required");
  });

  it("should return 400 for non-CSV files", async () => {
    const event = {
      queryStringParameters: { name: "products.txt" },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe("Invalid file type");
  });

  it("should return 500 if S3 operation fails", async () => {
    (getSignedUrl as jest.Mock).mockRejectedValue(new Error("S3 Error"));

    const event = {
      queryStringParameters: { name: "products.csv" },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe(
      "Failed to generate signed URL"
    );
  });
});
