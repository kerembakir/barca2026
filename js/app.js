import { ontsleutel, sleutelUitLink, onthoudSleutel, bewaardeSleutel } from './slot.js?v=53d63b7b'
import { SPELLEN } from './spellen.js?v=53d63b7b'
import { schermOefeningen } from './oefeningen.js?v=53d63b7b'

const $app = document.getElementById('app')
const OPSLAG = 'barca2026:staat'

let C = null   // alle content (spelers, scenes, programma)
let S = null   // spelstaat

/* ------------------------------------------------------------------ helpers */

const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Mini-opmaak: *cursief*, **vet**, en zachte afbreek.
const opmaak = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.+?)\*/g, '<em>$1</em>')

// Stabiele pseudo-random op basis van een string, zodat iedereen bij dezelfde
// scene dezelfde 'willekeurige' teamgenoot krijgt.
function zaad(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h)
}

function speler() { return C.spelers.find((s) => s.id === S.speler) || C.spelers[0] }

function anderSpeler(sleutel) {
  const rest = C.spelers.filter((s) => s.id !== S.speler)
  return rest[zaad(sleutel + S.speler) % rest.length]
}

// {jij} {bij} {ander} {ander2} in scenetekst invullen.
function tokens(tekst, sceneId) {
  const ik = speler()
  const sk = C.skills?.[ik.id] || {}
  return tekst
    .replace(/\{skill\}/g, sk.skill || '')
    .replace(/\{wat\}/g, sk.wat || '')
    .replace(/\{blokkade\}/g, sk.blokkade || '')
    .replace(/\{eis\}/g, sk.eis || '')
    .replace(/\{bewijs\}/g, sk.bewijs || '')
    .replace(/\{na\}/g, sk.na || '')
    .replace(/\{jij\}/g, ik.naam)
    .replace(/\{bij\}/g, ik.bijnaam || ik.naam)
    .replace(/\{ander2\}/g, () => anderSpeler(sceneId + 'b').naam)
    .replace(/\{ander\}/g, () => anderSpeler(sceneId).naam)
}

// Elke man krijgt een eigen wapenschild: zijn kleur, zijn letter, zijn ding.
// Getekend in SVG zodat er niets te laden valt op een telefoon in een taxi.
// De drie Andreaskruisen uit het clubwapen, op een rij in de zwarte kop.
function kruisjes() {
  return [15, 26, 37].map((x) => `
      <rect x="${x - 3.4}" y="9.6" width="6.8" height="2.8" rx="0.9" transform="rotate(45 ${x} 11)"/>
      <rect x="${x - 3.4}" y="9.6" width="6.8" height="2.8" rx="0.9" transform="rotate(-45 ${x} 11)"/>`).join('')
}

// Elke speler krijgt zijn eigen clubwapen: de vorm van het echte wapen, zijn kleur,
// zijn letter en het ding waar hij om bekendstaat.
const SCHILD = 'M4 7Q4 2 9 2H43Q48 2 48 7V31C48 45.5 38.5 55.5 26 61.5 13.5 55.5 4 45.5 4 31Z'

function avatar(sp, maat = 56) {
  const h = sp.hue ?? 20
  const letter = sp.naam.length <= 2 ? sp.naam : sp.naam[0]
  const id = `av-${sp.id}`
  const breed = Math.round(maat * 0.82)
  return `<svg class="avatar" viewBox="0 0 52 64" width="${breed}" height="${maat}" role="img" aria-label="${esc(sp.naam)}">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color="hsl(${h} 82% 58%)"/>
        <stop offset="1" stop-color="hsl(${(h + 28) % 360} 70% 30%)"/>
      </linearGradient>
      <clipPath id="${id}-c"><path d="${SCHILD}"/></clipPath>
    </defs>
    <path d="${SCHILD}" fill="url(#${id})"/>
    <g clip-path="url(#${id}-c)">
      <path d="M0 0h52v20H0z" fill="#100F10"/>
      <g fill="#FFF8F0">${kruisjes()}</g>
      <path d="M0 20h52v2.2H0z" fill="#F1CE4B" opacity="0.85"/>
    </g>
    <path d="${SCHILD}" fill="none" stroke="rgba(255,248,240,0.5)" stroke-width="2.2"/>
    <text x="26" y="43" text-anchor="middle" font-family="Anton, Impact, sans-serif"
          font-size="25" fill="#FFF8F0" stroke="rgba(10,14,39,0.5)" stroke-width="2.4"
          paint-order="stroke">${esc(letter)}</text>
    <text x="26" y="56" text-anchor="middle" font-size="11">${sp.icoon || ''}</text>
  </svg>`
}

function toast(bericht) {
  document.querySelector('.toast')?.remove()
  const t = el(`<div class="toast">${esc(bericht)}</div>`)
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2200)
}

/* -------------------------------------------------------------------- staat */

