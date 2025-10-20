import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "https://d2tvtylprn3gax.cloudfront.net",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    // Handle OPTIONS preflight request
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: headers,
        body: "",
      };
    }

    // Get imageKey from query parameters
    const imageKey = event.queryStringParameters?.imageKey;

    if (!imageKey) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({
          error: "Missing required parameter: imageKey",
        }),
      };
    }

    const tableName = "ImageAnalysisResults";

    // Query DynamoDB for the analysis results (gets the most recent one)
    const queryParams = {
      TableName: tableName,
      KeyConditionExpression: "imageKey = :imageKey",
      ExpressionAttributeValues: {
        ":imageKey": imageKey,
      },
      ScanIndexForward: false, // Sort descending by timestamp (most recent first)
      Limit: 1,
    };

    const result = await docClient.send(new QueryCommand(queryParams));

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers: headers,
        body: JSON.stringify({
          error: "Analysis not found",
          message:
            "The image may still be processing. Please try again in a few seconds.",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        status: "success",
        data: result.Items[0].analysis,
      }),
    };
  } catch (error) {
    console.error("Error retrieving results:", error);

    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({
        error: "Failed to retrieve results",
        message: error.message,
      }),
    };
  }
};
