/* ---------------- Niveau secret : la tour qui tourne ---------------- */
// Débloqué en tapant LESSIVE sur l'écran des mondes, ou en tapant dix fois Mme Bulle dans la laverie (elle se fâche et
// lance la lessive : la mousse monte, il faut s'échapper par la tour). SAVE.flags.tour ajoute la carte de la tour.
// Niveau sans fin vers le haut : un escalier en spirale fait le tour d'une tour qui tourne sur elle-même. Le héros reste au
// milieu de l'écran et c'est la tour qui tourne : la texture du mur (tour_texture) est enroulée sur un cylindre, colonne par
// colonne. Coordonnées : x = position le long du tour de la tour (arc, TOUR_C px pour un tour complet) ; le jeu garde trois
// copies côte à côte (largeur 3 × TOUR_C, le héros dans celle du milieu, ramené dedans quand il en sort) pour que la physique
// habituelle (moveBodyJ, plateformes traversables) marche sans couture. En y, l'origine se déplace avec la caméra
// (tourShift : TW.off) : tout ce qui bouge reste près de l'écran ; marches, corniches et décors gardent leur hauteur « monde »
// (y + TW.off à l'écran).
// Escalier : marches de TOUR_SW px, chacune TOUR_SH px plus haut ; le héros monte une marche en marchant (tourStepUp).
// Parfois une marche manque (à sauter). Entre deux tours de l'escalier, des colonnes de corniches (pierre, fissurée qui
// s'effondre, plateforme mobile) font un raccourci. Tonneaux de lessive et petits robots descendent l'escalier (contact :
// un cœur ; un coup : le tonneau éclate en bulles, le robot est étourdi puis explose en étincelles). La mousse monte, de plus
// en plus vite, et rattrape le héros s'il est trop loin ; elle l'attrape : game over. Score : hauteur en mètres (16 px),
// record par difficulté dans SAVE.tour.best.
const TW = { st: "run", t: 0, off: 0, steps: [], ledges: [], decor: [], clouds: [], bubs: [], pops: [], turn: 0, keep: new Set(), best: 0, alt: 0, sel: 0, paused: false };
const TOUR_SECRET = "LESSIVE", TOUR_TEX = 376, TOUR_C = TOUR_TEX * 2, TOUR_R = TOUR_C / (2 * Math.PI), TOUR_CX = VW / 2, TOUR_F = 240;
const TOUR_SW = 40, TOUR_SH = 12, TOUR_PER = TOUR_C / TOUR_SW, TOUR_LW = 56;   // marche (arc, hauteur), marches par tour, largeur d'une corniche
const TOUR_FOAM = { facile: [9, 22, 160], normal: [13, 28, 130], doom: [19, 36, 100] };   // mousse : vitesse (px/s) au départ, au plus ; écart au-delà duquel elle rattrape
const tourBest = () => (SAVE.tour.best || {})[df().id] || 0;
const tmod = (a, n) => ((a % n) + n) % n;
const tWrap = d => tmod(d + TOUR_C / 2, TOUR_C) - TOUR_C / 2;                  // écart le long du tour, entre −C/2 et C/2
const tNear = (x, ref) => x + TOUR_C * Math.round((ref - x) / TOUR_C);         // la copie de x la plus proche de ref
const tourPc = () => players[0].x + 5;
const tourStairY = k => TOUR_F - 12 - k * TOUR_SH;                             // hauteur (monde) du dessus de la marche k
const tourStairK = (a, n) => Math.round((tmod(a, TOUR_C) + n * TOUR_C) / TOUR_SW);   // marche du tour n qui passe à l'arc a

// Écran des mondes : le mot secret (lettres tapées, typedBuf) débloque la tour
function tourType() {
  if (!typedBuf.endsWith(TOUR_SECRET)) return false;
  typedBuf = "";
  tourUnlock();
  worldSel = TOUR_CARD(); audio.sfx("boss_intro");
  return true;
}
function tourUnlock() { if (!SAVE.flags.tour) { SAVE.flags.tour = 1; saveGame(); toast("Niveau secret !", "La tour qui tourne", "badge", "#ff8ad8"); } }
function drawTourCard(r, tw, th) {
  if (hasAtlas("tour_vignette")) drawFrame("tour_vignette", 0, r.x + 4 + tw / 2, r.y + 4 + th, 1, 1, tw / VW);
  else { R(r.x + 4, r.y + 4, tw, th, "#1a1030"); R(r.x + r.w / 2 - 12, r.y + 10, 24, th - 8, "#3a2a6c"); }
}

