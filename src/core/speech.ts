// ---------------------------------------------------------------------------
// Dutch text-to-speech, using the voice already on the phone. No audio files,
// nothing to host.
//
// One thing to know before reading any of this: an empty voice list does not
// mean a silent phone. Android hands `getVoices()` back empty for the first
// seconds, and on plenty of devices until something has actually been spoken —
// while `speak()` with `lang = 'nl-NL'` goes straight to the system engine and
// talks anyway. So the list is evidence of a voice when it has one, and
// evidence of nothing at all when it doesn't.
// ---------------------------------------------------------------------------

/** Only ever holds a hit: a cached miss would be a miss for the whole session. */
let cached: SpeechSynthesisVoice | null = null

export function supported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!supported()) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const dutch = voices.filter((v) => v.lang?.toLowerCase().startsWith('nl'))
  if (!dutch.length) return null
  // Prefer nl-NL over nl-BE, and a local voice over a network one.
  return (
    dutch.find((v) => v.lang.toLowerCase() === 'nl-nl' && v.localService) ??
    dutch.find((v) => v.lang.toLowerCase() === 'nl-nl') ??
    dutch[0]
  )
}

export function dutchVoice(): SpeechSynthesisVoice | null {
  if (!cached) cached = pickVoice()
  return cached
}

/** Voices load asynchronously on some platforms; re-check when they arrive. */
export function onVoicesReady(cb: () => void): () => void {
  if (!supported()) return () => {}
  const handler = () => {
    cached = null
    cb()
  }
  window.speechSynthesis.addEventListener('voiceschanged', handler)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler)
}

/**
 * Speaks the text and resolves when it stops, so the caller can show something
 * for exactly as long as it is talking.
 *
 * Some platforms never fire `end` — a cancelled or failed utterance can go
 * quiet without telling anyone — so a timeout scaled to the length of the text
 * resolves it anyway. Better to stop an animation slightly late than to leave
 * it running for ever.
 */
export function speak(text: string, rate = 0.9): Promise<void> {
  if (!supported() || !text) return Promise.resolve()

  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = dutchVoice()
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'nl-NL'
  u.rate = rate

  return new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(failsafe)
      resolve()
    }
    // Roughly 12 characters a second at this rate, plus a little headroom.
    const failsafe = setTimeout(finish, 1200 + (text.length / 12) * 1000)
    u.onend = finish
    u.onerror = finish
    window.speechSynthesis.speak(u)
  })
}

export interface VoiceReport {
  supported: boolean
  /** A named Dutch voice in the list. Its absence proves nothing — see above. */
  found: boolean
  name?: string
  lang?: string
  local?: boolean
}

export function voiceReport(): VoiceReport {
  if (!supported()) return { supported: false, found: false }
  const v = dutchVoice()
  if (!v) return { supported: true, found: false }
  return { supported: true, found: true, name: v.name, lang: v.lang, local: v.localService }
}