function nieuweStaat() {
  return { v: 1, speler: null, fx: { drank: 0, chaos: 0, cond: 0, charme: 0, betrouw: 0 }, vlaggen: {}, badges: [], gezien: [], scene: null, toets: null, onthuld: false }
}

function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(S)) } catch {} }

function laad() {
  try {
    const rauw = JSON.parse(localStorage.getItem(OPSLAG) || 'null')
    if (rauw && rauw.v === 1 && rauw.scene && C.scenes[rauw.scene]) return rauw
  } catch {}
  return null
}

// Totaalscore per eigenschap = basis van je speler + wat je onderweg hebt uitgevreten.
function score(eig) {
  const basis = speler().stats?.[eig] ?? 5
  return Math.max(0, Math.min(12, basis + (S.fx[eig] || 0)))
}

/* ------------------------------------------------------------------ topbalk */

// Hoe ver je bent, zodat de week niet eindeloos voelt.
function voortgang(scene) {
  const i = C.dagen.findIndex((d) => d.id === scene?.dagId)
  return Math.round(((i < 0 ? 0 : i + 1) / (C.dagen.length + 1)) * 100)
}

function topbalk(scene) {
  const dag = C.dagen.find((d) => d.id === scene?.dagId)
  const bal = el(`
    <div class="topbalk">
      ${S.speler ? (S.onthuld ? avatar(speler(), 34) : avatarVerhuld(34)) : ''}
      <div class="wanneer">
        <b>${esc(scene?.wanneer || 'Barça 2026')}</b>
        <span>${esc(dag ? `${dag.label} ${dag.datum}` : 'Ibiza')}</span>
        <span class="voortgang klein"><i style="width:${voortgang(scene)}%"></i></span>
      </div>
      <button class="pil klein" data-doe="menu" aria-label="Menu">···</button>
    </div>`)
  bal.querySelector('[data-doe="menu"]').onclick = toonMenu
  return bal
}

function toonMenu() {
  const p = el(`
    <div class="paneel"><div class="paneel-binnen">
      <div class="paneel-kop"><h2>Menu</h2><button class="pil" data-sluit>Sluiten</button></div>
      <button class="knop spook" data-doe="toets">De Barca-toets maken</button>
      <div style="height:10px"></div>
      <button class="knop spook" data-doe="wissel">Andere speler kiezen</button>
      <div style="height:10px"></div>
      <button class="knop spook" data-doe="opnieuw">Helemaal opnieuw beginnen</button>
      <div class="voet">Barça 2026 · Ibiza · 26–30 augustus<br>Gemaakt door Team Programmaboek</div>
    </div></div>`)
  p.querySelector('[data-sluit]').onclick = () => p.remove()
  p.querySelector('[data-doe="toets"]').onclick = () => { p.remove(); schermToets(null) }
  p.querySelector('[data-doe="wissel"]').onclick = () => { p.remove(); schermSpelers() }
  p.querySelector('[data-doe="opnieuw"]').onclick = () => {
    if (!confirm('Alles wissen en opnieuw beginnen?')) return
    S = nieuweStaat(); bewaar(); p.remove(); schermTitel()
  }
  document.body.appendChild(p)
}

/* ------------------------------------------------------------------ schermen */

// De lucht verandert mee met waar je bent.
function sfeer(naam) { document.body.dataset.sfeer = naam || 'villa' }
function effect(naam) {
  if (naam) document.body.dataset.effect = naam
  else delete document.body.dataset.effect
}

function toon(...knopen) {
  $app.replaceChildren(...knopen.filter(Boolean))
  window.scrollTo({ top: 0 })
}

function schermTitel() {
  sfeer('villa')
  effect(null)
  const opgeslagen = laad()
  const s = el(`
    <div class="scherm titelscherm">
      <div class="wapenhero"><span class="zon"></span><img class="wapen" src="${C.logo}" alt="Clubwapen"></div>
      <p class="kicker">${esc(C.trip.groep)}</p>
      <h1 class="titel">${esc(C.trip.titel)}<br>${esc(C.trip.ondertitel)}</h1>
      <div class="streep"></div>
      <p class="datum">${esc(C.trip.datum)}</p>
      <p style="color:var(--tekst-zacht);font-size:14.5px;line-height:1.6;margin:0 auto;max-width:34ch">
        Een programmaboekje dat stiekem geen programmaboekje is.<br>Kies je man en speel de week.<br>
        <b style="color:var(--zand)">Speel hem daarna nog eens als iemand anders. Elke man ziet een andere week.</b>
      </p>
      <div class="knoppen">
        ${opgeslagen ? '<button class="knop" data-doe="verder">Verder waar je was</button>' : ''}
        <button class="knop ${opgeslagen ? 'spook' : ''}" data-doe="start">${opgeslagen ? 'Opnieuw beginnen' : 'Start'}</button>
        <button class="knop spook" data-doe="programma">Ik wil gewoon het programma</button>
      </div>
      <div class="voet">Team Programmaboek · Erwin &amp; Kerem</div>
    </div>`)
  s.querySelector('[data-doe="start"]').onclick = () => { S = nieuweStaat(); bewaar(); schermSpelers() }
  s.querySelector('[data-doe="programma"]')?.addEventListener('click', toonProgramma)
  s.querySelector('[data-doe="verder"]')?.addEventListener('click', () => { S = opgeslagen; ganaar(S.scene) })
  toon(s)
}