/* ---- Fabrication de la tour ---- */
// Un tour d'escalier de plus : ses marches (une manque parfois, jamais deux de suite, jamais sous une corniche du haut),
// deux colonnes de corniches jusqu'au tour suivant, et quelques décors sur le mur.
function tourGenTurn() {
  const n = TW.turn++, k0 = Math.ceil(n * TOUR_PER), k1 = Math.ceil((n + 1) * TOUR_PER);
  let lastGap = true;
  for (let k = k0; k < k1; k++) {
    const gap = n > 0 && !lastGap && !TW.keep.has(k) && k > k0 + 1 && Math.random() < Math.min(0.07 + n * 0.012, 0.2);
    lastGap = gap;
    if (!gap) TW.steps.push({ k, s: tmod(k * TOUR_SW, TOUR_C), y: tourStairY(k), fr: (k * 7 + 3) % 5 === 0 ? 0 : (k * 5) % 7 === 0 ? 1 : 2 });
  }
  const cols = n === 0 ? 1 : 2;
  for (let c = 0; c < cols; c++) {
    const a = tmod((c + 0.25 + Math.random() * 0.5) / cols * TOUR_C + (n === 0 ? 260 : 0), TOUR_C), y0 = tourStairY(tourStairK(a, n));
    for (let j = 1; j <= 3; j++) {
      const r = Math.random(), kind = n === 0 || j === 1 ? "corniche" : r < 0.22 + Math.min(0.15, n * 0.02) ? "fissure" : r < 0.42 ? "mobile" : "corniche";
      const s = tmod(a + (j % 2 ? -14 : 14), TOUR_C);
      TW.ledges.push({ s0: s, s, ds: 0, y: y0 - 56 * j, kind, ph: Math.random() * 6, crT: 0, downT: 0 });
      if (j === 3 && kind === "corniche" && df().id !== "doom" && n > 0 && Math.random() < 0.18) TW.hearts.push({ s, y: y0 - 56 * j - 16 });
    }
    // la marche du tour suivant au-dessus de la colonne (et ses voisines) ne manque jamais
    const ka = tourStairK(a, n + 1); for (let d = -1; d <= 1; d++) TW.keep.add(ka + d);
  }
  const yTop = tourStairY(k1), yBot = tourStairY(k0);
  for (let i = 0; i < 5; i++) TW.decor.push({ s: Math.random() * TOUR_C, y: yTop + 30 + Math.random() * (yBot - yTop - 40) - 120, kind: ["torche", "fenetre", "drapeau", "cristal", "fenetre"][i], ph: Math.random() * 4 });
}
// Plateformes de la physique : les marches et corniches proches, en trois copies (sans couture au bout du tour)
function tourBuildPlats() {
  const out = [], lo = -260 - TW.off, hi = VH + 260 - TW.off;
  for (const st of TW.steps) if (st.y > lo && st.y < hi) for (let c = 0; c < 3; c++) out.push({ x: c * TOUR_C + st.s - TOUR_SW / 2, y: st.y + TW.off, w: TOUR_SW, h: 6 });
  for (const L of TW.ledges) if (!L.downT && L.y > lo && L.y < hi) for (let c = 0; c < 3; c++) out.push({ x: c * TOUR_C + L.s - TOUR_LW / 2, y: L.y + TW.off, w: TOUR_LW, h: 8, L });
  lvl.plats = out;
  lvl.solids = [{ x: 0, y: TOUR_F + TW.off, w: TOUR_C * 3, h: 600 }];   // le sol au pied de la tour
}

function startTour() {
  lvl = { json: true, tour: true, W: CWORLDS[0], R: CWORLDS[0].rooms[0], width: TOUR_C * 3, solids: [], plats: [], blocks: [], decor: [], hazards: [], dest: [], items: [], exits: [],
    machine: null, ckpt: null, start: { x: TOUR_C * 2 - 85, y: TOUR_F - 32 }, foeSpawns: [], bossSpawn: null, lastSafe: null, leaving: false, arena: null, covers: [], gold: [], qitems: [], sock: null };
  enemies = []; lasers = []; parts = []; pickups = []; ghosts = []; fxs = []; mach = null; chal = null; roomTime = 0; hitstop = 0;
  players = [makePlayer(ch(), K, 0)]; const p = players[0]; p.inv = 0;
  Object.assign(TW, { st: "run", t: 0, off: 0, steps: [], ledges: [], decor: [], clouds: [], bubs: [], pops: [], hearts: [], turn: 0, keep: new Set(), alt: 0, sel: 0, paused: false,
    foam: TOUR_F + 70, spawnT: 6, cloudTop: 200, endT: 0, why: "", ambT: 0, amb: Math.random() < 0.5 || !hasSound("sfx/tour/mousse2") ? "sfx/tour/mousse" : "sfx/tour/mousse2" });
  for (let i = 0; i < 4; i++) tourGenTurn();
  tourHearts(); tourBuildPlats();
  TW.best = tourBest();
  state = "tour"; audio.sfx("boss_intro"); setTimeFx(false, false);
  msg = { text: "La mousse monte ! Grimpe !", t: 2.5 }; voice.say("La mousse monte ! Grimpe le plus haut possible !", true);
}
// Cœurs posés sur les corniches du haut : ils rejoignent les objets à ramasser quand ils approchent de l'écran
function tourHearts() {
  for (const h of TW.hearts) if (!h.out && h.y + TW.off > -200) { h.out = true; pickups.push({ x: tNear(h.s - 5, tourPc()), y: h.y + TW.off, w: 10, h: 10, alive: true }); }
}
// Décale tout ce qui bouge quand la caméra monte ou descend (l'écran reste dans les coordonnées habituelles du moteur)
function tourShift(d) {
  TW.off += d;
  for (const o of [...players, ...enemies, ...lasers, ...parts, ...fxs, ...pickups, ...ghosts, ...TW.pops, ...(lvl.blocks || [])]) { o.y += d; if (o.y0 !== undefined) o.y0 += d; if (o.cy !== undefined) o.cy += d; }
}
// Le héros est ramené dans la copie du milieu ; tout ce qui l'entoure suit
function tourWrap(p) {
  const c = p.x + 5, dx = c < TOUR_C ? TOUR_C : c >= 2 * TOUR_C ? -TOUR_C : 0;
  if (!dx) return;
  for (const o of [...players, ...enemies, ...lasers, ...parts, ...fxs, ...pickups, ...ghosts, ...TW.pops, ...(lvl.blocks || [])]) { o.x += dx; if (o.cx !== undefined) o.cx += dx; }
}
// Marcher sur l'escalier : une marche un peu plus haute (jusqu'à 15 px) se monte toute seule
function tourStepUp(p) {
  if (!p.onGround || p.vy < 0 || !p.vx) return;
  const b = p.y + p.h;
  for (const s of lvl.plats) if (!s.L && s.y < b - 0.5 && s.y >= b - 15 && p.x + p.w > s.x && p.x < s.x + s.w) { p.y = s.y - p.h; return; }
}
const tourOn = (p, L) => p.onGround && Math.abs(p.y + p.h - (L.y + TW.off)) < 1.5 && Math.abs(tWrap(p.x + 5 - L.s)) < TOUR_LW / 2 + 5;

