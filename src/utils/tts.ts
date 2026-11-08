export function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window)) {
    console.warn('TTS not supported in this browser')
    return
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  
  // Map common 2-letter codes to BCP-47 if needed, or just pass as is
  const langMap: Record<string, string> = {
    'en': 'en-US',
    'ru': 'ru-RU',
    'tr': 'tr-TR',
    'es': 'es-ES',
    'de': 'de-DE',
    'fr': 'fr-FR',
  }
  
  const targetLang = langMap[lang.toLowerCase()] || lang
  utterance.lang = targetLang
  
  // Try to find a good voice
  const voices = window.speechSynthesis.getVoices()
  const voice = voices.find(v => v.lang.startsWith(targetLang))
  if (voice) utterance.voice = voice

  utterance.rate = 0.9 // Slightly slower for learning
  window.speechSynthesis.speak(utterance)
}
