export async function callAI(prompt: string, provider: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error("API Key is missing. Go to Settings to add it.")
  if (provider === 'none') throw new Error("No AI provider selected in Settings.")

  const cleanKey = apiKey.trim()

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${cleanKey}`
    console.log("[AI] Requesting:", url.replace(cleanKey, "***"))
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
      })
    })
    
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || `HTTP ${res.status}`)
    }
    
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error("Empty response from Gemini")
    return text
  } 
  
  else if (provider === 'openai' || provider === 'deepseek') {
    const endpoint = provider === 'openai' 
      ? 'https://api.openai.com/v1/chat/completions' 
      : 'https://api.deepseek.com/v1/chat/completions'
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`
      },
      body: JSON.stringify({
        model: provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      })
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || `HTTP ${res.status}`)
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error("Empty response from provider")
    return text
  }

  throw new Error("Unsupported provider")
}

// Helper to extract raw JSON from markdown fences (```json ... ```)
export function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (match && match[1]) return match[1].trim()
  return text.trim()
}
