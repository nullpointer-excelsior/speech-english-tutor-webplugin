import OpenAI from "openai";
import { TTS_SETTINGS } from "../../shared/constants";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function extractTextFromImage(imageUrl) {
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Extract all visible text from this image in English. If there is no text, summarize the main idea in 1–2 sentences in English.",
        },
        {
          type: "input_image",
          image_url: imageUrl,
        },
      ],
    }],
  });
  return response.output_text;
}

export async function getOpenAiTtsAudioBase64(text) {
  if (!text || !text.trim()) {
    return null;
  }

  const response = await client.audio.speech.create({
    model: TTS_SETTINGS.DEFAULT_MODEL,
    voice: TTS_SETTINGS.DEFAULT_VOICE,
    instructions: "Speak in a cheerful, very sensual, friendly and positive tone.",
    input: text,
    response_format: TTS_SETTINGS.DEFAULT_FORMAT,
  });

  const audioBuffer = await response.arrayBuffer();
  return arrayBufferToBase64(audioBuffer);
}

export async function translateText(text) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a translator. Translate the given text to Spanish. Reply with only the translation, no explanations.",
      },
      { role: "user", content: text },
    ],
    max_tokens: 256,
  });
  const r = response.choices[0].message.content.trim();
  console.log("translation:", r);
  return r;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}
