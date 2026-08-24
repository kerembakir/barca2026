// De persoonlijke oefeningen na het eindrapport. Zes machines, achttien
// oefeningen in de content. Bij de man wiens oefening het is staat gerigd aan
// en lukt het nooit. Bij de rest lukt het meteen.

const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstElementChild }

/* -------------------------------------------------------------- machines */

// Sleep iets naar een doel. Gerigd: het gaat er telkens net naast.
function mik(vak, oef, gerigd, af) {
  const VELD = {
    goal: {
      achter: `<rect width="320" height="200" fill="#173F23"/>
        <rect x="62" y="26" width="196" height="66" fill="none" stroke="#FFF8F0" stroke-width="5"/>
        <path d="M62 92h196" stroke="rgba(255,248,240,0.25)" stroke-width="2"/>`,
      doel: { x: 160, y: 58, r: 34 }, puck: '⚽', start: { x: 160, y: 160 },
    },
    dartbord: {
      achter: `<rect width="320" height="200" fill="#1A1330"/>
        <circle cx="160" cy="94" r="72" fill="#241B45" stroke="#FFF8F0" stroke-width="3"/>
        <circle cx="160" cy="94" r="40" fill="none" stroke="rgba(255,248,240,0.3)" stroke-width="2"/>
        <circle cx="160" cy="94" r="8" fill="#C42A26"/>
        <text x="160" y="34" text-anchor="middle" font-size="13" fill="#FFF8F0" opacity=".7">20</text>`,
      doel: { x: 160, y: 44, r: 22 }, puck: '🎯', start: { x: 160, y: 166 },
    },
    voeten: {
      achter: `<rect width="320" height="200" fill="#173F23"/>
        <text x="236" y="80" font-size="40" text-anchor="middle">🦶</text>
        <text x="236" y="104" font-size="10" text-anchor="middle" fill="#FFF8F0" opacity=".6">${oef.merk || ''}</text>`,
      doel: { x: 96, y: 62, r: 32 }, puck: '👟', start: { x: 160, y: 162 },
    },
  }[oef.veld] || {}

  const p = el(`
    <div class="oef">
      <svg class="oefveld" viewBox="0 0 320 200" role="img" aria-label="${oef.kop}">
        ${VELD.achter}
        <circle class="mikdoel" cx="${VELD.doel.x}" cy="${VELD.doel.y}" r="${VELD.doel.r}"/>
        <text class="puck" x="${VELD.start.x}" y="${VELD.start.y}" font-size="30" text-anchor="middle">${VELD.puck}</text>
      </svg>
    </div>`)
  const veld = p.querySelector('.oefveld')
  const puck = p.querySelector('.puck')
  const zet = (x, y) => { puck.setAttribute('x', x); puck.setAttribute('y', y) }

  veld.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    try { veld.setPointerCapture(e.pointerId) } catch {}
    const naar = (ev) => {
      const r = veld.getBoundingClientRect()
      return { x: ((ev.clientX - r.left) / r.width) * 320, y: ((ev.clientY - r.top) / r.height) * 200 }
    }
    const beweeg = (ev) => { const q = naar(ev); zet(q.x, q.y) }
    const los = (ev) => {
      veld.removeEventListener('pointermove', beweeg)
      veld.removeEventListener('pointerup', los)
      const q = naar(ev)
      const raak = Math.hypot(q.x - VELD.doel.x, q.y - VELD.doel.y) < VELD.doel.r + 16
      // Voor iedereen behalve het doelwit gaat hij erin, ook als je slordig mikt.
      if (!raak && !gerigd) { zet(VELD.doel.x, VELD.doel.y); return af(true) }
      if (!raak) { zet(VELD.start.x, VELD.start.y); return af(false, 'Niet eens in de buurt.') }
      if (gerigd) {
        const uit = { naast: [VELD.doel.x + 52, VELD.doel.y + 6], eigengoal: [40, 176], voet: [236, 74] }[oef.mist]
        zet(uit[0], uit[1])
        setTimeout(() => zet(VELD.start.x, VELD.start.y), 800)
        return af(false)
      }
      zet(VELD.doel.x, VELD.doel.y)
      af(true)
    }
    veld.addEventListener('pointermove', beweeg)
    veld.addEventListener('pointerup', los)
    beweeg(e)
  })
  vak.appendChild(p)
}

