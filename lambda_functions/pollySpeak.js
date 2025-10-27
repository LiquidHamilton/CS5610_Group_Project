import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

/**
 * Amazon Polly Text-to-Speech Lambda
 * Request JSON: { "text": "Hola mundo", "languageCode": "es", "voiceId": "Lucia" }
 * Response JSON: { "audioBase64": "<...>", "contentType": "audio/mpeg" }
 *
 * Notes:
 *  - Max Polly input length is ~3000 characters. We truncate defensively.
 *  - Default region matches the rest of your stack.
 *  - You may pass SSML instead of plain text by including isSsml: true.
 */
const client = new PollyClient({ region: "us-east-2" });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://d2tvtylprn3gax.cloudfront.net",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

/** Reasonable voice defaults by language */
const DEFAULT_VOICE_BY_LANG = {
  "en": "Joanna",      // English (US)
  "es": "Lucia",       // Spanish (US) / Conchita for EU Spanish
  "fr": "Celine",      // French (FR)
  "de": "Vicki",       // German
  "it": "Carla",       // Italian
  "pt": "Camila",      // Portuguese (BR)
  "hi": "Aditi",       // Hindi (bilingual en-IN/hi-IN)
  "ja": "Mizuki",      // Japanese
  "ko": "Seoyeon",     // Korean
  "zh": "Zhiyu",       // Chinese (Mandarin)
  "ar": "Zeina",       // Arabic
  "ru": "Tatyana"      // Russian
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const text = (body.text || "").toString().trim();
    const languageCode = (body.languageCode || "en").toLowerCase();
    const isSsml = !!body.isSsml;

    if (!text) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Missing required field: text" }),
      };
    }

    const MAX_LEN = 2900; // Stay under Polly's ~3000 limit
    const inputText = text.length > MAX_LEN ? text.slice(0, MAX_LEN) : text;

    // Pick a voice: explicit > by language > default
    const voiceId = body.voiceId || DEFAULT_VOICE_BY_LANG[languageCode] || "Joanna";

    // Try neural first (where supported); fall back to standard if needed
    const tryEngines = ["neural", "standard"];
    let audioBuffer = null;
    let contentType = "audio/mpeg";

    for (const engine of tryEngines) {
      try {
        const synth = new SynthesizeSpeechCommand({
          OutputFormat: "mp3",
          Text: inputText,
          TextType: isSsml ? "ssml" : "text",
          VoiceId: voiceId,
          Engine: engine
        });
        const resp = await client.send(synth);
        // resp.AudioStream is a Uint8Array in AWS SDK v3
        audioBuffer = Buffer.from(resp.AudioStream);
        contentType = resp.ContentType || "audio/mpeg";
        break;
      } catch (err) {
        // If engine unsupported for this voice, try next
        if (engine === "neural") {
          continue;
        } else {
          throw err;
        }
      }
    }

    if (!audioBuffer) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Failed to synthesize speech" }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        audioBase64: audioBuffer.toString("base64"),
        contentType
      }),
    };
  } catch (error) {
    console.error("Polly synth error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "Synthesis failed",
        message: error.message
      }),
    };
  }
};
