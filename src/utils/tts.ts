export function speak(text: string, langCode: string) {
  if (!('speechSynthesis' in window)) {
    console.warn('TTS not supported in this browser')
    return
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  
  // Map common 2-letter codes to BCP-47
  const langMap: Record<string, string> = {
    'en': 'en-US',
    'ru': 'ru-RU',
    'tr': 'tr-TR',
    'es': 'es-ES',
    'de': 'de-DE',
    'fr': 'fr-FR',
    'uk': 'uk-UA',
  }
  
  const targetLang = langMap[langCode.toLowerCase()] || (langCode.includes('-') ? langCode : `${langCode}-${langCode.toUpperCase()}`)
  utterance.lang = targetLang
  
  // Helper to actually speak
  const doSpeak = () => {
    const voices = window.speechSynthesis.getVoices()
    
    // 1. Try to find exact match (e.g., ru-RU)
    let voice = voices.find(v => v.lang === targetLang)
    
    // 2. Try to find language prefix match (e.g., ru)
    if (!voice) {
      const prefix = targetLang.split('-')[0]
      voice = voices.find(v => v.lang.startsWith(prefix))
    }
    
    // 3. Fallback to any voice (might sound weird, but at least it speaks)
    if (voice) {
      utterance.voice = voice
    } else {
      console.warn(`No voice found for language ${targetLang}. Using default.`)
    }

    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  // If voices are already loaded, speak immediately. Otherwise, wait for the event.
  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak()
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      doSpeak()
      window.speechSynthesis.onvoiceschanged = null // cleanup
    }
  }
}
