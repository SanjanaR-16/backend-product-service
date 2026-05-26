import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log("basicAuthorizer called with token:", event.authorizationToken);

  const authorizationToken = event.authorizationToken;

  if (!authorizationToken) {
    throw new Error("Unauthorized");
  }

  try {
    const tokenParts = authorizationToken.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Basic") {
      return generatePolicy("user", "Deny", event.methodArn, 403);
    }

    const encodedCredentials = tokenParts[1];
    const decodedCredentials = Buffer.from(
      encodedCredentials,
      "base64"
    ).toString("utf-8");
    const [login, password] = decodedCredentials.split(":");

    if (!login || !password) {
      return generatePolicy("user", "Deny", event.methodArn, 403);
    }

    const storedPassword = process.env[login];

    if (!storedPassword || storedPassword !== password) {
      return generatePolicy(login, "Deny", event.methodArn, 403);
    }

    return generatePolicy(login, "Allow", event.methodArn);
  } catch (err) {
    console.error("Error in basicAuthorizer:", err);
    throw new Error("Unauthorized");
  }
};

function generatePolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string,
  statusCode?: number
): APIGatewayAuthorizerResult {
  const authResponse: APIGatewayAuthorizerResult = {
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
    context: statusCode ? { statusCode: statusCode.toString() } : {},
  };
  return authResponse;
}