// Lees een waarde over. Gerigd: hij staat niet scherp.
function lezen(vak, oef, gerigd, af) {
  const p = el(`
    <div class="oef">
      <p class="waarde${gerigd ? ' wazig' : ''}">${oef.waarde}</p>
      <input class="oefinvoer" inputmode="numeric" placeholder="Tik het over" aria-label="Het getal">
      <button class="knop" data-doe="ok">Klaar</button>
    </div>`)
  p.querySelector('[data-doe="ok"]').onclick = () => {
    const v = p.querySelector('.oefinvoer').value.trim()
    if (!v) return af(false, 'Er staat nog niets.')
    if (!gerigd) return af(v === oef.waarde, v === oef.waarde ? null : 'Dat is het niet. Kijk nog eens.')
    af(false, v === oef.waarde ? 'Je hebt gegokt. Dat telt niet.' : null)
  }
  vak.appendChild(p)
}

// Zet een lopende balk stil in het groene vak. Gerigd: hij is altijd te vroeg.
function tempo(vak, oef, gerigd, af) {
  const [van, tot] = oef.zone
  let x = 0, richting = 1, loopt = true, tijd = null
  const p = el(`
    <div class="oef">
      <div class="baan">
        <span class="zone" style="left:${van}%;width:${tot - van}%"></span>
        <i class="naald"></i>
      </div>
      <button class="knop" data-doe="stop">Nu</button>
    </div>`)
  const naald = p.querySelector('.naald')
  const loop = () => {
    tijd = setInterval(() => {
      if (!loopt) return
      x += richting * 1.7
      if (x >= 100) { x = 100; richting = -1 }
      if (x <= 0) { x = 0; richting = 1 }
      naald.style.left = x + '%'
    }, 16)
  }
  loop()
  p.querySelector('[data-doe="stop"]').onclick = () => {
    if (!loopt) return
    loopt = false
    clearInterval(tijd)
    // Voor iedereen behalve het doelwit staat hij altijd goed.
    if (!gerigd) return af(true)
    af(false, oef.vroeg ? 'Te snel. Je was er weer eerder dan de rest.' : null)
    // En hij gaat gewoon weer lopen, zodat je het opnieuw mag proberen.
    setTimeout(() => { loopt = true; loop() }, 700)
  }
  vak.appendChild(p)
}

// Eén klik en klaar. Gerigd: er komt telkens iets tussen.
function knop(vak, oef, gerigd, af) {
  let n = 0
  const p = el(`<div class="oef"><button class="knop" data-doe="doe">${oef.knop}</button></div>`)
  p.querySelector('[data-doe="doe"]').onclick = () => {
    if (!gerigd) return af(true)
    const f = oef.fouten[n % oef.fouten.length]
    n++
    af(false, f)
  }
  vak.appendChild(p)
}

// Typ iets. Gerigd: er gaat altijd iets mis met wat je typt.
function tekst(vak, oef, gerigd, af) {
  const p = el(`
    <div class="oef">
      <input class="oefinvoer" placeholder="Typ het hier" aria-label="${oef.kop}">
      <p class="echo"></p>
      <button class="knop" data-doe="ok">Versturen</button>
    </div>`)
  const invoer = p.querySelector('.oefinvoer')
  const echo = p.querySelector('.echo')
  p.querySelector('[data-doe="ok"]').onclick = () => {
    const v = invoer.value.trim()
    if (!v) return af(false, 'Er staat nog niets.')
    if (!gerigd) { echo.textContent = v; return af(true) }
    if (oef.sabotage === 'kort') {
      echo.textContent = v.slice(0, oef.limiet)
      return af(false, `Er kwam "${v.slice(0, oef.limiet)}" aan. Hou het korter.`)
    }
    if (oef.sabotage === 'meer') {
      const extra = ['En hoe laat gaan we?', 'En moet ik iets meenemen?', 'En hoeveel nachtjes nog?', 'En gaan we nog trainen?']
      echo.innerHTML = [v, ...extra].map((r) => `<span>${r}</span>`).join('')
      return af(false, 'Dat waren er vijf.')
    }
    echo.textContent = `${v} (…)`
    return af(false, `Er staat "${v} (…)" in de lijst.`)
  }
  vak.appendChild(p)
}