// Je eigen wapen blijft onder een doek tot het eindrapport. Erwins idee.
function avatarVerhuld(maat = 34) {
  const breed = Math.round(maat * 0.82)
  return `<svg class="avatar verhuld" viewBox="0 0 52 64" width="${breed}" height="${maat}" role="img" aria-label="Je wapen is nog niet onthuld">
    <path d="${SCHILD}" fill="#1B1730"/>
    <path d="${SCHILD}" fill="none" stroke="rgba(255,248,240,0.28)" stroke-width="2.2" stroke-dasharray="4 4"/>
    <text x="26" y="44" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="26" fill="rgba(255,248,240,0.45)">?</text>
  </svg>`
}

function statbalkjes(sp) {
  const eigs = [['drank', 'Drankdorst'], ['chaos', 'Chaos'], ['cond', 'Conditie'], ['charme', 'Charme'], ['betrouw', 'Solide']]
  return eigs.map(([k, label]) => `
    <div class="statrij">
      <span class="label">${label}</span>
      <span class="balk"><i style="width:${(sp.stats?.[k] ?? 5) * 10}%"></i></span>
    </div>`).join('')
}

function schermSpelers() {
  sfeer('villa')
  effect(null)
  const kaarten = C.spelers.map((sp, i) => `
    <button class="speler-kaart" data-id="${esc(sp.id)}" aria-pressed="${S.speler === sp.id}">
      <span class="nr">${String(i + 1).padStart(2, '0')}</span>
      <div class="kop-rij">${avatar(sp, 46)}<div class="naam">${esc(sp.naam)}</div></div>
      ${sp.bijnaam ? `<div class="bijnaam">${esc(sp.bijnaam)}</div>` : ''}
      <div class="rol">${esc(sp.rol)}</div>
      <div class="skill">${esc(C.skills?.[sp.id]?.skill || '')}</div>
      ${statbalkjes(sp)}
    </button>`).join('')

  const s = el(`
    <div class="scherm">
      <p class="kicker">Stap 1</p>
      <h2 class="display" style="font-size:clamp(30px,9vw,44px);margin:6px 0 4px;color:var(--wit)">Wie ben jij?</h2>
      <p style="color:var(--tekst-zacht);font-size:14.5px;margin:0 0 16px;line-height:1.55">
        Kies jezelf. Of kies iemand anders, dan zie je de week door zijn ogen. Dat is soms leerzamer.
      </p>
      <div class="spelers">${kaarten}</div>
      <div style="height:16px"></div>
      <button class="knop" data-doe="ga" disabled style="opacity:.4">Kies eerst een man</button>
      <div style="height:10px"></div>
      <button class="knop spook" data-doe="terug">Terug</button>
    </div>`)

  const ga = s.querySelector('[data-doe="ga"]')
  s.querySelectorAll('.speler-kaart').forEach((k) => {
    k.onclick = () => {
      S.speler = k.dataset.id
      s.querySelectorAll('.speler-kaart').forEach((x) => x.setAttribute('aria-pressed', String(x === k)))
      ga.disabled = false
      ga.style.opacity = '1'
      ga.textContent = `Ga naar Ibiza als ${C.spelers.find((x) => x.id === S.speler).naam}`
      bewaar()
    }
  })
  ga.onclick = () => {
    S.fx = { drank: 0, chaos: 0, cond: 0, charme: 0, betrouw: 0 }; S.vlaggen = {}; S.badges = []; S.gezien = []; S.toets = null
    // Wie op de verplichte lijst staat mag pas mee als hij de toets heeft gemaakt.
    if ((C.toets?.verplicht || []).includes(S.speler)) schermToets(() => ganaar(C.start))
    else ganaar(C.start)
  }
  s.querySelector('[data-doe="terug"]').onclick = schermTitel

  if (S.speler) {
    ga.disabled = false; ga.style.opacity = '1'
    ga.textContent = `Ga naar Ibiza als ${speler().naam}`
  }
  toon(s)
}

function zichtbaar(k) {
  if (k.als && !S.vlaggen[k.als]) return false
  if (k.alsNiet && S.vlaggen[k.alsNiet]) return false
  if (k.alsSpeler && !k.alsSpeler.includes(S.speler)) return false
  if (k.nietSpeler && k.nietSpeler.includes(S.speler)) return false
  if (k.alsMinstens) {
    for (const [eig, n] of Object.entries(k.alsMinstens)) if (score(eig) < n) return false
  }
  return true
}