/* ---- Ennemis : tonneaux de lessive et petits robots qui descendent l'escalier ---- */
function tourSpawn(p) {
  const pc = p.x + 5, cand = TW.steps.filter(st => { const ly = st.y + TW.off, d = tWrap(st.s - pc); return ly > p.y - 150 && ly < p.y + 24 && d > 150 && d < 330; });
  if (!cand.length) return;
  const st = cand[Math.floor(Math.random() * cand.length)], robot = Math.random() < Math.min(0.5, 0.2 + TW.alt / 500);
  const w = robot ? 14 : 16, h = robot ? 24 : 16;
  enemies.push({ type: "tour", kind: robot ? "robot" : "tonneau", x: tNear(st.s, pc) - w / 2, y: st.y + TW.off - h - 1, w, h, vx: 0, vy: 0, face: -1,
    alive: true, hp: robot ? 2 : 1, st: "go", t: 0, air: 0, bounceT: 0, roll: 0, sp: (robot ? 34 : 78) * (df().id === "doom" ? 1.2 : df().id === "facile" ? 0.85 : 1) });
}
function tourUpdateFoes(p, dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.x = tNear(e.x, p.x); e.t += dt;
    if (e.stunT > 0) e.stunT -= dt;   // rugissement de Rumi ou de Dino
    if (e.st === "stun" && e.t > 1.4) { e.st = "go"; e.t = 0; }
    const still = e.st === "stun" || e.stunT > 0;
    e.vx = still ? 0 : -e.sp;
    e.vy = Math.min(e.vy + 1500 * dt, 600);
    const was = e.onGround;
    moveBodyJ(e, dt);
    if (!e.onGround) e.air += dt; else { if (!was && e.air > 0.05 && e.kind === "tonneau") e.bounceT = 0.25; e.air = 0; }
    e.bounceT = Math.max(0, e.bounceT - dt); e.roll += Math.abs(e.vx) * dt;
    if (!still) touchPlayers(e, e.x + e.w / 2);
    // dans la mousse ou loin en dessous : il disparaît
    if (e.y + e.h > TW.foam + TW.off + 6) { e.alive = false; burst(e.x + e.w / 2, e.y + e.h, 10, ["#ffffff", "#ffc8f0", "#9fe8ff"], 90, 0.5, 100, 2); }
    else if (e.y > p.y + 320) e.alive = false;
  }
  enemies = enemies.filter(e => e.alive);
  for (const q of TW.pops) q.t += dt;
  TW.pops = TW.pops.filter(q => q.t < 0.45);
}
// Un coup (sabre, dash, tir) : le tonneau éclate en bulles ; le robot est d'abord étourdi, puis explose en étincelles et boulons
function tourHit(e, src, p, dmg) {
  if (src === "atk") { if (p.hitList.has(e)) return; p.hitList.add(e); audio.sfx("sword_hit"); }
  else if (src === "dash") { if (p.dashHits.has(e)) return; p.dashHits.add(e); }
  e.hp -= src === "proj" ? dmg || 1 : src === "laser" ? 2 : 1;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  if (e.hp > 0) {
    e.st = "stun"; e.t = 0; e.vy = -160; e.x += (p ? p.face : 1) * 4;
    burst(cx, e.y, 8, ["#fccc28", "#ff8ad8", "#ffffff"], 90, 0.4, 0, 1); audio.sfx("hit_robot"); return;
  }
  e.alive = false; TW.pops.push({ kind: e.kind, x: cx, y: cy, face: e.face, t: 0 });
  if (e.kind === "tonneau") { burst(cx, cy, 16, ["#ffffff", "#ffc8f0", "#9fe8ff", "#fccc28"], 140, 0.6, 60, 2); audio.sfx("def_slime"); }
  else { burst(cx, cy, 20, ["#fccc28", "#5ef0ff", "#ffffff"], 200, 0.5, 200, 1); burst(cx, cy, 6, ["#8a7aa8", "#c8b8e0"], 140, 0.8, 600, 3); audio.sfx("def_robot"); }
  shake = Math.max(shake, 3); hitstop = Math.max(hitstop, 0.04); rumble(80, 0, 0.35);
}

/* ---- Fin : la mousse attrape le héros, ou plus de cœur ---- */
function tourEnd(why) {
  if (TW.st !== "run") return;
  TW.st = "caught"; TW.endT = 0; TW.why = why;
  const m = Math.floor(TW.alt), k = df().id; TW.isNew = m > (SAVE.tour.best[k] || 0);
  if (TW.isNew) { SAVE.tour.best[k] = m; saveGame(); }
  audio.sfx(why === "mousse" ? pickSfx("slip", "hurt") : "gameover"); shake = 5; rumble(400, 0.8, 0.6); setTimeFx(false, false);
}

