// ---------------------------------------------------------------------------
// Dutch text-to-speech, using the voice already on the phone. No audio files,
// nothing to host. Availability varies by device, which is why the home screen
// reports what it found.
// ---------------------------------------------------------------------------

let cached: SpeechSynthesisVoice | null | undefined

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
  if (cached === undefined) cached = pickVoice()
  return cached ?? null
}

/** Voices load asynchronously on some platforms; re-check when they arrive. */
export function onVoicesReady(cb: () => void): () => void {
  if (!supported()) return () => {}
  const handler = () => {
    cached = undefined
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