// Ingedrukt houden tot de balk vol is. Gerigd: hij blijft op 97 staan.
function balk(vak, oef, gerigd, af) {
  let vol = 0, bezig = false, tijd = null
  const p = el(`
    <div class="oef">
      <div class="vulbalk"><i></i><span class="pct">0%</span></div>
      <button class="knop" data-doe="houd">${oef.knop}</button>
    </div>`)
  const vul = p.querySelector('.vulbalk i')
  const pct = p.querySelector('.pct')
  const k = p.querySelector('[data-doe="houd"]')
  const teken = () => { vul.style.width = vol + '%'; pct.textContent = Math.round(vol) + '%' }
  const stop = () => { clearInterval(tijd); bezig = false; k.classList.remove('drinkt') }
  k.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    if (bezig) return
    bezig = true
    k.classList.add('drinkt')
    tijd = setInterval(() => {
      vol = Math.min(gerigd ? 97 : 100, vol + 2.6)
      teken()
      if (vol >= 97 && gerigd) { stop(); af(false); setTimeout(() => { vol = 0; teken() }, 700) }
      else if (vol >= 100) { stop(); k.disabled = true; af(true) }
    }, 45)
  })
  const los = () => { if (bezig && vol < 97) stop() }
  k.addEventListener('pointerup', los)
  k.addEventListener('pointerleave', los)
  teken()
  vak.appendChild(p)
}

const MACHINES = { mik, lezen, tempo, knop, tekst, balk }

/* --------------------------------------------------------------- scherm */

// Kies vier: drie van anderen, dan die van jou als laatste.
export function kiesVier(alle, spelerId, zaad) {
  const eigen = alle.find((o) => o.voor === spelerId)
  const rest = alle.filter((o) => o !== eigen)
  const gekozen = []
  let i = zaad % rest.length
  while (gekozen.length < 3 && gekozen.length < rest.length) {
    const kandidaat = rest[i % rest.length]
    if (!gekozen.includes(kandidaat)) gekozen.push(kandidaat)
    i++
  }
  return eigen ? [...gekozen, eigen] : gekozen
}

// Het hele blok. klaar() als je erdoor bent.
export function schermOefeningen(doel, ctx, klaar) {
  const rij = kiesVier(ctx.oefeningen, ctx.speler, ctx.zaad)
  const MAX = 5
  let n = 0

  function toonOefening() {
    const oef = rij[n]
    const gerigd = oef.voor === ctx.speler
    let pogingen = 0

    const s = el(`
      <div class="scherm">
        <p class="kicker">Oefening ${n + 1} van ${rij.length}</p>
        <div class="voortgang"><i style="width:${(n / rij.length) * 100}%"></i></div>
        <h2 class="titel-groot" style="font-size:clamp(22px,6vw,30px)">${oef.kop}</h2>
        <p class="oefuitleg">${oef.uitleg}</p>
        <div class="oefvak"></div>
        <p class="spel-uitslag" role="status"></p>
        <div class="spel-knoppen"></div>
      </div>`)

    const uitslag = s.querySelector('.spel-uitslag')
    const knoppen = s.querySelector('.spel-knoppen')

    function af(gelukt, bericht) {
      if (gelukt) {
        uitslag.textContent = oef.goed
        uitslag.className = 'spel-uitslag goed'
        return setTimeout(volgende, 900)
      }
      pogingen++
      uitslag.textContent = bericht || oef.fout || 'Niet gelukt. Nog een keer.'
      uitslag.className = 'spel-uitslag fout'
      if (gerigd && oef.riggedNoot && pogingen === 2) uitslag.textContent += ' ' + oef.riggedNoot
      if (gerigd && pogingen >= MAX && !knoppen.childElementCount) {
        uitslag.textContent = oef.uitweg
        const b = document.createElement('button')
        b.className = 'knop'
        b.textContent = 'Doorlopen'
        b.onclick = volgende
        knoppen.appendChild(b)
      }
    }

    function volgende() {
      n++
      if (n < rij.length) ctx.toon(toonOefening())
      else klaar()
    }

    MACHINES[oef.soort](s.querySelector('.oefvak'), oef, gerigd, af)
    return s
  }

  ctx.toon(toonOefening())
}
