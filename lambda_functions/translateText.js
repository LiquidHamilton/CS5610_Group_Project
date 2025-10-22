import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const translateClient = new TranslateClient({ region: "us-east-2" });

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "https://d2tvtylprn3gax.cloudfront.net",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
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

    // Parse request body (handle base64-encoded bodies)
    let bodyContent = event.body;
    if (event.isBase64Encoded) {
      bodyContent = Buffer.from(event.body, 'base64').toString('utf-8');
    }
    const body = JSON.parse(bodyContent);
    const { text, sourceLanguage, targetLanguage } = body;

    // Validate input
    if (!text || !sourceLanguage || !targetLanguage) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({
          error: "Missing required fields: text, sourceLanguage, targetLanguage",
        }),
      };
    }

    // Validate text length (Translate has a 10,000 character limit)
    if (text.length > 10000) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({
          error: "Text exceeds maximum length of 10,000 characters",
        }),
      };
    }

    console.log(`Translating from ${sourceLanguage} to ${targetLanguage}`);

    // Call Amazon Translate
    const translateParams = {
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: targetLanguage,
    };

    const command = new TranslateTextCommand(translateParams);
    const result = await translateClient.send(command);

    console.log("Translation successful");

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        status: "success",
        originalText: text,
        translatedText: result.TranslatedText,
        sourceLanguage: result.SourceLanguageCode,
        targetLanguage: result.TargetLanguageCode,
      }),
    };
  } catch (error) {
    console.error("Translation error:", error);

    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({
        error: "Translation failed",
        message: error.message,
      }),
    };
  }
};
