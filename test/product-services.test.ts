import { handler as getProductsListHandler } from "../lib/product-service/getProductsList";
import { handler as getProductByIdHandler } from "../lib/product-service/getProductById";
import { APIGatewayProxyEvent } from "aws-lambda";

jest.mock("../lib/product-service/mock-data/products", () => ({
  products: [
    { id: "1", name: "Product 1", price: 100 },
    { id: "2", name: "Product 2", price: 200 },
  ],
}));

jest.mock("../lib/product-service/constants", () => ({
  HEADERS: { "Content-Type": "application/json" },
}));

describe("Product Service Handlers", () => {
  describe("getProductsListHandler", () => {
    it("should return all products with status code 200", async () => {
      const response = await getProductsListHandler();

      expect(response.statusCode).toBe(200);
      expect(response.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(response.body)).toEqual([
        { id: "1", name: "Product 1", price: 100 },
        { id: "2", name: "Product 2", price: 200 },
      ]);
    });
  });

  describe("getProductByIdHandler", () => {
    it("should return the correct product for a valid product_id", async () => {
      const event = {
        pathParameters: { product_id: "1" },
      } as unknown as APIGatewayProxyEvent;
      const response = await getProductByIdHandler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(response.body)).toEqual({
        id: "1",
        name: "Product 1",
        price: 100,
      });
    });

    it("should return 404 for an invalid product_id", async () => {
      const event = {
        pathParameters: { product_id: "10" },
      } as unknown as APIGatewayProxyEvent;
      const response = await getProductByIdHandler(event);

      expect(response.statusCode).toBe(404);
      expect(response.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(response.body)).toEqual({
        error: "Product with ID 10 not found",
      });
    });

    it("should return 400 when product_id is missing", async () => {
      const event = { pathParameters: {} } as APIGatewayProxyEvent;
      const response = await getProductByIdHandler(event);

      expect(response.statusCode).toBe(400);
      expect(response.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(response.body)).toEqual({
        error: "Missing productId in path parameters",
      });
    });
  });
});