function schermVerhaal(scene) {
  sfeer(scene.sfeer)
  effect(scene.effect)
  // Een tekstregel is een string, of {t, alsSpeler, nietSpeler, als, alsNiet, alsMinstens}
  // zodat niet iedereen dezelfde week leest.
  const regels = scene.tekst
    .map((r) => (typeof r === 'string' ? { t: r } : r))
    .filter(zichtbaar)
  const alinea = regels
    .map((r, i) => `<p style="animation-delay:${i * 90}ms">${opmaak(tokens(r.t, scene.id))}</p>`)
    .join('')

  // Een mini-spel speel je één keer; daarna staat de uitslag vast en zie je de keuzes.
  const speelNu = !!scene.spel && !S.vlaggen[`spel:${scene.id}`]

  const keuzes = (scene.keuzes || []).filter(zichtbaar)
  const letters = 'ABCDEFGH'
  const keuzeHtml = keuzes.map((k, i) => `
    <button class="keuze" data-i="${i}" style="animation-delay:${(regels.length * 90) + i * 70}ms">
      <span class="letter">${letters[i]}</span>
      <span>${opmaak(tokens(k.tekst, scene.id + i))}</span>
    </button>`).join('')

  const s = el(`
    <div class="scherm verhaal">
      <div class="scene-kop">
        <p class="kicker">${esc(scene.kicker || '')}</p>
        <h2>${esc(tokens(scene.titel, scene.id))}</h2>
      </div>
      ${scene.beeld && C.beelden?.[scene.beeld] ? `<img class="scenebeeld" src="${C.beelden[scene.beeld]}" alt="">` : ''}
      <div class="tekst">${alinea}</div>
      ${speelNu ? '<div class="spelvak"></div>' : ''}
      <div class="keuzes"${speelNu ? ' hidden' : ''}>${keuzeHtml}</div>
      ${scene.einde ? '<div style="height:6px"></div><button class="knop" data-doe="rapport">Naar je Ibiza-rapport</button>' : ''}
    </div>`)

  s.querySelectorAll('.keuze').forEach((b) => {
    b.onclick = () => kies(keuzes[Number(b.dataset.i)], scene)
  })
  s.querySelector('[data-doe="rapport"]')?.addEventListener('click', schermRapport)

  // Een scene mag een mini-spel dragen. De keuzes komen pas als het gespeeld is.
  if (speelNu) {
    const vak = s.querySelector('.spelvak')
    const spel = SPELLEN[scene.spel.soort]
    if (!spel) { s.querySelector('.keuzes').hidden = false }
    else spel(vak, { speler: S.speler, beeld: C.beelden?.[scene.spel.beeld], vraag: scene.spel.vraag, mist: scene.spel.mist, nummers: scene.spel.nummers, dingen: scene.spel.dingen, zones: scene.spel.zones, uitleg: scene.spel.uitleg, uitweg: scene.spel.uitweg }, (uitslag) => {
      const vlag = uitslag.gelukt ? scene.spel.vlagGelukt : scene.spel.vlagMislukt
      if (vlag) S.vlaggen[vlag] = true
      S.vlaggen[`spel:${scene.id}`] = true
      if (uitslag.gelukt && scene.spel.badge && !S.badges.some((b) => b.id === scene.spel.badge.id)) {
        S.badges.push(scene.spel.badge)
        toast(`🏅 ${scene.spel.badge.naam}`)
      }
      bewaar()
      schermVerhaal(scene)
    })
  }

  toon(topbalk(scene), s)

  // Sommige mannen worden midden in de week onderbroken door hun eigen ding.
  const gag = C.gags?.[scene.id]
  if (gag && gag.speler === S.speler && !S.vlaggen[`gag:${scene.id}`]) toonGag(scene.id, gag)
}

// De pop-up die je persoonlijk onderbreekt. Eén keer per run.
function toonGag(sceneId, gag) {
  const p = el(`
    <div class="paneel gagpaneel"><div class="paneel-binnen gagbinnen">
      <div class="gagicoon">${gag.icoon}</div>
      <p class="kicker">${esc(gag.kop)}</p>
      <div class="tekst">${gag.tekst.map((r) => `<p>${opmaak(r)}</p>`).join('')}</div>
      <button class="knop" data-sluit>${esc(gag.knop)}</button>
    </div></div>`)
  p.querySelector('[data-sluit]').onclick = () => {
    S.vlaggen[`gag:${sceneId}`] = true
    bewaar()
    p.remove()
  }
  document.body.appendChild(p)
}

function kies(k, scene) {
  if (k.fx) for (const [eig, n] of Object.entries(k.fx)) S.fx[eig] = (S.fx[eig] || 0) + n
  if (k.wis) for (const v of k.wis) delete S.vlaggen[v]
  if (k.vlag) S.vlaggen[k.vlag] = true
  if (k.badge && !S.badges.some((b) => b.id === k.badge.id)) {
    S.badges.push(k.badge)
    toast(`🏅 ${k.badge.naam}`)
  }
  bewaar()
  if (k.naar === '#kies') return schermSpelers()
  if (k.naar === '#rapport') return schermRapport()
  ganaar(k.naar)
}

