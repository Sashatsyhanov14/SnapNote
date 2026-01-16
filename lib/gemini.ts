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
async function callBackendProxy(prompt: string, instruction: string, model: string): Promise<string | null> {
  try {
    const response = await fetch('/api/chat', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        instruction,
        model
      })
    });

    if (!response.ok) {
        console.error(`SnapNote: Backend API Error (${response.status})`);
        return null;
    }

    const data = await response.json();
    
    if (data.error) {
        console.error("SnapNote: Backend API returned error:", data.error);
        return null; 
    }

    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("SnapNote: Network Error calling Backend:", error);
    return null;
  }
}

export async function processNoteWithAI(text: string): Promise<string | null> {
  return callBackendProxy(text, SYSTEM_INSTRUCTION, MODEL_GEMMA);
}

export async function improveEditedNote(text: string): Promise<string | null> {
  return callBackendProxy(text, POLISH_INSTRUCTION, MODEL_GEMMA);
}

export async function processVoiceTranscript(text: string): Promise<string | null> {
  return callBackendProxy(text, VOICE_CLEANUP_INSTRUCTION, MODEL_GEMINI_FLASH_LITE);
}
