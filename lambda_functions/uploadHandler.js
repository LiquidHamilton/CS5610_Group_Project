import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({ region: "us-east-2" });

function extractBoundary(contentType) {
  const match = contentType.match(/boundary=(.+)$/);
  return match ? match[1] : null;
}

function parseMultipartFormData(buffer, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`, "utf-8");

  let start = 0;
  const parts = [];

  // Find all boundary positions
  while (start < buffer.length) {
    const pos = buffer.indexOf(boundaryBuffer, start);
    if (pos === -1) break;

    if (start > 0) {
      parts.push(buffer.slice(start, pos));
    }
    start = pos + boundaryBuffer.length;
  }

  // Process each part
  for (const part of parts) {
    // Find the double CRLF separator (between headers and body)
    const separatorPos = findDoubleNewline(part);
    if (separatorPos === -1) continue;

    const headersBuffer = part.slice(0, separatorPos);
    const headers = headersBuffer.toString("utf-8");

    // Check if this part contains a file
    if (headers.includes("filename=")) {
      // Extract content type
      const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
      const contentType = contentTypeMatch
        ? contentTypeMatch[1].trim()
        : "image/jpeg";

      // Get body (skip the double newline separator)
      let bodyStart = separatorPos;
      if (part[separatorPos] === 0x0d && part[separatorPos + 1] === 0x0a) {
        bodyStart += 4; // Skip \r\n\r\n
      } else {
        bodyStart += 2; // Skip \n\n
      }

      // Remove trailing CRLF if present
      let bodyEnd = part.length;
      if (part[bodyEnd - 2] === 0x0d && part[bodyEnd - 1] === 0x0a) {
        bodyEnd -= 2;
      } else if (part[bodyEnd - 1] === 0x0a) {
        bodyEnd -= 1;
      }

      const fileBuffer = part.slice(bodyStart, bodyEnd);

      return { fileBuffer, contentType };
    }
  }

  return null;
}

function findDoubleNewline(buffer) {
  // Look for \r\n\r\n
  for (let i = 0; i < buffer.length - 3; i++) {
    if (
      buffer[i] === 0x0d &&
      buffer[i + 1] === 0x0a &&
      buffer[i + 2] === 0x0d &&
      buffer[i + 3] === 0x0a
    ) {
      return i;
    }
  }

  // Look for \n\n
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === 0x0a && buffer[i + 1] === 0x0a) {
      return i;
    }
  }

  return -1;
}

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "https://d2tvtylprn3gax.cloudfront.net",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers, body: "" };
    }

    const contentTypeHeader =
      event.headers["content-type"] || event.headers["Content-Type"];

    if (
      !contentTypeHeader ||
      !contentTypeHeader.includes("multipart/form-data")
    ) {
      throw new Error("Content-Type must be multipart/form-data");
    }

    // Extract boundary
    const boundary = extractBoundary(contentTypeHeader);
    if (!boundary) {
      throw new Error("No boundary found in Content-Type");
    }

    console.log("Boundary:", boundary);
    console.log("Is base64 encoded:", event.isBase64Encoded);

    // Decode body to buffer
    let bodyBuffer;
    if (event.isBase64Encoded) {
      bodyBuffer = Buffer.from(event.body, "base64");
    } else {
      // Body is already binary or string
      bodyBuffer = Buffer.from(event.body, "binary");
    }

    console.log("Body buffer length:", bodyBuffer.length);
    console.log(
      "First 50 bytes (hex):",
      bodyBuffer.slice(0, 50).toString("hex")
    );

    // Parse multipart data
    const parsed = parseMultipartFormData(bodyBuffer, boundary);

    if (!parsed) {
      throw new Error("Could not extract file from multipart data");
    }

    const { fileBuffer, contentType } = parsed;

    console.log("Extracted file size:", fileBuffer.length);
    console.log("File magic number:", fileBuffer.slice(0, 4).toString("hex"));

    // Validate it's actually an image
    const magic = fileBuffer.slice(0, 4).toString("hex");
    let extension = "jpg";

    if (magic.startsWith("ffd8ff")) {
      extension = "jpg";
    } else if (magic.startsWith("89504e47")) {
      extension = "png";
    } else if (magic.startsWith("47494638")) {
      extension = "gif";
    } else {
      throw new Error(
        `Invalid image format. Magic: ${magic}. Size: ${fileBuffer.length}`
      );
    }

    if (fileBuffer.length < 1000) {
      throw new Error(`File too small: ${fileBuffer.length} bytes`);
    }

    const fileKey = `uploads/${uuidv4()}.${extension}`;
    const bucketName = "image-analysis-upload-bucket-406214174545";

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType,
      })
    );

    console.log(`✓ Uploaded ${fileKey} (${fileBuffer.length} bytes)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: "success",
        key: fileKey,
        size: fileBuffer.length,
      }),
    };
  } catch (error) {
    console.error("✗ Error:", error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Upload failed",
        message: error.message,
      }),
    };
  }
};