function ganaar(id) {
  const scene = C.scenes[id]
  if (!scene) { console.warn('onbekende scene', id); return schermTitel() }
  S.scene = id
  if (!S.gezien.includes(id)) S.gezien.push(id)
  bewaar()
  schermVerhaal(scene)
}

/* ------------------------------------------------------------------ rapport */

function bepaalVerdict() {
  // De uitslag hoort te gaan over hoe JIJ gespeeld hebt, niet over wie je gekozen
  // hebt. Daarom telt alleen wat je onderweg verdiend hebt (S.fx), niet je basisstats.
  const heeft = (id) => S.badges.some((b) => b.id === id)

  // Speciale uitslagen gaan voor: die zijn verdiend, niet uitgerekend.
  for (const v of C.verdicts.filter((x) => x.badges)) {
    if (v.badges.every(heeft)) return v
  }
  if (!S.badges.length) {
    const leeg = C.verdicts.find((v) => v.id === 'onopvallend')
    if (leeg) return leeg
  }
  // Wie de hele week geen enkele keer voor de pils koos, verdient de meest
  // gekopieerde zin uit het archief.
  if (!Math.max(0, S.fx.drank || 0)) {
    const droog = C.verdicts.find((v) => v.id === 'geenbier')
    if (droog) return droog
  }

  const gescoord = C.verdicts
    .filter((v) => v.as)
    .map((v) => ({ v, punten: Math.max(0, S.fx[v.as] || 0) }))
    .sort((a, b) => b.punten - a.punten)

  // Eén as moet er duidelijk bovenuit steken. Zo niet, dan was je gewoon
  // een prettige teamgenoot en dat is ook een uitslag.
  const [eerste, tweede] = gescoord
  if (!eerste.punten || eerste.punten - (tweede?.punten || 0) < 2) {
    return C.verdicts.find((v) => v.id === 'evenwicht')
  }
  return eerste.v
}

function fxOverzicht() {
  const assen = [['drank', 'Drankdorst'], ['chaos', 'Chaos'], ['cond', 'Conditie'], ['charme', 'Charme'], ['betrouw', 'Solide']]
  const max = Math.max(4, ...assen.map(([k]) => Math.max(0, S.fx[k] || 0)))
  return assen.map(([k, label]) => `
    <div class="statrij">
      <span class="label">${label}</span>
      <span class="balk"><i style="width:${Math.round((Math.max(0, S.fx[k] || 0) / max) * 100)}%"></i></span>
    </div>`).join('')
}

// De derde weg: wie na twee potjes de bodem ziet, kan zijn eigen tak starten bij
// een AI-verteller. Wij leveren de prompt, met de harde programmaregels erin.
function dungeonPrompt() {
  const ik = speler()
  const programma = C.dagen.map((d) => {
    const regels = d.blokken.filter((b) => !b.leeg).map((b) => `${b.deel.toLowerCase()}: ${b.tekst}`)
    return `${d.label} ${d.datum}: ${regels.join('; ')}`
  }).join('\n')

  return [
    'Je bent de verteller van een tekstavontuur op Ibiza. Schrijf in het Nederlands, kleedkamerhumor, korte zinnen.',
    '',
    `Ik speel ${ik.naam}${ik.bijnaam ? ` (${ik.bijnaam})` : ''}. ${ik.rol}`,
    '',
    'Wij zijn een Amsterdams voetbalteam, zeventien man, op teamreis in Villa Nieves bij Sant Antoni op Ibiza, van woensdag 26 tot zondag 30 augustus 2026. De reis heet Barca2026Ibiza, want sinds de eerste reis naar Barcelona in 2006 heet elke teamreis Barca.',
    '',
    'Mijn teamgenoten:',
    ...C.spelers.filter((x) => x.id !== ik.id).map((x) => `- ${x.naam}${x.bijnaam ? ` (${x.bijnaam})` : ''}: ${x.rol}`),
    '',
    'Dit programma staat vast en mag je niet veranderen:',
    programma,
    '',
    'Begin op woensdagmiddag bij aankomst. Vertel waar we zijn en wat er gebeurt, en geef me daarna steeds drie keuzes (A, B, C). Ik mag ook zelf iets typen. Verwerk het programma hierboven als de harde ruggengraat van het verhaal.',
  ].join('\n')
}

/* --------------------------------------------------------------- de toets */

