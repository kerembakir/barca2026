// De mini-spellen. Elk spel krijgt een lege div en een context, en roept
// klaar(uitslag) zodra het afgelopen is. Bewust zonder externe libraries:
// alles moet in de versleutelde payload passen en offline blijven werken.

const svg = (h) => {
  const d = document.createElement('div')
  d.innerHTML = h.trim()
  return d.firstElementChild
}

/* ------------------------------------------------------- 1 · de lange bal */

// Sleep de bal in een hoek. Wie in de mist-lijst van de scene staat, scoort nooit.
// Dat is precies de bedoeling: je ziet hem gaan en dan is het toch MIS.
export function langeBal(doel, ctx, klaar) {
  const rigged = (ctx.mist || []).includes(ctx.speler)
  let pogingen = 0
  let bezig = false

  const paneel = svg(`
    <div class="spel">
      <p class="spel-uitleg">Sleep de bal in een hoek. Links, hard, in het zijnet-hoekje. Zoals altijd.</p>
      <svg class="veld" viewBox="0 0 320 250" role="img" aria-label="Doel met bal">
        <defs>
          <linearGradient id="gras" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1C4E2A"/><stop offset="1" stop-color="#0E2E19"/>
          </linearGradient>
          <pattern id="net" width="9" height="9" patternUnits="userSpaceOnUse">
            <path d="M9 0H0V9" fill="none" stroke="rgba(255,248,240,0.32)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect x="0" y="0" width="320" height="250" fill="url(#gras)"/>
        <path d="M0 92h320" stroke="rgba(255,248,240,0.14)" stroke-width="2"/>
        <rect x="66" y="30" width="188" height="62" fill="url(#net)"/>
        <path d="M66 92V30h188v62" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linejoin="round"/>
        <g class="hoeken">
          <circle class="hoek" data-h="l" cx="88" cy="50" r="19"/>
          <circle class="hoek" data-h="r" cx="232" cy="50" r="19"/>
        </g>
        <ellipse class="schaduw" cx="160" cy="216" rx="16" ry="5"/>
        <g class="bal" transform="translate(160,206)">
          <circle r="13" fill="#FFF8F0" stroke="#0A0E27" stroke-width="2"/>
          <path d="M0-9l6.5 4.7-2.5 7.6h-8L-6.5-4.3z" fill="#0A0E27"/>
          <path d="M0-9v-4M6.5-4.3l4-3M4 2.3l5 1.6M-4 2.3l-5 1.6M-6.5-4.3l-4-3" stroke="#0A0E27" stroke-width="1.6" fill="none"/>
        </g>
      </svg>
      <p class="spel-uitslag" role="status"></p>
      <div class="spel-knoppen"></div>
    </div>`)

  const veld = paneel.querySelector('.veld')
  const bal = paneel.querySelector('.bal')
  const schaduw = paneel.querySelector('.schaduw')
  const uitslag = paneel.querySelector('.spel-uitslag')
  const knoppen = paneel.querySelector('.spel-knoppen')
  const hoeken = [...paneel.querySelectorAll('.hoek')]
  const THUIS = { x: 160, y: 206 }

  const naarVeld = (e) => {
    const r = veld.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 320, y: ((e.clientY - r.top) / r.height) * 250 }
  }
  const zet = (p) => {
    bal.setAttribute('transform', `translate(${p.x},${p.y})`)
    schaduw.setAttribute('cx', p.x)
    schaduw.setAttribute('cy', Math.max(60, p.y + 10))
    schaduw.setAttribute('rx', Math.max(6, 16 - (206 - p.y) / 12))
  }

  function pak(e) {
    if (bezig) return
    e.preventDefault()
    try { veld.setPointerCapture(e.pointerId) } catch {}
    bal.classList.add('vast')
    const beweeg = (ev) => zet(naarVeld(ev))
    const los = (ev) => {
      veld.removeEventListener('pointermove', beweeg)
      veld.removeEventListener('pointerup', los)
      veld.removeEventListener('pointercancel', los)
      bal.classList.remove('vast')
      schiet(naarVeld(ev))
    }
    veld.addEventListener('pointermove', beweeg)
    veld.addEventListener('pointerup', los)
    veld.addEventListener('pointercancel', los)
    beweeg(e)
  }
  veld.addEventListener('pointerdown', pak)

  function schiet(p) {
    const hoek = hoeken.find((h) => Math.hypot(p.x - +h.getAttribute('cx'), p.y - +h.getAttribute('cy')) < 34)
    if (!hoek) {
      uitslag.textContent = 'Naast. Niet eens in de buurt van een hoek.'
      uitslag.className = 'spel-uitslag fout'
      return zet(THUIS)
    }
    bezig = true
    pogingen++
    hoek.classList.add('aan')
    const doelX = +hoek.getAttribute('cx')
    const doelY = +hoek.getAttribute('cy')

    if (rigged) {
      // Hij gaat erin. Je ziet hem gaan. En dan net niet.
      zet({ x: doelX + (doelX < 160 ? -22 : 22), y: doelY - 6 })
      bal.classList.add('mis')
      uitslag.textContent = 'Aaaaah jammer. MIS. Probeer het nogmaals.'
      uitslag.className = 'spel-uitslag fout'
      setTimeout(() => {
        bal.classList.remove('mis')
        hoek.classList.remove('aan')
        zet(THUIS)
        bezig = false
        if (pogingen >= 4) ontsnapping()
      }, 900)
      return
    }

    zet({ x: doelX, y: doelY })
    bal.classList.add('raak')
    uitslag.textContent = 'YES, goed gedaan. Mooi schot.'
    uitslag.className = 'spel-uitslag goed'
    setTimeout(() => klaar({ gelukt: true, pogingen }), 700)
  }

  function ontsnapping() {
    if (knoppen.childElementCount) return
    uitslag.textContent = ctx.uitweg || 'Aaaaah jammer. MIS. Je mag door.'
    const b = document.createElement('button')
    b.className = 'knop spook'
    b.textContent = 'Laat maar. Ik loop wel achter ze aan.'
    b.onclick = () => klaar({ gelukt: false, pogingen })
    knoppen.appendChild(b)
  }

  doel.appendChild(paneel)
}

