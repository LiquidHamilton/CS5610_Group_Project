// pollySpeak.js (ESM, Node.js 18/20) - AWS SDK v3
// REQUIRES node_modules/@aws-sdk/client-polly in your deployment (zip or layer)
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

// ---- CORS (dynamic) ----
const ALLOWED_ORIGINS = new Set([
  "https://d2tvtylprn3gax.cloudfront.net",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
]);

function corsHeaders(event) {
  const reqOrigin = event?.headers?.origin || event?.headers?.Origin || "";
  const allowOrigin = ALLOWED_ORIGINS.has(reqOrigin)
    ? reqOrigin
    : "https://d2tvtylprn3gax.cloudfront.net";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

// ---- Voice defaults ----
const DEFAULT_VOICE_BY_LANG = {
  en: "Joanna",  es: "Lucia",   fr: "Celine",  de: "Vicki",
  it: "Carla",   pt: "Camila",  hi: "Aditi",   ja: "Mizuki",
  ko: "Seoyeon", zh: "Zhiyu",   ar: "Zeina",   ru: "Tatyana"
};

// ---- v3 AudioStream → Buffer ----
async function toBuffer(audioStream) {
  if (!audioStream) return null;
  if (audioStream instanceof Uint8Array) return Buffer.from(audioStream);
  if (typeof audioStream?.pipe === "function" || typeof audioStream?.[Symbol.asyncIterator] === "function") {
    const chunks = [];
    for await (const c of audioStream) chunks.push(c);
    return Buffer.concat(chunks);
  }
  try { return Buffer.from(audioStream); } catch { return null; }
}

export const handler = async (event) => {
  const headers = corsHeaders(event);

  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, isBase64Encoded: false, body: "" };
  }

  // Client in-handler
  const client = new PollyClient({ region: "us-east-2" });

  try {
    const body = JSON.parse(event.body || "{}");
    const text = (body.text || "").toString().trim();
    const languageCode = (body.languageCode || "en").toLowerCase();
    const isSsml = !!body.isSsml;

    if (!text) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        isBase64Encoded: false,
        body: JSON.stringify({ error: "Missing required field: text" })
      };
    }

    const inputText = text.length > 2900 ? text.slice(0, 2900) : text;
    const voiceId = body.voiceId || DEFAULT_VOICE_BY_LANG[languageCode] || "Joanna";

    const engines = ["neural", "standard"];
    let audioBuffer = null;
    let contentType = "audio/mpeg";
    let lastErr = null;

    for (const engine of engines) {
      try {
        const resp = await client.send(new SynthesizeSpeechCommand({
          OutputFormat: "mp3",
          Text: inputText,
          TextType: isSsml ? "ssml" : "text",
          VoiceId: voiceId,
          Engine: engine
        }));
        const buf = await toBuffer(resp.AudioStream);
        if (buf?.length) {
          audioBuffer = buf;
          contentType = resp.ContentType || "audio/mpeg";
          break;
        }
        lastErr = new Error("Empty AudioStream");
      } catch (e) {
        lastErr = e; // try next engine
      }
    }

    if (!audioBuffer) {
      console.error("Polly synth failed:", lastErr);
      return {
        statusCode: 500,
        headers: { ...headers, "Content-Type": "application/json" },
        isBase64Encoded: false,
        body: JSON.stringify({ error: "Failed to synthesize speech" })
      };
    }

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      isBase64Encoded: false,
      body: JSON.stringify({
        audioBase64: audioBuffer.toString("base64"),
        contentType
      })
    };
  } catch (error) {
    console.error("Polly synth error:", error);
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      isBase64Encoded: false,
      body: JSON.stringify({
        error: "Synthesis failed",
        message: error?.message || "Unknown error"
      })
    };
  }
};
