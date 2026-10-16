import { GoogleGenAI } from "@google/genai";

/*
 * =========================================================
 * GEMINI
 * =========================================================
 */

const gemini = new GoogleGenAI({
  apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
});

/*
 * Keep your working Gemini models first.
 */
const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
];

/*
 * =========================================================
 * OPENROUTER
 * =========================================================
 */

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

const OPENROUTER_MODELS = [
  "openrouter/free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/*
 * =========================================================
 * RETRYABLE STATUS CODES & ERRORS
 * =========================================================
 */

const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

const getErrorStatus = (error) => {
  const message = String(
    error?.message || error?.error?.message || error || "",
  ).toLowerCase();

  const code =
    error?.status || error?.code || error?.error?.status || error?.error?.code;

  if (typeof code === "number") return code;
  if (typeof code === "string") {
    const numericCode = parseInt(code, 10);
    if (!Number.isNaN(numericCode)) return numericCode;
  }

  if (message.includes("503") || message.includes("timeout")) return 503;
  if (message.includes("429")) return 429;
  if (message.includes("500")) return 500;
  if (message.includes("502")) return 502;
  if (message.includes("504")) return 504;
  if (message.includes("408")) return 408;

  return null;
};

const isRetryableError = (error) => {
  const status = getErrorStatus(error);
  const message = String(error?.message || "").toLowerCase();
  return RETRYABLE_STATUS_CODES.includes(status) || message.includes("timeout");
};

const createFriendlyAIError = (lastError) => {
  const status = getErrorStatus(lastError);

  if (status === 503 || String(lastError?.message).includes("timeout")) {
    return new Error(
      "MoonBeam AI took too long to respond. We tried several services, but they are currently slow or busy. Please try again.",
    );
  }
  if (status === 429) {
    return new Error(
      "MoonBeam AI has reached its current usage limit. Please wait a little and try again.",
    );
  }
  if (status === 408) {
    return new Error("MoonBeam AI took too long to respond. Please try again.");
  }
  if (status === 500 || status === 502 || status === 504) {
    return new Error(
      "MoonBeam AI is having a temporary connection problem. Please try again shortly.",
    );
  }

  return new Error(
    "MoonBeam AI couldn't complete that request right now. Please try again.",
  );
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
 * =========================================================
 * GEMINI GENERATOR (WITH 6-SECOND TIMEOUT)
 * =========================================================
 */

const generateWithGemini = async (prompt, config = {}) => {
  let lastError = null;

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];

    try {
      console.log(
        `🟣 MoonBeam Gemini ${i + 1}/${GEMINI_MODELS.length}: ${model}`,
      );

      // Create a 6-second timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Gemini request timed out after 6 seconds")),
          6000,
        ),
      );

      // Race the API call against the 6-second timer
      const response = await Promise.race([
        gemini.models.generateContent({
          model,
          contents: prompt,
          ...config,
        }),
        timeoutPromise,
      ]);

      const text = response?.text?.trim() || "";

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      console.log(`✅ Gemini succeeded: ${model}`);
      return text;
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);

      console.log(`⚠️ Gemini failed or timed out: ${model}`, {
        status,
        message: error?.message || String(error),
      });

      // If there are more Gemini models left, wait a split second and move to the next one
      if (i < GEMINI_MODELS.length - 1) {
        await delay(250);
        continue;
      }
    }
  }

  throw lastError;
};

/*
 * =========================================================
 * OPENROUTER GENERATOR
 * =========================================================
 */

const generateWithOpenRouter = async (prompt, config = {}) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is missing.");
  }

  let lastError = null;

  for (let i = 0; i < OPENROUTER_MODELS.length; i++) {
    const model = OPENROUTER_MODELS[i];

    try {
      console.log(
        `🔵 MoonBeam OpenRouter ${i + 1}/${OPENROUTER_MODELS.length}: ${model}`,
      );

      const body = {
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      };

      if (config?.responseMimeType === "application/json") {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "X-Title": "MoonBeam Notes",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(
          data?.error?.message ||
            `OpenRouter request failed with status ${response.status}`,
        );
        error.status = response.status;
        throw error;
      }

      const text = data?.choices?.[0]?.message?.content?.trim() || "";

      if (!text) {
        throw new Error("OpenRouter returned an empty response.");
      }

      console.log(`✅ OpenRouter succeeded: ${model}`);
      return text;
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);

      console.log(`⚠️ OpenRouter failed: ${model}`, {
        status,
        message: error?.message || String(error),
      });

      if (isRetryableError(error) && i < OPENROUTER_MODELS.length - 1) {
        await delay(300);
        continue;
      }

      if (status === 401 || status === 403) {
        throw error;
      }

      if (i < OPENROUTER_MODELS.length - 1) {
        await delay(300);
        continue;
      }
    }
  }

  throw lastError;
};