/* ------------------------------------------------------------ 2 · het bier */

// Je komt de vrijdag niet in zonder bier. Ingedrukt houden om te drinken.
export function bierMeter(doel, ctx, klaar) {
  let vol = 100
  let bezig = false
  let timer = null

  const paneel = svg(`
    <div class="spel">
      <p class="spel-uitleg">Houd het glas ingedrukt tot het leeg is. Zo werkt dat hier.</p>
      <svg class="glas" viewBox="0 0 120 190" role="img" aria-label="Glas">
        <defs>
          <clipPath id="glasvorm"><path d="M26 34h68l-8 132a10 10 0 0 1-10 9H44a10 10 0 0 1-10-9z"/></clipPath>
          <linearGradient id="pils" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#FFC94D"/><stop offset="1" stop-color="#D8890F"/>
          </linearGradient>
        </defs>
        <g clip-path="url(#glasvorm)">
          <rect x="0" y="0" width="120" height="190" fill="rgba(255,248,240,0.06)"/>
          <rect class="vloeistof" x="0" y="34" width="120" height="141" fill="url(#pils)"/>
          <rect class="schuim" x="0" y="30" width="120" height="14" fill="#FFF8F0"/>
        </g>
        <path d="M26 34h68l-8 132a10 10 0 0 1-10 9H44a10 10 0 0 1-10-9z" fill="none" stroke="#FFF8F0" stroke-width="4"/>
        <path d="M94 62h9a17 17 0 0 1 0 34h-6" fill="none" stroke="#FFF8F0" stroke-width="4"/>
      </svg>
      <p class="spel-uitslag" role="status">Nog vol.</p>
      <div class="spel-knoppen">
        <button class="knop" data-doe="drink">Ingedrukt houden om te drinken</button>
        <button class="knop spook" data-doe="nee">Nee, ik hoef even niet</button>
      </div>
    </div>`)

  const vloeistof = paneel.querySelector('.vloeistof')
  const schuim = paneel.querySelector('.schuim')
  const uitslag = paneel.querySelector('.spel-uitslag')
  const drink = paneel.querySelector('[data-doe="drink"]')

  function teken() {
    const top = 34 + (141 * (100 - vol)) / 100
    vloeistof.setAttribute('y', top)
    vloeistof.setAttribute('height', Math.max(0, 175 - top))
    schuim.setAttribute('y', Math.max(30, top - 4))
    schuim.setAttribute('height', vol > 4 ? 14 : 0)
  }

  function start(e) {
    e.preventDefault()
    if (bezig) return
    bezig = true
    drink.classList.add('drinkt')
    timer = setInterval(() => {
      vol = Math.max(0, vol - 3.2)
      teken()
      if (vol > 60) uitslag.textContent = 'Doorgaan.'
      else if (vol > 25) uitslag.textContent = 'Halverwege. Niet opgeven.'
      else if (vol > 0) uitslag.textContent = 'Bijna. Doorzetten.'
      if (vol === 0) {
        stop()
        uitslag.textContent = 'Leeg. Glas omhoog. Je mag door naar vrijdag.'
        uitslag.className = 'spel-uitslag goed'
        drink.disabled = true
        setTimeout(() => klaar({ gelukt: true }), 800)
      }
    }, 55)
  }
  function stop() {
    clearInterval(timer)
    bezig = false
    drink.classList.remove('drinkt')
  }
  function losgelaten() {
    if (!bezig || vol === 0) return
    stop()
    uitslag.textContent = 'Je hebt losgelaten. Zo komen we er niet.'
  }

  drink.addEventListener('pointerdown', start)
  drink.addEventListener('pointerup', losgelaten)
  drink.addEventListener('pointerleave', losgelaten)
  drink.addEventListener('pointercancel', losgelaten)
  paneel.querySelector('[data-doe="nee"]').onclick = () => klaar({ gelukt: false })

  teken()
  doel.appendChild(paneel)
}

