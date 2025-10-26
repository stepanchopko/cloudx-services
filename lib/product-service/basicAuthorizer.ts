import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
} from "aws-lambda";

const generatePolicy = (
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};

export async function handler(event: APIGatewayTokenAuthorizerEvent) {
  console.log("Incoming event:", event);

  if (!event.authorizationToken) {
    throw new Error("Unauthorized");
  }

  try {
    const tokenParts = event.authorizationToken.split(" ");

    if (tokenParts.length !== 2 || tokenParts[0] !== "Basic") {
      throw new Error("Unauthorized");
    }

    const token = tokenParts[1];
    const decodedToken = Buffer.from(token, "base64").toString("utf-8");
    const [username, password] = decodedToken.split(":");

    const expectedPassword = process.env[username];

    if (!expectedPassword || expectedPassword !== password) {
      console.log("Access denied for:", username);
      return generatePolicy("user", "Deny", event.methodArn);
    }

    return generatePolicy(username, "Allow", event.methodArn);
  } catch (error) {
    console.error("Authorization error:", error);
    throw new Error("Unauthorized");
  }
}
