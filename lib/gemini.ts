/**
 * Утилита для интеграции с OpenRouter.
 * Исправляет ошибку 401, гарантируя правильный формат заголовка Authorization 
 * и наличие заголовка HTTP-Referer, который требуется OpenRouter.
 */

const MODEL_GEMMA = "google/gemma-3-27b-it:free";
const MODEL_GEMINI_FLASH_LITE = "google/gemini-2.5-flash-lite";

const SYSTEM_INSTRUCTION = `Ты — редактор заметок. Твоя задача: структурировать текст и исправить ошибки.

СТРОГО:
1. Сохраняй весь оригинальный смысл и содержание — НЕ добавляй лишнюю информацию.
2. Исправь грамматические и орфографические ошибки.
3. Добавь короткий заголовок # только если текст явно о чём-то конкретном.
4. Используй **жирный текст** для ключевых слов из оригинала.
5. Если есть перечисление — преобразуй в список (-) или чекбоксы ([ ]).
6. Удали слова-паразиты ("ну", "вот", "типа", "короче").
7. Пиши на языке оригинала.

ЗАПРЕЩЕНО: добавлять выводы, пояснения, дополнительные разделы или информацию, которой не было в оригинале.`;

const POLISH_INSTRUCTION = `Ты — корректор текста. Пользователь редактирует свою заметку.

ЗАДАЧА: Исправь ошибки и улучши читаемость, сохраняя Markdown.

ПРАВИЛА:
1. НЕ добавляй новые разделы, выводы или информацию.
2. Исправь только грамматику, пунктуацию и стилистику.
3. Сохрани всю структуру и форматирование.
4. Верни ТОЛЬКО исправленный текст без комментариев.`;

const VOICE_CLEANUP_INSTRUCTION = `Ты — помощник по расшифровке голоса.
Исправь ошибки распознавания речи (STT), расставь знаки препинания и сделай его связным.
Верни только очищенный текст без изменений смысла.`;

/**
 * Основная функция для обращения к OpenRouter через стандартный fetch.
 * Это необходимо, так как ключи OpenRouter несовместимы с Google GenAI SDK.
 */
async function callOpenRouter(prompt: string, instruction: string, model: string, apiKey: string): Promise<string | null> {
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
        "HTTP-Referer": "https://snapnote.tma",
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
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) return null;
  return callOpenRouter(text, SYSTEM_INSTRUCTION, MODEL_GEMMA, apiKey);
}

export async function improveEditedNote(text: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) return null;
  return callOpenRouter(text, POLISH_INSTRUCTION, MODEL_GEMMA, apiKey);
}

export async function processVoiceTranscript(text: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_VOICE_AI_KEY || import.meta.env.VITE_API_KEY;
  if (!apiKey) return null;
  return callOpenRouter(text, VOICE_CLEANUP_INSTRUCTION, MODEL_GEMINI_FLASH_LITE, apiKey);
}