/* ------------------------------------------------------- 3 · de buiklijn */

// De bolling moet exact goed staan. Hij staat nooit exact goed.
// De eerste keer in elk geval niet.
export function buikLijn(doel, ctx, klaar) {
  const DOELWAARDE = 62
  let pogingen = 0

  const paneel = svg(`
    <div class="spel">
      <p class="spel-uitleg">Zet de lijn van de bolling precies goed. Dit luistert nauw.</p>
      <div class="buik">
        ${ctx.beeld ? `<img src="${ctx.beeld}" alt="">` : ''}
        <svg viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true">
          <path class="lijn" fill="none" stroke="#F1CE4B" stroke-width="3" stroke-dasharray="7 6"/>
        </svg>
      </div>
      <input class="schuif" type="range" min="0" max="100" value="12" aria-label="Bolling">
      <p class="spel-uitslag" role="status">Nog niet.</p>
      <div class="spel-knoppen"></div>
    </div>`)

  const lijn = paneel.querySelector('.lijn')
  const schuif = paneel.querySelector('.schuif')
  const uitslag = paneel.querySelector('.spel-uitslag')
  const knoppen = paneel.querySelector('.spel-knoppen')

  const teken = () => {
    const b = 100 + (+schuif.value / 100) * 150
    lijn.setAttribute('d', `M20 120Q160 ${260 - b} 300 120`)
  }
  schuif.oninput = () => {
    teken()
    const af = Math.abs(+schuif.value - DOELWAARDE)
    uitslag.className = 'spel-uitslag'
    uitslag.textContent = af > 30 ? 'Ver ernaast.' : af > 12 ? 'Warmer.' : 'Bijna goed. Heel voorzichtig nu.'
  }
  schuif.onchange = () => {
    if (Math.abs(+schuif.value - DOELWAARDE) > 8) return
    pogingen++
    if (pogingen === 1) {
      uitslag.textContent = 'Net niet. Echt net niet. Nog een keer.'
      uitslag.className = 'spel-uitslag fout'
      return
    }
    uitslag.textContent = 'Dat is hem. Precies die bolling. Hij knikt.'
    uitslag.className = 'spel-uitslag goed'
    schuif.disabled = true
    if (!knoppen.childElementCount) {
      const b = document.createElement('button')
      b.className = 'knop'
      b.textContent = 'Verder'
      b.onclick = () => klaar({ gelukt: true })
      knoppen.appendChild(b)
    }
  }

  teken()
  doel.appendChild(paneel)
}

/* ------------------------------------------------------- 4 · losse vraag */