/*
 * =========================================================
 * MAIN AI GENERATOR
 * =========================================================
 */

const generate = async (prompt, config = {}) => {
  let lastError = null;

  try {
    return await generateWithGemini(prompt, config);
  } catch (geminiError) {
    lastError = geminiError;
    console.log(
      "🟡 All Gemini attempts timed out or failed. Switching to OpenRouter...",
      geminiError,
    );
  }

  try {
    return await generateWithOpenRouter(prompt, config);
  } catch (openRouterError) {
    lastError = openRouterError;
    console.log("🔴 All OpenRouter attempts failed.", openRouterError);
  }

  throw createFriendlyAIError(lastError);
};

/*
 * =========================================================
 * EXPORTED AI FUNCTIONS
 * =========================================================
 */

export const summarizeNote = async (content) => {
  if (!content || content.trim().length < 20) {
    throw new Error("Note content is too short to summarize.");
  }
  return generate(`
You are an executive assistant inside MoonBeam Notes.
Summarize the following note in exactly 2 concise sentences.
Focus on the main idea, important information, and decisions.

NOTE:
${content}
`);
};

export const generateTags = async (content) => {
  if (!content || content.trim().length < 10) return [];

  const response = await generate(
    `
Analyze the following note and generate 3 to 5 short, useful tags.
Rules: lowercase, 1-2 words max, no hashtags, return ONLY JSON format.

Expected format:
{
  "tags": ["tag1", "tag2", "tag3"]
}

NOTE:
${content}
`,
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["tags"],
      },
    },
  );

  try {
    const parsed = JSON.parse(response);
    return Array.isArray(parsed.tags)
      ? parsed.tags
          .map((tag) => String(tag).trim().toLowerCase())
          .filter(Boolean)
      : [];
  } catch (error) {
    console.log("Tag parsing error:", error);
    return [];
  }
};

export const refineNoteText = async (content, mode = "polish") => {
  if (!content) return content;

  let prompt = "";
  if (mode === "bullets") {
    prompt = `Reformat this note into clean, readable bullet points.\n\nNOTE:\n${content}`;
  } else if (mode === "fix") {
    prompt = `Fix spelling, grammar, and punctuation in this note.\n\nNOTE:\n${content}`;
  } else {
    prompt = `Polish this note so it sounds clear, natural, and professional.\n\nNOTE:\n${content}`;
  }

  return generate(prompt);
};

export const expandNote = async (content) => {
  if (!content || content.trim().length < 5) return content;
  return generate(`
Expand the note into a clearer, more useful version while keeping original facts.

ROUGH NOTE:
${content}
`);
};

export const shortenNote = async (content) => {
  if (!content) return content;
  return generate(`
Make the following note shorter and more concise without losing key facts.

NOTE:
${content}
`);
};

export const extractActionItems = async (content) => {
  if (!content || content.trim().length < 10) return [];

  const response = await generate(
    `
Read the following note and identify actionable tasks. Return ONLY JSON.

Expected format:
{
  "tasks": ["Task one", "Task two"]
}

NOTE:
${content}
`,
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          tasks: { type: "array", items: { type: "string" } },
        },
        required: ["tasks"],
      },
    },
  );

  try {
    const parsed = JSON.parse(response);
    return Array.isArray(parsed.tasks)
      ? parsed.tasks.map((task) => String(task).trim()).filter(Boolean)
      : [];
  } catch (error) {
    console.log("Action item parsing error:", error);
    return [];
  }
};

export const generateTitle = async (content) => {
  if (!content || content.trim().length < 10) return "";
  return generate(`
Create a short title for this note (maximum 8 words, no quotation marks).

NOTE:
${content}
`);
};

export const askAboutNote = async (content, question) => {
  if (!content || !question) return "";
  return generate(`
Answer the user's question using ONLY information in the note.

NOTE:
${content}

QUESTION:
${question}
`);
};