SCREENS.tour = {
  update(rdt) {
    const p = players[0];
    tourAmbience(rdt);
    if (TW.st === "result") {
      if (hit(...K.left, ...K.right, ...K.up, ...K.down)) { TW.sel = 1 - TW.sel; audio.sfx("select"); }
      const again = { x: 150, y: 196, w: 84, h: 20 }, back = { x: 246, y: 196, w: 84, h: 20 };
      if (hit("Mouse0") && inside(again) || hit(...K.ok) && TW.sel === 0) { startTour(); return; }
      if (hit("Mouse0") && inside(back) || hit(...K.ok) && TW.sel === 1 || hit("Escape", "GB")) { enterHub({ x: 380 }); return; }
      return;
    }
    if (TW.st === "run" && hit("Escape", "KeyP", "TPause", "GStart")) { TW.paused = !TW.paused; audio.sfx("pause"); }
    if (TW.paused) { if (hit("KeyQ", "GB", "Backspace")) enterHub({ x: 380 }); return; }
    const dt = rdt * (slowOn ? 0.35 : 1);
    roomTime += dt; TW.t += dt; if (msg && msg.t > 0) msg.t -= rdt;
    for (const c of TW.clouds) c.x += c.sp * rdt;
    tourBubbles(dt);
    // la mousse a attrapé le héros : il s'enfonce, des bulles, puis l'écran de fin
    if (TW.st === "caught") {
      TW.endT += rdt;
      if (TW.why === "mousse") { p.vx = 0; p.vy = 20; p.y += 20 * rdt; p.fade = Math.max(0, 1 - TW.endT * 0.8); }
      if (TW.endT > 1.6) { TW.st = "result"; TW.sel = 0; if (TW.isNew) audio.sfx("victory"); }
      updateParts(dt); updateFx(dt); return;
    }
    // pouvoirs (ralenti, super vitesse…) comme en jeu
    const d = df(), pw = powerOf(p.C);
    if (pw && pw.burst) { p.powerOn = false; if (d.power && hit(...p.input.power)) burstPower(p, pw); p.gauge = Math.min(1, p.gauge + d.regen * rdt); }
    else { p.powerOn = !!(d.power && pw && down(...p.input.power) && p.gauge > 0); p.gauge = p.powerOn ? Math.max(0, p.gauge - d.drain * rdt) : Math.min(1, p.gauge + d.regen * rdt); }
    setTimeFx(usingPower(p, "slow"), usingPower(p, "fast"));
    // corniches : la plateforme mobile va et vient ; la corniche fissurée s'effondre peu après qu'on s'y pose, puis revient
    for (const L of TW.ledges) {
      if (L.kind === "mobile") { const s = tmod(L.s0 + Math.sin(TW.t * 1.1 + L.ph) * 26, TOUR_C); L.ds = tWrap(s - L.s); L.s = s; }
      if (L.downT > 0) { L.downT -= dt; if (L.downT <= 0) { L.downT = 0; L.crT = 0; } }
      else if (L.crT > 0) { L.crT += dt; if (L.crT > 0.55) { L.downT = 4; audio.sfx("boom"); burst(tNear(L.s, p.x + 5), L.y + TW.off + 6, 12, ["#8a6ab8", "#c8b0e8", "#5a4a78"], 100, 0.6, 500, 2); } }
    }
    tourBuildPlats();
    updatePlayer(p, dt);
    tourStepUp(p);
    for (const L of TW.ledges) if (!L.downT && tourOn(p, L)) {
      if (L.kind === "mobile") p.x += L.ds;
      if (L.kind === "fissure" && !L.crT) { L.crT = 0.001; audio.sfx("slip"); }
    }
    tourWrap(p);
    // tirs des armes et de la magie (projectiles du héros)
    for (const l of lasers) if (l.alive && l.wpn) { l.x = tNear(l.x, p.x); updateWProj(l, dt); } else l.alive = false;
    lasers = lasers.filter(l => l.alive);
    // ennemis
    if (TW.t > 6 && (TW.spawnT -= dt) <= 0) {
      tourSpawn(p);
      TW.spawnT = Math.max(1.8, 4.4 - TW.t * 0.015) * (d.id === "facile" ? 1.4 : d.id === "doom" ? 0.75 : 1);
    }
    tourUpdateFoes(p, dt);
    for (const it of pickups) it.x = tNear(it.x, p.x);
    // la mousse : elle monte de plus en plus vite, et rattrape le héros s'il est loin
    const [v0, v1, far] = TOUR_FOAM[d.id] || TOUR_FOAM.normal, gap = TW.foam + TW.off - (p.y + p.h);
    let v = TW.t < 2.5 ? 0 : Math.min(v1, v0 + (TW.t - 2.5) * 0.11);
    if (gap > far) v += (gap - far) * 0.8;   // trop loin sous le héros : elle se rapproche (on la voit arriver)
    TW.foam -= v * dt;
    TW.alt = Math.max(TW.alt, (TOUR_F - (p.y + p.h - TW.off)) / 16);
    // caméra : le héros reste vers le milieu de l'écran ; tout se décale (le sol ne remonte jamais dans l'écran)
    let sh = 0;
    if (p.y < 128) sh = (128 - p.y) * Math.min(1, rdt * 5);
    if (p.y > 176) sh = 176 - p.y;
    sh = Math.max(sh, -TW.off);
    if (sh) tourShift(sh);
    // la suite de la tour se construit au-dessus ; ce qui est sous la mousse est oublié
    while (tourStairY(Math.ceil(TW.turn * TOUR_PER)) > -TW.off - 500) tourGenTurn();
    const under = TW.foam + 260;
    TW.steps = TW.steps.filter(s => s.y < under); TW.ledges = TW.ledges.filter(L => L.y < under); TW.decor = TW.decor.filter(o => o.y < under);
    TW.hearts = TW.hearts.filter(h => !h.out); tourHearts();
    pickups = pickups.filter(it => it.alive && it.y < VH + 300);
    if (p.dead) tourEnd("coeurs");
    else if (p.y + p.h > TW.foam + TW.off + 8) { tourEnd("mousse"); burst(p.x + 5, p.y + p.h, 24, ["#ffffff", "#ffc8f0", "#9fe8ff"], 140, 0.8, 80, 2); }
    updateParts(dt); updateFx(dt);
  },
  draw() {
    const p = players[0], pc = p.x + 5, off = TW.off;
    tourDrawBack(pc);
    // ce qui est derrière la tour (seuls les bouts qui dépassent se voient), puis la tour, puis le devant
    const things = tourThings(pc);
    for (const o of things) if (o.c < 0) tourDrawThing(o);
    tourDrawTower(pc);
    tourDrawGround(pc);
    for (const o of TW.decor) {
      const ly = o.y + off; if (ly < -30 || ly > VH + 30) continue;
      const a = tWrap(o.s - pc) / TOUR_R, c = Math.cos(a); if (c < 0.2) continue;
      const fr = ATL.tour_decors ? ATL.tour_decors.anims[o.kind][0] + Math.floor(time * 6 + o.ph) % 4 : 0;
      tourSlab("tour_decors", fr, TOUR_CX + TOUR_R * Math.sin(a), ly, c, c, true);
    }
    for (const o of things) if (o.c >= 0) tourDrawThing(o);
    // objets, ennemis, tirs, héros, étincelles : à leur place sur le cylindre
    const proj = x => { const a = tWrap(x - pc) / TOUR_R; return { x: TOUR_CX + (TOUR_R + 8) * Math.sin(a), c: Math.cos(a) }; };
    for (const it of pickups) { if (!it.alive) continue; const q = proj(it.x + 5); if (q.c < 0.15) continue; const y = Math.round(it.y + Math.sin(time * 4) * 2); drawHeartIcon(Math.round(q.x), y + 5, true); }
    for (const e of enemies) { const q = proj(e.x + e.w / 2); if (q.c > 0.05) tourDrawFoe(e, q.x, q.c); }
    for (const q0 of TW.pops) { const q = proj(q0.x); if (q.c < 0.05) continue; const aid = q0.kind === "robot" ? "tour_robot" : "tour_tonneau", an = q0.kind === "robot" ? "explose" : "eclate";
      if (hasAtlas(aid)) drawFrame(aid, animFrame(aid, an, q0.t, 9, false), Math.round(q.x), Math.round(q0.kind === "robot" ? q0.y + 12 : q0.y), q0.face); }
    for (const l of lasers) { const q = proj(l.x + (l.w || 0) / 2); if (q.c < 0.1) continue; ctx.save(); ctx.translate(Math.round(q.x - l.x - (l.w || 0) / 2), 0); drawWProj(l); ctx.restore(); }
    // effets (explosions, téléportation…) : chacun à sa place sur le cylindre, comme les tirs
    const fxAt = under => { const all = fxs; for (const f of all) { if (f.under !== under) continue; const q = proj(f.x); if (q.c < 0.1) continue; fxs = [f]; ctx.save(); ctx.translate(Math.round(q.x - f.x), 0); drawFxList(under); ctx.restore(); } fxs = all; };
    fxAt(true);
    ctx.save(); ctx.translate(Math.round(TOUR_CX - pc), 0);
    for (const b of lvl.blocks || []) R(Math.round(b.x), Math.round(b.y), b.w, b.h, "#4fbf3a");
    drawGhosts(); drawCampPlayer(p);
    ctx.restore();
    fxAt(false);
    for (const q of parts) { const s = proj(q.x); if (s.c < 0) continue; ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(Math.round(s.x), Math.round(q.y), q.size, q.size, q.color); }
    ctx.globalAlpha = 1;
    tourDrawFoam(pc);
    tourDrawHud(p);
  },
};
function tourAmbience(rdt) {
  // bruit de la mousse : plus fort quand elle approche
  audio.setAmbience(TW.st === "result" || TW.paused ? null : TW.amb);
  const a = audio.ambience; if (!a || !audio.ctx) return;
  const p = players[0], gap = TW.foam + TW.off - (p.y + p.h), v = clamp(1 - (gap - 40) / 260, 0.12, 1) * 0.55;
  a.g.gain.setTargetAtTime(v, audio.ctx.currentTime, 0.4);
}

