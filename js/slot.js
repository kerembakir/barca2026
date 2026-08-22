// Het slot. De inhoud staat versleuteld op de server; de sleutel zit in de link
// die in de groepsapp gedeeld wordt (#wachtwoord). Wie de kale URL vindt, ziet niets.

const enc = new TextEncoder()
const dec = new TextDecoder()

function vanBase64(b64) {
  const bin = atob(b64)
  const uit = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) uit[i] = bin.charCodeAt(i)
  return uit
}

async function sleutel(wachtwoord, salt) {
  const basis = await crypto.subtle.importKey('raw', enc.encode(wachtwoord), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    basis,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
}

// Geeft het ontsleutelde content-object terug, of gooit een fout bij een verkeerd wachtwoord.
export async function ontsleutel(payloadB64, wachtwoord) {
  const rauw = vanBase64(payloadB64)
  const salt = rauw.slice(0, 16)
  const iv = rauw.slice(16, 28)
  const data = rauw.slice(28)
  const k = await sleutel(wachtwoord.trim().toLowerCase(), salt)
  const plat = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k, data)
  return JSON.parse(dec.decode(plat))
}

export function sleutelUitLink() {
  const h = decodeURIComponent(location.hash.replace(/^#/, '')).trim()
  return h || null
}

const BEWAARD = 'barca2026:sleutel'
export const onthoudSleutel = (w) => { try { localStorage.setItem(BEWAARD, w) } catch {} }
export const bewaardeSleutel = () => { try { return localStorage.getItem(BEWAARD) } catch { return null } }
