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
   - Верни чистый, читаемый текст, готовый для последующей обработки (или как финальную заметку).
   - Не пиши "Вот исправленный текст:". Только текст.`;

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