/* ---- Dessin ---- */
// Planches assombries (une par niveau d'ombre) : les faces de côté de la tour sont plus sombres
const tourDark = {};
function tourShaded(aid, lv) {
  const key = aid + lv; if (tourDark[key] !== undefined) return tourDark[key];
  const img = atlasImg(aid); if (!img) return null;
  const [c, x] = mkCanvas(img.width, img.height);
  x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = `rgba(12,6,30,${[0, 0.3, 0.52, 0.72][lv]})`; x.fillRect(0, 0, c.width, c.height);
  return (tourDark[key] = c);
}
// Une image d'atlas aplatie en largeur (sx = cos de l'angle : vue de côté sur le cylindre) et ombrée selon l'angle
function tourSlab(aid, i, x, y, sx, c, center) {
  const A = ATL[aid]; if (!A) return false;
  const lv = c > 0.72 ? 0 : c > 0.42 ? 1 : c > 0.12 ? 2 : 3, img = tourShaded(aid, lv); if (!img) return false;
  const w = Math.max(1, Math.round(A.cw * sx)), ax = center ? A.cw / 2 : A.ax, ay = center ? A.ch / 2 : A.ay;
  ctx.drawImage(img, (i % A.cols) * A.cw, Math.floor(i / A.cols) * A.ch, A.cw, A.ch, Math.round(x - ax * sx), Math.round(y - ay), w, A.ch);
  return true;
}
// Marches et corniches proches, avec leur angle (c = cos : devant > 0, derrière < 0), du plus loin au plus près
function tourThings(pc) {
  const out = [], off = TW.off;
  const add = (o, kind, s, y) => { const ly = y + off; if (ly < -40 || ly > VH + 70) return; const a = tWrap(s - pc) / TOUR_R, c = Math.cos(a); if (c < -0.45) return; out.push({ o, kind, a, c, ly }); };
  for (const st of TW.steps) add(st, "step", st.s, st.y);
  for (const L of TW.ledges) add(L, "ledge", L.s, L.y);
  return out.sort((u, v) => u.c - v.c);
}
function tourDrawThing(t) {
  const x = TOUR_CX + (TOUR_R + 8) * Math.sin(t.a), sx = Math.max(0.12, Math.abs(t.c)), c = t.c < 0 ? 0 : t.c;
  if (t.kind === "step") { if (!tourSlab("tour_marches", t.o.fr, x, t.ly, sx, c)) R(Math.round(x - 20 * sx), Math.round(t.ly), Math.round(40 * sx), 8, "#c8a8e8"); return; }
  const L = t.o; let y = t.ly, fr = L.kind === "mobile" ? 1 : L.kind === "fissure" ? 2 : 0;
  if (L.downT > 0) { const k = 4 - L.downT; if (k > 0.7) return; fr = 3; y += k * k * 300; ctx.globalAlpha = 1 - k / 0.7; }
  else if (L.crT > 0) y += Math.round(Math.sin(time * 60)) ;   // elle tremble avant de tomber
  if (!tourSlab("tour_plateformes", fr, x, y, sx, c)) R(Math.round(x - 28 * sx), Math.round(y), Math.round(56 * sx), 10, "#9a7ac8");
  ctx.globalAlpha = 1;
}
// Ciel, montagnes lointaines (seulement près du sol) et nuages, qui défilent lentement quand la tour tourne
function tourDrawBack(pc) {
  const off = TW.off;
  if (hasAtlas("tour_fond_ciel")) {
    const img = atlasImg("tour_fond_ciel"), ox = -Math.round(tmod(pc * 0.08, VW)), oy = Math.round(tmod(off * 0.03, VH));
    for (const dx of [0, VW]) for (const dy of [-VH, 0]) ctx.drawImage(img, ox + dx, oy + dy, VW, VH);
  } else R(0, 0, VW, VH, "#1a1040");
  for (const c of TW.clouds) {
    const y = Math.round(c.yp + off * 0.4); if (y < -40 || y > VH + 40) continue;
    const x = Math.round(tmod(c.x - pc * 0.3, VW + 240) - 120);
    if (hasAtlas("tour_nuages")) drawFrame("tour_nuages", c.fr, x, y, 1, 0.75, c.sc); else R(x - 30, y - 8, 60, 16, "rgba(140,90,200,0.4)");
  }
  while (TW.cloudTop + off * 0.4 > -60) { TW.cloudTop -= 60 + Math.random() * 70; TW.clouds.push({ yp: TW.cloudTop, x: Math.random() * (VW + 240), fr: Math.floor(Math.random() * 6), sc: 0.55 + Math.random() * 0.45, sp: 3 + Math.random() * 6 }); }
  TW.clouds = TW.clouds.filter(c => c.yp + off * 0.4 < VH + 60);
  const fy = TOUR_F + off, mb = Math.round(262 + (fy - TOUR_F) * 0.45);
  if (mb < VH + 280 && hasAtlas("tour_fond_loin")) { const img = atlasImg("tour_fond_loin"), ox = -Math.round(tmod(pc * 0.25, VW)); for (const dx of [0, VW]) ctx.drawImage(img, ox + dx, mb - VH, VW, VH); }
}
// Le mur : chaque colonne de l'écran montre la colonne de texture qui est là sur le cylindre ; ombre sur les côtés
let tourTexC = null;
function tourDrawTower(pc) {
  const bottom = Math.min(VH, Math.round(TOUR_F + TW.off));
  if (bottom <= 0) return;
  if (!tourTexC && hasAtlas("tour_texture")) {
    const img = atlasImg("tour_texture"); if (img) { const [c, x] = mkCanvas(TOUR_TEX, img.height * 3); for (let k = 0; k < 3; k++) x.drawImage(img, 0, k * img.height); tourTexC = { c, h: img.height }; }
  }
  const L = TOUR_CX - Math.floor(TOUR_R), W = Math.floor(TOUR_R) * 2;
  if (tourTexC) {
    const sy = tmod(-Math.round(TW.off), tourTexC.h);
    for (let i = 0; i < W; i++) {
      const u = tmod(Math.floor(pc + Math.asin(clamp((i + 0.5 - W / 2) / TOUR_R, -1, 1)) * TOUR_R), TOUR_TEX);
      ctx.drawImage(tourTexC.c, u, sy, 1, bottom, L + i, 0, 1, bottom);
    }
  } else R(L, 0, W, bottom, "#3a2a6c");
  const g = ctx.createLinearGradient(L, 0, L + W, 0);
  g.addColorStop(0, "rgba(8,4,22,0.9)"); g.addColorStop(0.16, "rgba(8,4,22,0.5)"); g.addColorStop(0.4, "rgba(8,4,22,0.04)");
  g.addColorStop(0.62, "rgba(8,4,22,0.1)"); g.addColorStop(0.86, "rgba(8,4,22,0.55)"); g.addColorStop(1, "rgba(8,4,22,0.92)");
  ctx.fillStyle = g; ctx.fillRect(L, 0, W, bottom);
  ctx.globalAlpha = 0.35; R(L, 0, 1, bottom, "#5ef0ff"); R(L + W - 1, 0, 1, bottom, "#ff8ad8"); ctx.globalAlpha = 1;   // liserés néon
}
// Le sol au pied de la tour et la base (porte et lanternes), tournée vers le départ
function tourDrawGround(pc) {
  const fy = Math.round(TOUR_F + TW.off); if (fy > VH + 200) return;
  const a = tWrap(TOUR_C - 85 - pc) / TOUR_R, c = Math.cos(a);
  if (c > 0.1 && hasAtlas("tour_base")) tourSlab("tour_base", 0, TOUR_CX + TOUR_R * Math.sin(a), fy + 4, c, c);
  if (fy < VH) { R(0, fy, VW, VH - fy, "#140c26"); R(0, fy, VW, 2, "#3a2a6c"); R(0, fy + 2, VW, 1, "#5ef0ff33"); }
}
function tourDrawFoe(e, x, c) {
  const robot = e.kind === "robot", aid = robot ? "tour_robot" : "tour_tonneau";
  const y = Math.round(robot ? e.y + e.h : e.y + e.h / 2), sx = Math.max(0.35, c);
  if (!hasAtlas(aid)) { R(Math.round(x - e.w / 2), Math.round(e.y), e.w, e.h, robot ? "#b9a6e0" : "#4f8aff"); return; }
  let fr;
  if (robot) fr = e.st === "stun" || e.stunT > 0 ? animFrame(aid, "etourdi", e.t, 6) : !e.onGround ? ATL[aid].anims.saut[0] + 1 : animFrame(aid, "marche", e.roll / 34 * 1.2, 1);
  else fr = e.bounceT > 0 ? ATL[aid].anims.rebond[0] + Math.min(2, Math.floor((0.25 - e.bounceT) / 0.085)) : ATL[aid].anims.roule[0] + Math.floor(e.roll / 7) % 6;
  ctx.save(); ctx.translate(Math.round(x), y); ctx.scale(-sx, 1);   // les planches regardent à droite : ils descendent vers la gauche
  drawFrame(aid, fr, 0, 0, 1);
  ctx.restore();
}
// La mousse : une bande de bulles qui monte, pleine en dessous ; des bulles s'en échappent
function tourBubbles(dt) {
  const fy = TW.foam + TW.off;
  if (fy < VH + 40 && Math.random() < dt * 6) TW.bubs.push({ x: Math.random() * VW, y: fy - 6, vy: -(14 + Math.random() * 26), fr: Math.floor(Math.random() * 4), t: 0, life: 1.2 + Math.random() * 1.6, ph: Math.random() * 6 });
  for (const b of TW.bubs) { b.t += dt; b.y += b.vy * dt; b.x += Math.sin(b.t * 3 + b.ph) * 10 * dt; }
  TW.bubs = TW.bubs.filter(b => b.t < b.life + 0.3);
}
function tourDrawFoam(pc) {
  const fy = Math.round(TW.foam + TW.off), off = Math.round(tmod(pc * 0.9 + time * 10, 640));
  for (const b of TW.bubs) {
    if (!hasAtlas("tour_bulles")) break;
    const pop = b.t > b.life, fr = pop ? ATL.tour_bulles.anims.eclate[0] + Math.min(2, Math.floor((b.t - b.life) / 0.1)) : b.fr;
    drawFrame("tour_bulles", fr, Math.round(b.x), Math.round(b.y), 1, 0.85);
  }
  if (fy > VH + 30) return;
  const top = fy - 22;
  if (hasAtlas("tour_mousse")) for (let x = -off; x < VW; x += 160) { const k = tmod(Math.round((x + off) / 160), 4); drawFrame("tour_mousse", k, x, top + Math.round(Math.sin(time * 2 + k) * 1.5)); }
  else R(0, top + 20, VW, 30, "#ffd6f2");
  const g = ctx.createLinearGradient(0, top + 46, 0, VH); g.addColorStop(0, "#ffd8f4"); g.addColorStop(1, "#f0a8e0");
  if (top + 46 < VH) { ctx.fillStyle = g; ctx.fillRect(0, top + 46, VW, VH - top - 46); }
}
function tourDrawHud(p) {
  const gap = TW.foam + TW.off - (p.y + p.h), warn = clamp(1 - (gap - 30) / 150, 0, 1);
  if (warn > 0 && TW.st === "run") { const g = ctx.createLinearGradient(0, VH, 0, VH - 110); g.addColorStop(0, `rgba(255,120,210,${0.45 * warn})`); g.addColorStop(1, "rgba(255,120,210,0)"); ctx.fillStyle = g; ctx.fillRect(0, VH - 110, VW, 110); }
  R(0, 0, VW, 16, "rgba(10,6,24,0.7)");
  text("La tour qui tourne", 6, 8, 9, "#ff8ad8");
  text(`${Math.floor(TW.alt)} m`, VW / 2, 8, 11, "#ffffff", "center", "#ff8ad8");
  text(`Record : ${TW.best} m`, VW - 8, 8, 8, "#fccc28", "right");
  for (let i = 0; i < df().hp; i++) drawHeartIcon(10 + i * 10, 24, i < p.hp);
  const gp = p.gauge || 0; R(6, VH - 12, 60, 5, "#2a1a3a"); R(6, VH - 12, Math.round(60 * gp), 5, ch().color);
  text("Mousse", 74, VH - 9, 7, "#ffd8f4"); R(112, VH - 12, 80, 5, "#2a1a3a"); R(112, VH - 12, Math.round(80 * warn), 5, warn > 0.7 ? "#ff3b5c" : "#ff8ad8");
  if (msg && msg.t > 0) text(msg.text, VW / 2, 40, 11, "#ffe8fa", "center", "#ff8ad8");
  if (TW.paused) {
    R(0, 0, VW, VH, "rgba(10,6,24,0.7)"); text("Pause", VW / 2, 110, 16, "#ff8ad8", "center", "#ff8ad8");
    text(say("Échap : reprendre   Q : laverie", "⏸ : reprendre", "Start : reprendre   {B} : laverie"), VW / 2, 136, 8, "#e8dcff", "center");
  }
  if (TW.st === "result") {
    R(0, 0, VW, VH, "rgba(10,6,24,0.75)");
    text("Game over", VW / 2, 80, 18, "#ff8ad8", "center", "#ff8ad8");
    text(TW.why === "mousse" ? "La mousse t'a rattrapé !" : "Tu n'as plus de cœur !", VW / 2, 102, 10, "#e8dcff", "center");
    text(`Tu as grimpé ${Math.floor(TW.alt)} m`, VW / 2, 124, 12, "#ffffff", "center");
    text(TW.isNew ? "Nouveau record !" : `Record : ${Math.max(TW.best, Math.floor(TW.alt))} m`, VW / 2, 146, 10, TW.isNew ? "#7dffb0" : "#fccc28", "center");
    text("Les corniches sont des raccourcis : grimpe-les !", VW / 2, 170, 7, "#b9a6e0", "center");
    drawButton({ x: 150, y: 196, w: 84, h: 20 }, "Rejouer", TW.sel === 0, "#ff8ad8", 9);
    drawButton({ x: 246, y: 196, w: 84, h: 20 }, "Laverie", TW.sel === 1, "#b9a6e0", 9);
  }
}

