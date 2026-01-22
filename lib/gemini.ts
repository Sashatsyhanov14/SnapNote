/**
 * Утилита для интеграции с OpenRouter.
 * Исправляет ошибку 401, гарантируя правильный формат заголовка Authorization 
 * и наличие заголовка HTTP-Referer, который требуется OpenRouter.
 */

const MODEL_GEMMA = "google/gemma-3-27b-it:free";
const MODEL_GEMINI_FLASH_LITE = "google/gemini-2.5-flash-lite";

const SYSTEM_INSTRUCTION = `Ты — профессиональный редактор и структуратор заметок.
Твоя задача: превратить сырой текст пользователя в идеально структурированный документ.

ПРАВИЛА ОФОРМЛЕНИЯ:
1. ЗАГОЛОВОК: КАЖДАЯ заметку ОБЯЗАНА начинаться с заголовка H1 (#), который кратко отражает суть.
2. СТРУКТУРА: Разбивай текст на логические блоки с подзаголовками H2 (##).
3. СПИСКИ: Все перечисления оформляй как маркированные (-) или нумерованные (1.) списки. Важные задачи — чекбоксы ([ ]).
4. АКЦЕНТЫ: Выделяй **ключевые сущности**, **даты**, **имена** и **важные термины** жирным.
5. ЧИСТОТА: Убирай слова-паразиты, тавтологию и воду. Текст должен быть плотным и информативным.
6. СТИЛЬ: Сохраняй авторский стиль, но делай его грамотным и литературным.

ВАЖНО:
- Заголовок H1 (#) обязателен даже для коротких заметок (придумай подходящий по смыслу).
- Максимально используй списки и структуру.
- Пиши на языке оригинала.`;

const POLISH_INSTRUCTION = `Ты — элитный литературный редактор. Пользователь внес правки в заметку.
Твоя цель: Довести текст до совершенства, опираясь на эти правки, сохраняя жесткую структуру.

ЧТО ДЕЛАТЬ:
1. Убедись, что у заметки есть заголовок H1 (#). Если нет — добавь.
2. Исправь любые грамматические, пунктуационные и стилистические шероховатости.
3. Улучши форматирование (добавь **жирный** для акцентов, выровняй списки).
4. Сделай текст визуально приятным и легким для чтения.

ОГРАНИЧЕНИЯ:
- Не меняй смысл того, что написал пользователь.
- Верни ТОЛЬКО готовый Markdown текст.`;

const VOICE_CLEANUP_INSTRUCTION = `Ты — модуль обработки голосового ввода.
Твоя задача: Исправить ошибки распознавания (STT) и выполнить голосовые команды форматирования.

1. ИСПРАВЛЕНИЕ:
   - Исправь окончания, падежи и опечатки, характерные для STT.
   - Расставь знаки препинания по смыслу и интонации (угадай её).

2. КОМАНДЫ (Интерпретируй, а не пиши словами):
   - "Заголовок..." -> оформи как # Заголовок
   - "Новая строка" / "Абзац" -> перенос строки
   - "Пункт..." / "Тире..." -> элемент списка - ...
   - "Чекбокс..." / "Задача..." -> [ ] ...

3. РЕЗУЛЬТАТ:
   - ОБЯЗАТЕЛЬНО: Первая строка должна быть заголовком H1 (#).
   - Верни чистый, читаемый текст, готовый для последующей обработки.
   - Не пиши "Вот исправленный текст:". Только текст.`;

/**
 * Основная функция для обращения к OpenRouter через стандартный fetch.
 * Это необходимо, так как ключи OpenRouter несовместимы с Google GenAI SDK.
 */
/**
 * Функция для обращения к нашему API (Serverless Function).
 * Это скрывает ключи API от клиента и решает проблемы с CORS.
 */
async function callBackendAPI(prompt: string, instruction: string, model: string): Promise<string | null> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, instruction, model })
    });

    // If we get an HTML response (likely Vite serving index.html for unknown route), throw to trigger fallback
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      throw new Error("Local environment detected (HTML response from API)");
    }

    if (!response.ok) {
      // If it's a 404, it might be local dev without API support -> fallback
      if (response.status === 404) throw new Error("API not found (404)");
      const error = await response.text();
      console.error(`SnapNote: Backend Error (${response.status}):`, error);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.warn("SnapNote: Backend unreachable, trying client-side fallback...", error);
    throw error; // Rethrow to trigger fallback
  }
}

async function callOpenRouter(prompt: string, instruction: string, model: string, apiKey: string): Promise<string | null> {
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
        model,
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error("SnapNote: Client-side API error", e);
    return null;
  }
}

async function callAI(prompt: string, instruction: string, model: string, clientKey?: string): Promise<string | null> {
  try {
    return await callBackendAPI(prompt, instruction, model);
  } catch (e) {
    if (clientKey) {
      console.log("SnapNote: Falling back to Client-side API call");
      return callOpenRouter(prompt, instruction, model, clientKey);
    }
    console.error("SnapNote: API Failed and no client key provided for fallback.");
    return null;
  }
}

export async function processNoteWithAI(text: string): Promise<string | null> {
  // Use VITE_API_KEY as fallback
  return callAI(text, SYSTEM_INSTRUCTION, MODEL_GEMMA, import.meta.env.VITE_API_KEY);
}

export async function improveEditedNote(text: string): Promise<string | null> {
  return callAI(text, POLISH_INSTRUCTION, MODEL_GEMMA, import.meta.env.VITE_API_KEY);
}

export async function processVoiceTranscript(text: string): Promise<string | null> {
  const key = import.meta.env.VITE_VOICE_AI_KEY || import.meta.env.VITE_API_KEY;
  return callAI(text, VOICE_CLEANUP_INSTRUCTION, MODEL_GEMINI_FLASH_LITE, key);
}