// Eén vraag midden in het verhaal, zodat je even echt moet nadenken.
export function quizVraag(doel, ctx, klaar) {
  const q = ctx.vraag
  const paneel = svg(`
    <div class="spel">
      <p class="spel-uitleg">${q.v}</p>
      <div class="keuzes">
        ${q.opties.map((o, n) => `<button class="keuze" data-n="${n}"><span class="letter">${'ABCD'[n]}</span><span>${o}</span></button>`).join('')}
      </div>
      <div class="na"></div>
    </div>`)
  const na = paneel.querySelector('.na')
  paneel.querySelectorAll('.keuze').forEach((k) => {
    k.onclick = () => {
      const n = Number(k.dataset.n)
      const juist = n === q.goed
      paneel.querySelectorAll('.keuze').forEach((x, m) => {
        x.disabled = true
        if (m === q.goed) x.classList.add('goed')
        else if (m === n) x.classList.add('fout')
      })
      na.innerHTML = `<p class="oordeel ${juist ? 'goed' : 'fout'}">${juist ? 'Goed' : 'Fout'}</p><p>${q.na}</p>`
      setTimeout(() => klaar({ gelukt: juist }), 1400)
    }
  })
  doel.appendChild(paneel)
}

/* ---------------------------------------------------- 5 · de geilheidsmeter */

// De naald loopt heen en weer. Tik om hem stil te zetten. Hij moet bovenin.
export function meter(doel, ctx, klaar) {
  const ZONES = ctx.zones || []
  let x = 0
  let richting = 1
  let loopt = true
  let pogingen = 0
  let tijd = null

  const paneel = svg(`
    <div class="spel">
      <p class="spel-uitleg">${ctx.uitleg || ''}</p>
      <div class="meter">
        <div class="zones">
          ${ZONES.map((z, i) => `<span style="flex:${z.tot - (ZONES[i - 1]?.tot || 0)}">${z.naam}</span>`).join('')}
        </div>
        <div class="baan"><i class="naald"></i></div>
      </div>
      <p class="spel-uitslag" role="status">Hij loopt.</p>
      <div class="spel-knoppen"><button class="knop" data-doe="stop">Zet hem stil</button></div>
    </div>`)

  const naald = paneel.querySelector('.naald')
  const uitslag = paneel.querySelector('.spel-uitslag')
  const stopknop = paneel.querySelector('[data-doe="stop"]')

  function tik() {
    x += richting * 1.9
    if (x >= 100) { x = 100; richting = -1 }
    if (x <= 0) { x = 0; richting = 1 }
    naald.style.left = x + '%'
  }
  tijd = setInterval(tik, 16)

  stopknop.onclick = () => {
    if (!loopt) return
    loopt = false
    clearInterval(tijd)
    pogingen++
    const zone = ZONES.find((z) => x <= z.tot) || ZONES[2]
    uitslag.textContent = zone.woord
    if (zone === ZONES[ZONES.length - 1]) {
      uitslag.className = 'spel-uitslag goed'
      stopknop.disabled = true
      setTimeout(() => klaar({ gelukt: true, pogingen }), 800)
    } else {
      uitslag.className = 'spel-uitslag fout'
      stopknop.textContent = 'Nog een keer'
      setTimeout(() => { loopt = true; tijd = setInterval(tik, 16); uitslag.textContent = 'Hij loopt weer.'; uitslag.className = 'spel-uitslag' }, 900)
    }
  }

  doel.appendChild(paneel)
}

/* ------------------------------------------------------------- 6 · hitster */