/* ---- Le secret de Mme Bulle : dix coups de suite, elle se fâche et lance la lessive ---- */
const TBUL = { hits: 0, t: 9, say: null, sayT: 0, intro: null };
const TBUL_SAY = [[1, "Hé !"], [4, "Aïe ! Arrête !"], [7, "Attention, je vais me fâcher…"], [9, "Dernier avertissement !"]];
function tourBulleUpdate(rdt, p) {
  TBUL.t += rdt; TBUL.sayT = Math.max(0, TBUL.sayT - rdt);
  if (TBUL.t > 4) TBUL.hits = 0;   // dix coups de suite, sans trop attendre entre deux
  const s = STATIONS.find(t => t.id === "bulle");
  if (!s || hub.room !== "salle" || hub.dlg || !hit(...p.input.attack) || Math.abs(p.x + 5 - BUL.x) > 44 || !p.onGround) return;
  TBUL.hits++; TBUL.t = 0; BUL.act = null; BUL.face = p.x + 5 > BUL.x ? 1 : -1;
  const line = TBUL_SAY.filter(([n]) => n <= TBUL.hits).pop();
  if (line && line[0] === TBUL.hits) { TBUL.say = line[1]; TBUL.sayT = 1.6; audio.sfx("talk_bulle"); }
  burst(BUL.x, thingFloor(s) - 28, 5, ["#ffffff", "#9fe8ff", "#ff8ad8"], 80, 0.4, 100, 1);
  if (TBUL.hits >= 10) {
    TBUL.hits = 0; TBUL.sayT = 0; shake = 6;
    startDialog([["bulle", "Stop, cette fois c'en est trop !", { face: 5 }], ["bulle", "À la LESSIVE !", { face: 6 }]], () => {
      tourUnlock(); TBUL.intro = { t: 0 }; audio.sfx("spin"); hub.machShake = 2;
    });
  }
}
function tourBulleDraw() {
  if (TBUL.sayT <= 0 || hub.room !== "salle") return;
  const s = STATIONS.find(t => t.id === "bulle"); if (!s) return;
  const y = thingFloor(s) - 58 - (1.6 - TBUL.sayT) * 6;
  ctx.globalAlpha = Math.min(1, TBUL.sayT * 3); text(TBUL.say, Math.round(BUL.x), Math.round(y), 9, "#ffffff", "center", "#ff4f8a"); ctx.globalAlpha = 1;
  if (Math.floor(time * 12) % 2) R(Math.round(BUL.x) - 1 + (Math.random() < 0.5 ? -1 : 1), Math.round(y) + 8, 2, 2, "#ff4f8a");
}
// La mousse envahit la laverie (1,8 s), puis le niveau commence
function tourIntroUpdate(rdt) {
  if (!TBUL.intro) return false;
  TBUL.intro.t += rdt; shake = Math.max(shake, 1.5);
  if (Math.random() < 0.5) parts.push({ x: hub.cam + Math.random() * VW, y: VH - TBUL.intro.t * 170, vx: 0, vy: -30, life: 0.8, max: 0.8, color: Math.random() < 0.5 ? "#ffffff" : "#ffc8f0", size: 2, grav: 0 });
  updateParts(rdt);
  if (TBUL.intro.t > 1.8) { TBUL.intro = null; startTour(); }
  return true;
}
function tourIntroDraw() {
  if (!TBUL.intro) return;
  const top = Math.round(VH + 20 - TBUL.intro.t / 1.8 * (VH + 70));
  if (hasAtlas("tour_mousse")) for (let x = -Math.round(time * 30) % 160 - 160; x < VW; x += 160) drawFrame("tour_mousse", tmod(Math.round(x / 160), 4), x, top);
  R(0, top + 46, VW, Math.max(0, VH - top - 46), "#ffd8f4");
}
