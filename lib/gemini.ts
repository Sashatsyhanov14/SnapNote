/**
 * Утилита для интеграции с OpenRouter.
 * Исправляет ошибку 401, гарантируя правильный формат заголовка Authorization 
 * и наличие заголовка HTTP-Referer, который требуется OpenRouter.
 */

const MODEL_GEMMA = "google/gemma-3-27b-it:free";
const MODEL_GEMINI_FLASH_LITE = "google/gemini-2.5-flash-lite";

const SYSTEM_INSTRUCTION = `Ты — профессиональный редактор заметок.
Твоя задача: превратить сумбурные мысли в структурированную Markdown-заметку.

ОБЯЗАТЕЛЬНО:
1. Добавь короткий заголовок через # (если уместно).
2. Используй **жирный текст** для ключевых слов.
3. Если есть перечисление — сделай список с булллитами (-) или чекбоксами ([ ]).
4. Удали слова-паразиты и повторы.
5. Пиши на языке оригинала сообщения.

Стиль: современный, лаконичный, "Apple Style".`;

const POLISH_INSTRUCTION = `Ты — AI-корректор. 
Улучши читаемость этого текста, сохранив Markdown разметку. 
Сделай текст более профессиональным и чистым. Не добавляй лишних комментариев, только исправленный текст.`;

const VOICE_CLEANUP_INSTRUCTION = `Ты — помощник по расшифровке голоса.
Исправь ошибки распознавания речи (STT), расставь знаки препинания и сделай его связным.
Верни только очищенный текст без изменений смысла.`;

/**
 * Основная функция для обращения к OpenRouter через стандартный fetch.
 * Это необходимо, так как ключи OpenRouter несовместимы с Google GenAI SDK.
 */
async function callOpenRouter(prompt: string, instruction: string, model: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    console.error("SnapNote: API_KEY is missing in environment variables.");
    return null;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://snapnote.tma", // Требование OpenRouter для идентификации приложения
        "X-Title": "SnapNote TMA"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SnapNote: OpenRouter Error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error("SnapNote: OpenRouter API error:", data.error);
      return null;
    }

    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("SnapNote: Network Error calling OpenRouter:", error);
    return null;
  }
}

export async function processNoteWithAI(text: string): Promise<string | null> {
  return callOpenRouter(text, SYSTEM_INSTRUCTION, MODEL_GEMMA);
}

export async function improveEditedNote(text: string): Promise<string | null> {
  return callOpenRouter(text, POLISH_INSTRUCTION, MODEL_GEMMA);
}

export async function processVoiceTranscript(text: string): Promise<string | null> {
  return callOpenRouter(text, VOICE_CLEANUP_INSTRUCTION, MODEL_GEMINI_FLASH_LITE);
}
