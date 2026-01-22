export default async function handler(request, response) {

  const { prompt, instruction, model } = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

  // Determine which key to use based on the model or use case
  // In frontend, processVoiceTranscript uses VOICE_AI_KEY for MODEL_GEMINI_FLASH_LITE
  // Others (Gemma) use GEMINI_API_KEY

  let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  // Checks if using Flash Lite (Voice model)
  if (model.includes('flash-lite')) {
    apiKey = process.env.VOICE_AI_KEY || apiKey;
  }

  if (!apiKey) {
    return response.status(500).json({ error: 'Server configuration error: Missing API Key' });
  }

  try {
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return response.status(aiResponse.status).json({ error: errorText });
    }

    const data = await aiResponse.json();
    return response.status(200).json(data);

  } catch (error) {
    return response.status(500).json({ error: 'Error processing request' });
  }
}