// Toelatingsexamen over de vorige reizen. Verplicht voor wie op de lijst staat,
// vrijwillig voor de rest. klaar = wat er daarna gebeurt, of null voor terug.
function schermToets(klaar) {
  sfeer('villa')
  effect(null)
  const T = C.toets
  let i = 0
  let goed = 0

  function vraag() {
    const q = T.vragen[i]
    const v = el(`
      <div class="scherm">
        <p class="kicker">Vraag ${i + 1} van ${T.vragen.length}</p>
        <div class="voortgang"><i style="width:${(i / T.vragen.length) * 100}%"></i></div>
        <h2 class="titel-groot" style="font-size:clamp(21px,5.6vw,29px)">${esc(q.v)}</h2>
        <div class="keuzes">
          ${q.opties.map((o, n) => `
            <button class="keuze" data-n="${n}"><span class="letter">${'ABCD'[n]}</span><span>${esc(o)}</span></button>`).join('')}
        </div>
        <div class="na"></div>
      </div>`)
    const na = v.querySelector('.na')
    v.querySelectorAll('.keuze').forEach((k) => {
      k.onclick = () => {
        const n = Number(k.dataset.n)
        const juist = n === q.goed
        if (juist) goed++
        v.querySelectorAll('.keuze').forEach((x, m) => {
          x.disabled = true
          if (m === q.goed) x.classList.add('goed')
          else if (m === n) x.classList.add('fout')
        })
        na.innerHTML = `
          <p class="oordeel ${juist ? 'goed' : 'fout'}">${juist ? 'Goed' : 'Fout'}</p>
          <p>${opmaak(q.na)}</p>
          <button class="knop" data-doe="door">${i + 1 < T.vragen.length ? 'Volgende vraag' : 'Naar de uitslag'}</button>`
        na.querySelector('[data-doe="door"]').onclick = () => { i++; toon(i < T.vragen.length ? vraag() : uitslag()) }
        na.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })
    return v
  }

  function uitslag() {
    const u = T.uitslagen.find((x) => goed >= x.vanaf) || T.uitslagen[T.uitslagen.length - 1]
    S.toets = { goed, totaal: T.vragen.length, titel: u.titel }
    if (goed >= 9 && !S.badges.some((b) => b.id === 'toets')) S.badges.push({ id: 'toets', naam: 'Geslaagd voor de Barca-toets' })
    bewaar()
    const w = el(`
      <div class="scherm">
        <p class="kicker">Uitslag</p>
        <div class="rapport">
          <img class="wapen-merk" src="${C.logo}" alt="" aria-hidden="true">
          <p class="kicker" style="color:var(--zand)">${goed} van de ${T.vragen.length} goed</p>
          <h2 class="titel-groot">${esc(u.titel)}</h2>
          <p class="verdict">${opmaak(u.tekst)}</p>
        </div>
        <div style="height:18px"></div>
        <button class="knop" data-doe="door">${klaar ? 'Ga naar Ibiza' : 'Terug'}</button>
        <div style="height:10px"></div>
        <button class="knop spook" data-doe="over">Nog een keer proberen</button>
      </div>`)
    w.querySelector('[data-doe="door"]').onclick = () => {
      if (klaar) klaar()
      else if (S.scene) ganaar(S.scene)
      else schermTitel()
    }
    w.querySelector('[data-doe="over"]').onclick = () => { i = 0; goed = 0; toon(vraag()) }
    return w
  }

  const s = el(`
    <div class="scherm">
      <p class="kicker">${esc(T.kicker)}</p>
      <h2 class="titel-groot">${esc(T.titel)}</h2>
      <div class="tekst">
        ${T.intro.map((r) => `<p>${opmaak(r)}</p>`).join('')}
        ${(T.verplicht || []).includes(S.speler) ? `<p><strong>${opmaak(T.introVerplicht)}</strong></p>` : ''}
      </div>
      <div class="knoppen">
        <button class="knop" data-doe="begin">Begin de toets</button>
        ${klaar ? '' : '<button class="knop spook" data-doe="terug">Laat maar</button>'}
      </div>
    </div>`)
  s.querySelector('[data-doe="begin"]').onclick = () => toon(vraag())
  s.querySelector('[data-doe="terug"]')?.addEventListener('click', () => {
    if (S.scene) ganaar(S.scene); else schermTitel()
  })
  toon(s)
}

function schermRapport() {
  S.onthuld = true
  bewaar()
  sfeer('giri')
  effect(null)
  const ik = speler()
  const v = bepaalVerdict()
  const regels = [
    `${ik.naam} · Ibiza 2026`,
    ``,
    `Uitslag: ${v.titel}`,
    v.tekst.replace(/\*/g, ''),
    ``,
    S.badges.length ? `Badges: ${S.badges.map((b) => b.naam).join(', ')}` : 'Badges: geen enkele. Ook een prestatie.',
    ...(S.toets ? [``, `Barca-toets: ${S.toets.goed}/${S.toets.totaal} · ${S.toets.titel}`] : []),
    ``,
    `Speel zelf mee: ${location.href}`,
  ].join('\n')

  const s = el(`
    <div class="scherm">
      <p class="kicker">Eindrapport</p>
      <div class="rapport">
        <img class="wapen-merk" src="${C.logo}" alt="" aria-hidden="true">
        <div style="margin-bottom:10px">${avatar(ik, 84)}</div>
        <p class="kicker" style="color:var(--zand)">${esc(ik.naam)}${ik.bijnaam ? ` · ${esc(ik.bijnaam)}` : ''}</p>
        <h2 class="titel-groot">${esc(v.titel)}</h2>
        <p class="verdict">${opmaak(tokens(v.tekst, 'rapport'))}</p>
        <div style="margin:18px auto 0;max-width:280px;text-align:left">${fxOverzicht()}</div>
        ${S.toets ? `<p class="toetsuitslag">Barca-toets: <b>${S.toets.goed}/${S.toets.totaal}</b> · ${esc(S.toets.titel)}</p>` : ''}
        <div class="badges">
          ${S.badges.length
            ? S.badges.map((b) => `<span class="badge">🏅 ${esc(b.naam)}</span>`).join('')
            : '<span class="badge">Geen enkele badge. Ook een prestatie.</span>'}
        </div>
      </div>
      <div style="height:18px"></div>
      <button class="knop" data-doe="kopieer">Kopieer voor de groepsapp</button>
      <div style="height:10px"></div>
      <button class="knop" data-doe="oefeningen">Naar het programmaboekje</button>
      <div style="height:10px"></div>
      <button class="knop spook" data-doe="opnieuw">Nog een keer, als iemand anders</button>
      <div style="height:10px"></div>
      <button class="knop spook" data-doe="dungeon">Verder spelen bij een AI-verteller</button>
      <div class="voet">
        Elke man ziet een andere week. Speel hem nog eens als iemand anders,<br>
        dan zie je scenes die je nu niet hebt gehad. Vergelijk maar in de app.<br>
        <b>Team Programmaboek</b> · Erwin &amp; Kerem
      </div>
    </div>`)

  s.querySelector('[data-doe="kopieer"]').onclick = async () => {
    try { await navigator.clipboard.writeText(regels); toast('Gekopieerd. Plak maar in de app.') }
    catch { toast('Kopiëren lukt niet in deze browser') }
  }
  s.querySelector('[data-doe="oefeningen"]').onclick = startOefeningen
  s.querySelector('[data-doe="opnieuw"]').onclick = schermSpelers
  s.querySelector('[data-doe="dungeon"]').onclick = async () => {
    try {
      await navigator.clipboard.writeText(dungeonPrompt())
      toast('Prompt gekopieerd. Plak ’m bij AI Dungeon of ChatGPT.')
    } catch { toast('Kopiëren lukt niet in deze browser') }
  }
  toon(s)
}

// De laatste poort: vier oefeningen, en dan pas het boekje.
function startOefeningen() {
  const intro = el(`
    <div class="scherm">
      <p class="kicker">Laatste stap</p>
      <h2 class="titel-groot">Vier oefeningen</h2>
      <div class="tekst">
        <p>Het boekje ligt er. Maar niet voor niets.</p>
        <p>Vier oefeningen, allemaal supersimpel. Je bent zo klaar.</p>
      </div>
      <div class="knoppen"><button class="knop" data-doe="begin">Beginnen</button></div>
    </div>`)
  intro.querySelector('[data-doe="begin"]').onclick = () => {
    schermOefeningen(null, {
      oefeningen: C.oefeningen,
      speler: S.speler,
      zaad: zaad('oef' + S.speler),
      toon: (knoop) => toon(knoop),
    }, () => {
      const klaar = el(`
        <div class="scherm">
          <p class="kicker">Vrijgespeeld</p>
          <h2 class="titel-groot">Het boekje gaat open</h2>
          <div class="tekst">
            <p>Dat was het. Je bent erdoor.</p>
            <p>Speel hem nog eens als iemand anders. Dan krijg je andere oefeningen. En \u00e9\u00e9n die je weer niet haalt.</p>
          </div>
          <div class="knoppen">
            <button class="knop" data-doe="programma">Bekijk het programma</button>
            <button class="knop spook" data-doe="opnieuw">Nog een keer, als iemand anders</button>
          </div>
        </div>`)
      klaar.querySelector('[data-doe="programma"]').onclick = toonProgramma
      klaar.querySelector('[data-doe="opnieuw"]').onclick = schermSpelers
      toon(klaar)
    })
  }
  toon(intro)
}

/* --------------------------------------------------------- programma-paneel */

function blokHtml(b) {
  const merk = b.status === 'open' ? '<span class="merk">nog ntb</span>' : ''
  const links = [b.link, b.link2].filter(Boolean)
    .map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join(' · ')
  return `
    <div class="blok${b.leeg ? ' leeg' : ''}">
      <div class="deel">${esc(b.deel)}</div>
      <div class="wat">${esc(b.tekst)}${merk}
        ${b.sub ? `<span class="sub">${esc(b.sub)}</span>` : ''}
        ${links ? `<span class="sub">${links}</span>` : ''}
      </div>
    </div>`
}

function toonProgramma() {
  const dagen = C.dagen.map((d) => `
    <div class="dagkaart">
      <header>
        <span class="dagnr">${d.dag}</span>
        <span class="dagnaam">${esc(d.label)}</span>
        <span class="dagdatum">${esc(d.datum)}</span>
      </header>
      ${d.blokken.map(blokHtml).join('')}
    </div>`).join('')

  // De helft van de groep krijgt een andere variant van één infokaart.
  const viaRoca = S.speler && zaad('veldvariant' + S.speler) % 2 === 0
  const info = C.info.map((k) => `
    <div class="infokaart">
      <h3>${esc(k.kop)}</h3>
      <ul>${(k.variant && viaRoca ? k.variant : k.regels).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      ${k.link ? `<div style="margin-top:8px"><a href="${esc(k.link.url)}" target="_blank" rel="noopener">${esc(k.link.label)} ↗</a></div>` : ''}
    </div>`).join('')

  const vluchten = C.vluchten.map((v) => `
    <div class="vluchtkaart">
      <div class="mij">${esc(v.maatschappij)}</div>
      <div class="tijden">${esc(v.heen)} &nbsp;→&nbsp; ${esc(v.terug)}</div>
      <div class="pax">${v.passagiers.map((p) => `<b>${esc(p.naam)}</b> ${esc(p.stoel)}${p.noot ? ` <span style="opacity:.7">(${esc(p.noot)})</span>` : ''}`).join(' · ')}</div>
    </div>`).join('')

  const p = el(`
    <div class="paneel"><div class="paneel-binnen">
      <div class="paneel-kop">
        <img class="wapen-klein" src="${C.logo}" alt="Clubwapen">
        <h2>Programma</h2>
        <button class="pil" data-sluit>Sluiten</button>
      </div>
      ${dagen}
      <div class="sectiekop">Praktisch</div>
      ${info}
      <div class="sectiekop">Vluchten</div>
      ${vluchten}
      <div class="voet">Programma van Team Programmaboek.<br>Klopt er iets niet? Dan hoef je niet te appen.<br>Erwin regelt alles.</div>
    </div></div>`)
  p.querySelector('[data-sluit]').onclick = () => p.remove()
  document.body.appendChild(p)
}

/* --------------------------------------------------------------------- boot */

function schermWachtwoord(fout) {
  const s = el(`
    <div class="scherm wachtwoord">
      <div class="zon" style="width:88px;height:88px;margin:0 auto;border-radius:50%;background:linear-gradient(180deg,var(--zon-hoog),var(--roze))"></div>
      <h1 class="display" style="font-size:38px;color:var(--wit);margin:6px 0 0">Barça 2026</h1>
      <p style="color:var(--tekst-zacht);font-size:14.5px;line-height:1.6;margin:0 auto;max-width:32ch">
        Deze is alleen voor de mannen die meegaan. Vul het wachtwoord in dat in de groepsapp staat.
      </p>
      <input type="password" inputmode="text" autocapitalize="none" autocomplete="off" placeholder="wachtwoord" aria-label="Wachtwoord">
      <p class="fout">${fout ? 'Dat is ’m niet. Kijk nog eens in de app.' : ''}</p>
      <button class="knop" data-doe="open">Naar binnen</button>
    </div>`)
  const invoer = s.querySelector('input')
  const probeer = async () => {
    const w = invoer.value
    if (!w) return
    try {
      C = await ontsleutel(window.__PAYLOAD__, w)
      onthoudSleutel(w)
      begin()
    } catch { schermWachtwoord(true) }
  }
  s.querySelector('[data-doe="open"]').onclick = probeer
  invoer.onkeydown = (e) => { if (e.key === 'Enter') probeer() }
  toon(s)
  setTimeout(() => invoer.focus(), 120)
}

// Testhaakje: laat een script de geladen content en de huidige staat inzien.
// Geen geheim, want beide staan na het ontsleutelen toch al in het geheugen.
function testhaak() { return { C, S, dungeonPrompt } }

function begin() {
  window.__spel = testhaak
  if (C.icoon) document.querySelector('link[rel="icon"]').href = C.icoon
  S = laad() || nieuweStaat()
  schermTitel()
}

async function boot() {
  const res = await fetch('content.enc', { cache: 'no-cache' })
  window.__PAYLOAD__ = (await res.text()).trim()

  const kandidaat = sleutelUitLink() || bewaardeSleutel()
  if (kandidaat) {
    try {
      C = await ontsleutel(window.__PAYLOAD__, kandidaat)
      onthoudSleutel(kandidaat)
      if (location.hash) history.replaceState(null, '', location.pathname + location.search)
      return begin()
    } catch {}
  }
  schermWachtwoord(false)
}

boot().catch((e) => {
  console.error(e)
  $app.replaceChildren(el('<div class="scherm" style="justify-content:center;text-align:center"><p>Er ging iets mis met laden. Ververs de pagina.</p></div>'))
})
