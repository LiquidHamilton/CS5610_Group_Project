import {
  RekognitionClient,
  DetectLabelsCommand,
  DetectFacesCommand,
} from "@aws-sdk/client-rekognition";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const rekognitionClient = new RekognitionClient({ region: "us-east-2" });
const dynamoClient = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
  try {
    // Parse S3 event
    const record = event.Records[0];
    const bucketName = record.s3.bucket.name;
    const objectKey = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, " ")
    );

    console.log(`Processing image: ${objectKey} from bucket: ${bucketName}`);

    // Detect labels (objects, scenes, concepts)
    const labelsParams = {
      Image: {
        S3Object: {
          Bucket: bucketName,
          Name: objectKey,
        },
      },
      MaxLabels: 10,
      MinConfidence: 70,
    };

    const labelsResponse = await rekognitionClient.send(
      new DetectLabelsCommand(labelsParams)
    );

    // Detect faces
    const facesParams = {
      Image: {
        S3Object: {
          Bucket: bucketName,
          Name: objectKey,
        },
      },
      Attributes: ["ALL"],
    };

    const facesResponse = await rekognitionClient.send(
      new DetectFacesCommand(facesParams)
    );

    // Prepare analysis results
    const analysisResult = {
      imageKey: objectKey,
      timestamp: new Date().toISOString(),
      labels: labelsResponse.Labels.map((label) => ({
        name: label.Name,
        confidence: Math.round(label.Confidence * 100) / 100,
      })),
      faces: facesResponse.FaceDetails.map((face) => ({
        confidence: Math.round(face.Confidence * 100) / 100,
        ageRange: face.AgeRange,
        gender: face.Gender?.Value,
        emotions: face.Emotions?.slice(0, 3).map((e) => ({
          type: e.Type,
          confidence: Math.round(e.Confidence * 100) / 100,
        })),
        smile: face.Smile?.Value,
        eyeglasses: face.Eyeglasses?.Value,
        sunglasses: face.Sunglasses?.Value,
      })),
      faceCount: facesResponse.FaceDetails.length,
    };

    // Store results in DynamoDB
    const tableName = "ImageAnalysisResults";
    const putParams = {
      TableName: tableName,
      Item: {
        imageKey: objectKey,
        timestamp: analysisResult.timestamp,
        analysis: analysisResult,
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days expiry
      },
    };

    await docClient.send(new PutCommand(putParams));

    console.log(`Successfully analyzed and stored results for ${objectKey}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Analysis complete",
        result: analysisResult,
      }),
    };
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
};