// Schuif het jaartal. Drie nummers, twee goed is genoeg.
export function hitster(doel, ctx, klaar) {
  const NUMMERS = ctx.nummers || []
  const MARGE = 3
  let i = 0
  let goed = 0

  const paneel = svg(`
    <div class="spel">
      <p class="spel-uitleg"></p>
      <p class="jaartal"></p>
      <input class="schuif" type="range" min="1970" max="2025" value="1998" aria-label="Jaartal">
      <p class="spel-uitslag" role="status"></p>
      <div class="spel-knoppen"><button class="knop" data-doe="leg">Hier leggen</button></div>
    </div>`)

  const uitleg = paneel.querySelector('.spel-uitleg')
  const jaartal = paneel.querySelector('.jaartal')
  const schuif = paneel.querySelector('.schuif')
  const uitslag = paneel.querySelector('.spel-uitslag')
  const leg = paneel.querySelector('[data-doe="leg"]')

  function toonKaart() {
    const n = NUMMERS[i]
    uitleg.innerHTML = `Kaartje ${i + 1} van ${NUMMERS.length}. <strong>${n.titel}</strong> van ${n.artiest}. In welk jaar?`
    jaartal.textContent = schuif.value
    uitslag.textContent = ''
    uitslag.className = 'spel-uitslag'
    leg.disabled = false
    leg.textContent = 'Hier leggen'
  }
  schuif.oninput = () => { jaartal.textContent = schuif.value }

  leg.onclick = () => {
    const n = NUMMERS[i]
    if (leg.textContent !== 'Hier leggen') {
      i++
      if (i < NUMMERS.length) return toonKaart()
      return klaar({ gelukt: goed >= 2, goed })
    }
    const af = Math.abs(+schuif.value - n.jaar)
    const juist = af <= MARGE
    if (juist) goed++
    uitslag.textContent = `${juist ? 'Goed.' : 'Mis.'} ${n.jaar}. ${n.na}`
    uitslag.className = 'spel-uitslag ' + (juist ? 'goed' : 'fout')
    leg.textContent = i + 1 < NUMMERS.length ? 'Volgend kaartje' : 'Klaar'
  }

  toonKaart()
  doel.appendChild(paneel)
}

/* ----------------------------------------------------------- 7 · opruimen */

// Vind alles wat er nog ligt. Geen klok, geen straf. Gewoon even rondkijken.
export function opruimen(doel, ctx, klaar) {
  const DINGEN = ctx.dingen || []
  let gevonden = 0

  const paneel = svg(`
    <div class="spel">
      <p class="spel-uitleg">Loop nog één keer door de villa. Tik alles aan wat er nog ligt.</p>
      <svg class="villa" viewBox="0 0 320 210" role="img" aria-label="De villa">
        <rect x="0" y="0" width="320" height="210" fill="#171232"/>
        <rect x="0" y="150" width="320" height="60" fill="#241B45"/>
        <rect x="18" y="60" width="70" height="52" rx="4" fill="#2E2456"/>
        <rect x="120" y="42" width="86" height="70" rx="5" fill="#2A2050"/>
        <rect x="232" y="70" width="70" height="42" rx="4" fill="#2E2456"/>
        <path d="M0 150h320" stroke="rgba(255,248,240,0.1)" stroke-width="2"/>
        <g class="dingen"></g>
      </svg>
      <p class="spel-uitslag" role="status"></p>
      <div class="spel-knoppen"></div>
    </div>`)

  const laag = paneel.querySelector('.dingen')
  const uitslag = paneel.querySelector('.spel-uitslag')
  const knoppen = paneel.querySelector('.spel-knoppen')

  const stand = () => { uitslag.textContent = `${gevonden} van de ${DINGEN.length} gevonden.` }

  DINGEN.forEach((d, n) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('class', 'ding')
    g.setAttribute('transform', `translate(${d.x},${d.y})`)
    g.innerHTML = `<circle r="15" fill="rgba(241,206,75,0.1)"/><text y="6" text-anchor="middle" font-size="17">${d.icoon}</text>`
    g.onclick = () => {
      if (g.classList.contains('op')) return
      g.classList.add('op')
      gevonden++
      uitslag.textContent = d.wat
      uitslag.className = 'spel-uitslag goed'
      if (gevonden === DINGEN.length) {
        uitslag.textContent = 'Alles gevonden. De villa ziet eruit zoals we hem aantroffen.'
        const b = document.createElement('button')
        b.className = 'knop'
        b.textContent = 'De bus staat voor'
        b.onclick = () => klaar({ gelukt: true })
        knoppen.appendChild(b)
      }
    }
    laag.appendChild(g)
  })

  stand()
  doel.appendChild(paneel)
}

export const SPELLEN = {
  'lange-bal': langeBal,
  'bier': bierMeter,
  'buik': buikLijn,
  'quiz': quizVraag,
  'meter': meter,
  'hitster': hitster,
  'opruimen': opruimen,
}
