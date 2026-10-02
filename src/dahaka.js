/* ---------------- Niveau secret : la course du Dahaka ---------------- */
// Débloqué en tapant DAHAKA sur l'écran des mondes (SAVE.flags.dahaka). Deux parcours au choix (DK_LEVELS) : le temple et la grotte.
// Niveau sans fin vers la droite, fabriqué par morceaux de 480 px (sol, trous, plateformes et pièges annoncés). Le Dahaka,
// invincible, court derrière le héros ; il l'attrape s'il le rejoint et le mange (game over). Un trou ou un piège ne coûte pas de cœur : le héros est
// ralenti (ou remis au bord du trou), et le Dahaka se rapproche. Score : distance en mètres (16 px = 1 m), record par difficulté
// et par parcours dans SAVE.dahaka.best (clé « diff » pour le temple, « grotte|diff » pour la grotte).
// Grotte : chaque morceau est une des 6 scènes (corniches peintes = plateformes, GROTTE_LEDGES), avec des rochers et des pièges
// au hasard ; plans de parallaxe : monstres du fond (0,5), scène (1), gardiens du premier plan (1,35) ; cadre de stalactites fixe.
const DK = { lv: "temple", st: "run", t: 0, cam: 0, chunks: [], nextX: 0, startX: 40, best: 0, dist: 0, dx: 0, dvx: 0, an: "cri", anT: 0, jumpT: 0, paused: false, sel: 0, bg: [], guards: [] };
const DK_W = 480, DK_SECRET = "DAHAKA", DK_FG = 1.35, DK_FAR = 0.5;
const DK_LEVELS = {
  temple: { name: "Le temple", floor: 240, wi: 2, haz: "floor_blade", glow: "160,90,255" },
  grotte: { name: "La grotte", floor: 230, wi: 5, haz: "crystal_pulse", glow: "90,220,255" },
};
const DKL = () => DK_LEVELS[DK.lv];
const dkKey = (lv, id) => lv === "temple" ? id : lv + "|" + id;
const dkBest = lv => (SAVE.dahaka.best || {})[dkKey(lv, df().id)] || 0;
// Corniches peintes de chaque scène de la grotte : [x début, x fin, hauteur du dessus] (mesurées sur les images en 480 × 272)
const GROTTE_LEDGES = [
  [[0, 118, 106], [166, 238, 182], [274, 480, 146]],
  [[0, 80, 159], [152, 266, 82], [240, 310, 148], [352, 480, 124]],
  [[0, 144, 92], [172, 290, 175], [368, 480, 140]],
  [[0, 130, 126], [262, 372, 174], [368, 464, 100]],
  [[0, 106, 116], [180, 246, 142], [270, 338, 177], [424, 480, 136]],
  [[0, 92, 96], [162, 326, 145], [394, 480, 154]],
];
// Écran des mondes : les lettres tapées au clavier (typedBuf, la vraie lettre, AZERTY ou QWERTY) ; le mot secret débloque le niveau
function dahakaType() {
  if (!typedBuf.endsWith(DK_SECRET)) return false;
  typedBuf = "";
  if (!SAVE.flags.dahaka) { SAVE.flags.dahaka = 1; saveGame(); toast("Niveau secret !", "La course du Dahaka", "badge", "#c86eff"); }
  worldSel = CWORLDS.length + 1; audio.sfx("boss_intro");
  return true;   // la dernière lettre ne déplace pas la sélection
}
// Carte du niveau secret sur l'écran des mondes : temple sombre et Dahaka qui attend
function drawDahakaCard(r, tw, th) {
  const im = getImg(CWORLDS[2].rooms[0].bg);
  if (im.ok) ctx.drawImage(im.img, r.x + 4, r.y + 4, tw, th); else R(r.x + 4, r.y + 4, tw, th, "#1a1030");
  ctx.imageSmoothingEnabled = false;
  R(r.x + 4, r.y + 4, tw, th, "rgba(30,8,60,0.55)");
  glow(ctx, r.x + r.w / 2, r.y + 4 + th - 16, 22, "160,90,255", 0.4);
  if (hasAtlas("dahaka")) drawFrame("dahaka", animFrame("dahaka", "course_lente", time, 7), r.x + r.w / 2, r.y + 4 + th, 1, 1, 0.8);
}
// Choix du parcours (temple ou grotte), par-dessus l'écran des mondes
let dkPick = null;
const DK_PICK_R = [{ x: 108, y: 96, w: 124, h: 92 }, { x: 248, y: 96, w: 124, h: 92 }];
function openDkPick() { dkPick = { sel: DK.lv === "grotte" ? 1 : 0 }; audio.sfx("select"); }
function dkPickUpdate() {
  if (!dkPick) return false;
  const lv = ["temple", "grotte"];
  if (hit(...K.left, ...K.right)) { dkPick.sel = 1 - dkPick.sel; audio.sfx("select"); }
  if (hit("Escape", "GB")) { dkPick = null; audio.sfx("back"); return true; }
  if (hit("Mouse0")) {
    const i = DK_PICK_R.findIndex(r => inside(r));
    if (i < 0) { dkPick = null; return true; }
    if (i !== dkPick.sel) { dkPick.sel = i; audio.sfx("select"); return true; }
    dkPick = null; startDahaka(lv[i]); return true;
  }
  if (hit(...K.ok)) { const i = dkPick.sel; dkPick = null; startDahaka(lv[i]); }
  return true;
}
function drawDkPick() {
  if (!dkPick) return;
  R(0, 0, VW, VH, "rgba(8,4,20,0.78)");
  text("La course du Dahaka", VW / 2, 60, 16, "#c86eff", "center", "#c86eff");
  text("Choisis ton parcours", VW / 2, 80, 9, "#e8dcff", "center");
  ["temple", "grotte"].forEach((lv, i) => {
    const r = DK_PICK_R[i], sel = i === dkPick.sel, L = DK_LEVELS[lv], tw = r.w - 8, th = Math.round(tw * VH / VW);
    R(r.x, r.y, r.w, r.h, "rgba(14,8,30,0.95)");
    ctx.imageSmoothingEnabled = true;
    const im = lv === "temple" ? getImg(CWORLDS[2].rooms[0].bg) : null;
    if (im && im.ok) ctx.drawImage(im.img, r.x + 4, r.y + 4, tw, th);
    else if (lv === "grotte" && hasAtlas("grotte_scene_1")) drawFrame("grotte_scene_1", 0, r.x + 4 + tw / 2, r.y + 4 + th, 1, 1, tw / VW);
    else R(r.x + 4, r.y + 4, tw, th, "#1a1030");
    ctx.imageSmoothingEnabled = false;
    text(L.name, r.x + r.w / 2, r.y + r.h - 18, 9, sel ? "#ffffff" : "#b9a6e0", "center");
    const b = dkBest(lv); text(b ? `Record : ${b} m` : "Pas encore de record", r.x + r.w / 2, r.y + r.h - 7, 6, "#fccc28", "center");
    ctx.strokeStyle = sel ? "#c86eff" : "#3a2a5c"; ctx.lineWidth = sel ? 2 : 1;
    if (sel) { ctx.shadowColor = "#c86eff"; ctx.shadowBlur = 10; }
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); ctx.shadowBlur = 0;
  });
  text(say("Flèches pour choisir, Entrée pour courir, Échap pour revenir", "Touche un parcours, puis touche-le encore", "Croix pour choisir, {A} pour courir, {B} pour revenir"), VW / 2, 212, 8, "#b9a6e0", "center");
}
const dkSpeed = () => ({ facile: 100, normal: 116, doom: 132 })[df().id] || 116;
// Trous du sol d'un morceau (1 ou 2), en coordonnées du morceau : bouts de sol et trous
function dkGaps(level, F) {
  const solids = [], gaps = [], n = level < 2 ? 1 : Math.random() < 0.5 ? 1 : 2, gw = () => Math.min(40 + level * 6 + Math.random() * 24, 96);
  let x = 0;
  for (let g = 0; g < n; g++) {
    const seg = n === 1 ? 90 + Math.random() * 90 : 70 + Math.random() * 60, w = gw();
    solids.push({ x: Math.round(x), y: F, w: Math.round(seg), h: VH - F }); x += seg;
    gaps.push({ x: Math.round(x), w: Math.round(w) }); x += w;
  }
  solids.push({ x: Math.round(x), y: F, w: DK_W - Math.round(x), h: VH - F });
  return { solids, gaps };
}
// Lames ou cristaux annoncés sur les plus longs bouts de sol
function dkHazards(x0, solids, level, F) {
  const haz = [];
  for (const s of solids) if (s.w > 110 && Math.random() < 0.35 + level * 0.06) {
    const hx = s.x + 40 + Math.floor(Math.random() * (s.w - 80));
    haz.push(makeHazard({ id: "dk_piege", asset: "hazard_effect", hazardType: DKL().haz, cycle: { telegraphSeconds: 0.7, activeSeconds: 0.6, safeSeconds: 1.6 } }, { x: x0 + hx, y: F - 16, w: 24, h: 16 }, Math.floor(Math.random() * 4)));
  }
  return haz;
}
const dkShift = (list, x0) => list.map(o => ({ ...o, x: o.x + x0 }));
// Un morceau du temple : sol (avec 0 à 2 trous), plateformes au-dessus des trous, lames
function dkChunkTemple(x0, level) {
  const F = DKL().floor, plats = [];
  let solids = [{ x: 0, y: F, w: DK_W, h: VH - F }], haz = [];
  if (x0 > 0) {
    const g = dkGaps(level, F); solids = g.solids;
    // un trou de plus de 52 px (un saut simple en couvre ≈ 75) a toujours une plateforme au-dessus, à 48 px du sol (hauteur d'un saut simple)
    for (const q of g.gaps) if (q.w > 52 || Math.random() < 0.3) plats.push({ x: q.x - 8, y: F - 48, w: q.w + 16, h: 16 });
    haz = dkHazards(x0, solids, level, F);
  }
  const terrain = makeTerrain({ W: CWORLDS[DKL().wi], solids, plats });
  return { x: x0, solids: dkShift(solids, x0), plats: dkShift(plats, x0), haz, terrain, gaps: [] };
}
// Un morceau de la grotte : une scène (jamais deux fois la même de suite), ses corniches, des trous, des rochers au hasard
function dkChunkGrotte(x0, level) {
  const F = DKL().floor, prev = DK.chunks.length ? DK.chunks[DK.chunks.length - 1].scene : -1;
  let scene = Math.floor(Math.random() * 6); if (scene === prev) scene = (scene + 1 + Math.floor(Math.random() * 5)) % 6;
  const ledges = GROTTE_LEDGES[scene].map(([a, b, y]) => ({ x: a, y, w: b - a, h: 8 }));
  const rocks = [];   // rochers flottants dessinés avec le terrain de la Grotte néon
  const near = (x, w, y) => ledges.concat(rocks).some(l => x < l.x + l.w + 8 && x + w > l.x - 8 && Math.abs(l.y - y) < 26);
  let solids = [{ x: 0, y: F, w: DK_W, h: VH - F }], gaps = [], haz = [];
  if (x0 > 0) {
    const g = dkGaps(level, F); solids = g.solids; gaps = g.gaps;
    for (const q of g.gaps) {
      // une corniche peinte assez basse au-dessus du trou suffit ; sinon un rocher à 48 px du sol
      const covered = ledges.some(l => l.y >= F - 56 && l.x <= q.x && l.x + l.w >= q.x + q.w);
      if (!covered && (q.w > 52 || Math.random() < 0.3)) rocks.push({ x: q.x - 8, y: F - 48, w: q.w + 16, h: 12 });
    }
    haz = dkHazards(x0, solids, level, F);
  }
  // marchepieds au hasard sous les corniches hautes (on peut y grimper : jamais plus de 48 px à monter)
  for (const l of ledges) if (l.y < F - 60 && l.y >= F - 100 && Math.random() < 0.6) {
    const w = 40, x = Math.max(4, Math.min(DK_W - w - 4, l.x + Math.random() * Math.max(1, l.w - w)));
    if (!near(x, w, F - 48)) rocks.push({ x: Math.round(x), y: F - 48, w, h: 12 });
  }
  // et parfois un rocher de plus pour changer le parcours
  if (Math.random() < 0.5) { const x = 40 + Math.floor(Math.random() * 380), y = F - 48 - (Math.random() < 0.4 ? 40 : 0); if (!near(x, 48, y)) rocks.push({ x, y, w: 48, h: 12 }); }
  const terrain = makeTerrain({ W: CWORLDS[DKL().wi], solids: [], plats: rocks });
  const fall = Math.random() < 0.55 ? { x: x0 + 60 + Math.floor(Math.random() * 360), f: Math.random() < 0.5 ? 0 : 1 } : null;   // cascade du fond
  return { x: x0, scene, solids: dkShift(solids, x0), plats: dkShift(ledges.concat(rocks), x0), haz, terrain, gaps: dkShift(gaps, x0), fall };
}
function dkChunk(x0, level) { return DK.lv === "grotte" ? dkChunkGrotte(x0, level) : dkChunkTemple(x0, level); }
function dkRebuild() {
  lvl.solids = DK.chunks.flatMap(c => c.solids); lvl.plats = DK.chunks.flatMap(c => c.plats); lvl.hazards = DK.chunks.flatMap(c => c.haz);
}
// Grotte : monstres du fond (petits, lointains) et gardiens du premier plan, ajoutés devant au fil de la course
function dkSpawnLife() {
  if (DK.lv !== "grotte") return;
  const n = 1 + (Math.random() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const kind = ["grotte_lezard", "grotte_golem", "grotte_chauvesouris"][Math.floor(Math.random() * 3)], fly = kind === "grotte_chauvesouris";
    const dir = Math.random() < 0.5 ? 1 : -1;
    DK.bg.push({ kind, fly, x: DK.cam * DK_FAR + VW + 20 + Math.random() * 260, y: fly ? 50 + Math.random() * 70 : 196 + Math.random() * 10,
      vx: dir * (fly ? 24 + Math.random() * 16 : 8 + Math.random() * 8), ph: Math.random() * 6, sc: fly ? 0.7 + Math.random() * 0.3 : 0.65 + Math.random() * 0.25 });
  }
  if (Math.random() < 0.6) DK.guards.push({ row: ["cristal", "spectre", "champignon"][Math.floor(Math.random() * 3)], x: DK.cam * DK_FG + VW + 60 + Math.random() * 300 });
}
function startDahaka(lv = DK.lv) {
  DK.lv = lv;
  const L = DKL(), W = CWORLDS[L.wi], F = L.floor;
  lvl = { json: true, dahaka: true, W, R: W.rooms[0], width: 1e9, solids: [], plats: [], blocks: [], decor: [], hazards: [], dest: [], items: [], exits: [],
    machine: null, ckpt: null, start: { x: 60, y: F - 40 }, foeSpawns: [], bossSpawn: null, lastSafe: null, leaving: false, arena: null, covers: [], gold: [], qitems: [], sock: null };
  enemies = []; lasers = []; parts = []; pickups = []; ghosts = []; fxs = []; mach = null; chal = null; roomTime = 0; hitstop = 0;
  players = [makePlayer(ch(), K, 0)]; const p = players[0]; p.x = 60; p.y = F - p.h; p.hp = 1; p.inv = 0;
  Object.assign(DK, { st: "run", t: 0, cam: 0, chunks: [], nextX: 0, dist: 0, dx: -60, dvx: 0, an: "cri", anT: 0, jumpT: 0, paused: false, sel: 0, slowT: 0, safe: { x: 60, y: F - 32 }, warn: 0, bg: [], guards: [] });
  for (let i = 0; i < 3; i++) { DK.chunks.push(dkChunk(DK.nextX, 0)); DK.nextX += DK_W; }
  dkRebuild(); dkSpawnLife();
  DK.best = dkBest(lv);
  state = "dahaka"; audio.sfx(pickSfx("dk_cri", "boss_intro")); voice.say("Cours ! Le Dahaka arrive !", true);
  msg = { text: "Cours ! Le Dahaka arrive !", t: 2.5 };
}
function dkCaught() {
  DK.st = "caught"; DK.t = 0; DK.an = "saisie"; DK.anT = 0; DK.ate = false;
  const m = Math.floor(DK.dist), k = dkKey(DK.lv, df().id); DK.isNew = m > (SAVE.dahaka.best[k] || 0);
  if (DK.isNew) { SAVE.dahaka.best[k] = m; saveGame(); }
  audio.sfx("bosshit"); shake = 6; rumble(400, 0.8, 0.6);
}
SCREENS.dahaka = {
  update(rdt) {
    const p = players[0];
    if (DK.st === "result") {
      if (hit(...K.left, ...K.right, ...K.up, ...K.down)) { DK.sel = 1 - DK.sel; audio.sfx("select"); }
      const again = { x: 150, y: 196, w: 84, h: 20 }, back = { x: 246, y: 196, w: 84, h: 20 };
      if (hit("Mouse0") && inside(again) || hit(...K.ok) && DK.sel === 0) { startDahaka(); return; }
      if (hit("Mouse0") && inside(back) || hit(...K.ok) && DK.sel === 1 || hit("Escape", "GB")) { enterHub({ x: 380 }); return; }
      return;
    }
    if (hit("Escape", "KeyP", "TPause", "GStart")) { DK.paused = !DK.paused; audio.sfx("pause"); }
    if (DK.paused) { if (hit("KeyQ", "GB", "Backspace")) enterHub({ x: 380 }); return; }
    const dt = rdt * (slowOn ? 0.35 : 1);
    roomTime += dt; DK.t += dt; DK.anT += dt; if (msg && msg.t > 0) msg.t -= rdt;
    // pouvoirs (ralenti, super vitesse…) comme en jeu
    const d = df(), pw = powerOf(p.C);
    if (pw && pw.burst) { p.powerOn = false; if (d.power && hit(...p.input.power)) burstPower(p, pw); p.gauge = Math.min(1, p.gauge + d.regen * rdt); }
    else { p.powerOn = !!(d.power && pw && down(...p.input.power) && p.gauge > 0); p.gauge = p.powerOn ? Math.max(0, p.gauge - d.drain * rdt) : Math.min(1, p.gauge + d.regen * rdt); }
    setTimeFx(usingPower(p, "slow"), usingPower(p, "fast"));
    for (const m of DK.bg) m.x += m.vx * dt;
    // attrapé : il saisit le héros (qui devient une boule de lumière dans ses mains), le porte à sa bouche et l'avale ; game over
    if (DK.st === "caught") {
      p.vx = p.vy = 0;
      // le héros glisse dans ses mains tendues (≈ 35 px devant ses pieds, 29 px au-dessus du sol)
      const k = Math.min(1, dt * 10), F = DKL().floor;
      p.x += (DK.dx + 30 - p.x) * k; p.y += (F - 13 - p.h - p.y) * k;
      if (DK.t > 0.35) p.fade = Math.max(0, 1 - (DK.t - 0.35) * 4);
      if (DK.t > 0.6 && DK.an === "saisie") { DK.an = "mise_en_bouche"; DK.anT = 0; }
      if (DK.an === "mise_en_bouche" && !DK.ate && DK.anT > 3 / 7) { DK.ate = true; audio.sfx(pickSfx("dk_croque", "bosshit")); shake = 4; rumble(250, 0.6, 0.4); }
      if (DK.t > 1.9) { DK.st = "result"; DK.sel = 0; setTimeFx(false, false); audio.sfx(DK.isNew ? "victory" : "gameover"); }
      updateParts(dt); return;
    }
    // héros : ralenti après un piège ou une chute
    if (DK.slowT > 0) { DK.slowT -= dt; p.vx *= 0.9; }
    p.inv = 0; updatePlayer(p, dt); p.hp = 1;
    if (p.x < DK.cam + 2) { p.x = DK.cam + 2; if (p.vx < 0) p.vx = 0; }
    const ground = x => lvl.solids.some(s => x >= s.x && x <= s.x + s.w) || lvl.plats.some(q => x >= q.x && x <= q.x + q.w);
    if (p.onGround && ground(p.x - 12) && ground(p.x + 22) && !lvl.hazards.some(h => hazardPhase(h) !== "safe" && Math.abs(h.x - p.x) < 30)) DK.safe = { x: p.x, y: p.y };
    // chute dans un trou : remis au bord, ralenti (le Dahaka se rapproche)
    if (p.y > VH + 10) { p.x = DK.safe.x; p.y = DK.safe.y - 4; p.vx = p.vy = 0; DK.slowT = 0.9; flash = 0.15; audio.sfx("hurt"); addFx("fx_teleport", p.x + 5, p.y + p.h); }
    // pièges : pas de cœur perdu, mais un recul et un ralentissement
    for (const h of lvl.hazards) {
      const ph = hazardPhase(h);
      if (ph === "tele" && h.lastPh !== "tele" && Math.abs(h.x - p.x) < 160) audio.sfx("aim");
      h.lastPh = ph;
      if (ph === "active" && ov(p, h) && DK.slowT <= 0) { DK.slowT = 0.8; p.vx = -160; p.vy = -200; audio.sfx("hurt"); burst(p.x + 5, p.y + 16, 10, ["#ff8ab0", "#ffffff"], 120, 0.4, 200, 1); rumble(150, 0.5, 0.3); }
    }
    // caméra : avance seulement ; le niveau se fabrique devant, les morceaux passés sont oubliés
    DK.cam = Math.max(DK.cam, p.x - 170);
    if (DK.nextX < DK.cam + VW * 2) {
      DK.chunks.push(dkChunk(DK.nextX, Math.floor(DK.dist / 100))); DK.nextX += DK_W; while (DK.chunks.length > 4) DK.chunks.shift(); dkRebuild(); dkSpawnLife();
      DK.bg = DK.bg.filter(m => m.x - DK.cam * DK_FAR > -120 && m.x - DK.cam * DK_FAR < VW * 3);
      DK.guards = DK.guards.filter(g => g.x - DK.cam * DK_FG > -80);
    }
    DK.dist = Math.max(DK.dist, (p.x - DK.startX) / 16);
    // le Dahaka : il court (un peu plus vite avec la distance), passe au-dessus des trous, et se rapproche s'il est trop loin
    const sp = Math.min(dkSpeed() + DK.dist * 0.06, dkSpeed() + 40) * (slowOn ? 0.35 : 1);
    if (!(DK.an === "cri" && DK.anT < 0.75)) {   // il pousse d'abord son cri
      DK.dx += sp * rdt;
      if (p.x - DK.dx > 260) DK.dx = p.x - 260;   // jamais trop loin : la poursuite reste tendue
      // au bord d'un trou, il saute par-dessus ; sinon il court, plus vite quand il talonne le héros
      DK.jumpT = Math.max(0, DK.jumpT - rdt);
      if (DK.jumpT <= 0 && !lvl.solids.some(s => DK.dx + 24 >= s.x && DK.dx + 24 <= s.x + s.w)) { DK.jumpT = 0.67; DK.anT = 0; }
      DK.an = DK.jumpT > 0 ? "saut" : p.x - DK.dx < 150 ? "course_rapide" : "course_lente";
    }
    const gap = p.x - DK.dx;   // le Dahaka mesure ≈ 64 px de large : son avant est à 30 px de son repère
    DK.warn = Math.max(0, 1 - (gap - 40) / 150);
    if (gap < 80 && Math.floor(DK.t * 6) % 2) shake = Math.max(shake, 1);
    if (gap < 32) dkCaught();
    updateParts(dt); updateFx(dt);
  },
  draw() {
    const p = players[0], cam = Math.round(DK.cam), L = DKL(), F = L.floor, cave = DK.lv === "grotte";
    if (cave) drawGrotteBack(cam);
    else {
      // fond du temple qui défile lentement (parallaxe), une copie sur deux en miroir : pas de raccord visible
      const bg = getImg(lvl.R.bg), sx = cam * 0.3, n0 = Math.floor(sx / VW), off = -Math.round(sx - n0 * VW);
      if (bg.ok) for (let k = 0; k < 2; k++) {
        ctx.save(); ctx.translate(off + k * VW, 0); if ((n0 + k) % 2) { ctx.translate(VW, 0); ctx.scale(-1, 1); }
        ctx.drawImage(bg.img, 0, 0, VW, VH); ctx.restore();
      } else R(0, 0, VW, VH, "#120a22");
      R(0, 0, VW, VH, "rgba(8,4,20,0.25)");
    }
    ctx.save(); ctx.translate(-cam, 0);
    for (const c of DK.chunks) {
      if (cave) drawGrottePits(c, F);
      if (c.terrain) ctx.drawImage(c.terrain, c.x, 0);
      else if (!cave) { for (const s of c.solids) R(s.x, s.y, s.w, s.h, "#2a2440"); for (const q of c.plats) R(q.x, q.y, q.w, 6, "#4a3a68"); }
    }
    for (const h of lvl.hazards) drawCampHazard(h);
    // le Dahaka : lueur (il est très sombre), puis la planche
    const FPS = { cri: 8, course_lente: 7, course_rapide: 12, saut: 9, saisie: 10, mise_en_bouche: 7 }, once = ["cri", "saut", "saisie", "mise_en_bouche"].includes(DK.an);
    const fr = animFrame("dahaka", DK.an, once ? DK.anT : DK.t, FPS[DK.an] || 10, !once);
    glow(ctx, DK.dx, F - 28, 48, L.glow, 0.45 + 0.1 * Math.sin(time * 5));
    if (hasAtlas("dahaka")) drawFrame("dahaka", fr, Math.round(DK.dx), F, 1);
    else { R(DK.dx - 14, F - 50, 28, 50, "#1a1028"); R(DK.dx + 4, F - 44, 4, 3, "#9fb0ff"); }
    if (Math.random() < 0.5) parts.push({ x: DK.dx - 10 + Math.random() * 20, y: F - Math.random() * 50, vx: -30, vy: -10, life: 0.6, max: 0.6, color: Math.random() < 0.5 ? "#7a5cc4" : "#2a1a3a", size: 2, grav: 0 });
    drawFxList(true);
    drawCampPlayer(p);
    drawFxList(false);
    for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(Math.round(q.x), Math.round(q.y), q.size, q.size, q.color); }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (cave) drawGrotteFront(cam, p);
    // bord gauche qui s'assombrit quand il approche
    if (DK.warn > 0) { const g = ctx.createLinearGradient(0, 0, 120, 0); g.addColorStop(0, `rgba(90,30,160,${0.55 * DK.warn})`); g.addColorStop(1, "rgba(90,30,160,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 120, VH); }
    // HUD : distance, record, jauge de pouvoir, distance du Dahaka
    R(0, 0, VW, 16, "rgba(10,6,24,0.7)");
    text("La course du Dahaka · " + L.name.toLowerCase(), 6, 8, 9, "#c86eff");
    text(`${Math.floor(DK.dist)} m`, VW / 2, 8, 11, "#ffffff", "center", "#c86eff");
    text(`Record : ${DK.best} m`, VW - 8, 8, 8, "#fccc28", "right");
    const gp = players[0].gauge || 0; R(6, VH - 12, 60, 5, "#2a1a3a"); R(6, VH - 12, Math.round(60 * gp), 5, ch().color);
    text("Dahaka", 74, VH - 9, 7, "#b9a6e0"); R(110, VH - 12, 80, 5, "#2a1a3a"); R(110, VH - 12, Math.round(80 * DK.warn), 5, DK.warn > 0.7 ? "#ff3b5c" : "#c86eff");
    if (msg && msg.t > 0) text(msg.text, VW / 2, 40, 11, "#e8dcff", "center", "#c86eff");
    if (DK.paused) {
      R(0, 0, VW, VH, "rgba(10,6,24,0.7)"); text("Pause", VW / 2, 110, 16, "#c86eff", "center", "#c86eff");
      text(say("Échap : reprendre   Q : laverie", "⏸ : reprendre", "Start : reprendre   {B} : laverie"), VW / 2, 136, 8, "#e8dcff", "center");
    }
    if (DK.st === "result") {
      R(0, 0, VW, VH, "rgba(10,6,24,0.75)");
      text("Game over", VW / 2, 80, 18, "#c86eff", "center", "#c86eff");
      text("Le Dahaka t'a mangé !", VW / 2, 102, 10, "#e8dcff", "center");
      text(`Tu as couru ${Math.floor(DK.dist)} m`, VW / 2, 124, 12, "#ffffff", "center");
      text(DK.isNew ? "Nouveau record !" : `Record : ${Math.max(DK.best, Math.floor(DK.dist))} m`, VW / 2, 146, 10, DK.isNew ? "#7dffb0" : "#fccc28", "center");
      text("Cours encore plus vite la prochaine fois !", VW / 2, 170, 7, "#b9a6e0", "center");
      drawButton({ x: 150, y: 196, w: 84, h: 20 }, "Rejouer", DK.sel === 0, "#c86eff", 9);
      drawButton({ x: 246, y: 196, w: 84, h: 20 }, "Laverie", DK.sel === 1, "#b9a6e0", 9);
    }
  },
};
// Grotte, plans du fond : scènes (au pas du héros), monstres lointains (plus lents : parallaxe), cascades, raccords assombris
function drawGrotteBack(cam) {
  R(0, 0, VW, VH, "#120a2a");
  for (const c of DK.chunks) {
    const x = c.x - cam; if (x > VW || x + DK_W < 0) continue;
    if (hasAtlas("grotte_scene_" + (c.scene + 1))) drawFrame("grotte_scene_" + (c.scene + 1), 0, x + DK_W / 2, VH, 1);
  }
  for (const m of DK.bg) {
    const x = Math.round(m.x - cam * DK_FAR); if (x < -60 || x > VW + 60) continue;
    const y = m.fly ? m.y + Math.sin(time * 2 + m.ph) * 6 : m.y;
    if (hasAtlas(m.kind)) drawFrame(m.kind, animFrame(m.kind, "play", time + m.ph, m.fly ? 8 : 5), x, Math.round(y), m.vx < 0 ? -1 : 1, 0.8, m.sc);
  }
  for (const c of DK.chunks) if (c.fall && hasAtlas("grotte_cascade")) {
    const x = c.fall.x - cam; if (x < -70 || x > VW + 70) continue;
    drawFrame("grotte_cascade", (Math.floor(time * 6) + c.fall.f) % 2, Math.round(x), DKL().floor + 4, 1, 0.85);
  }
  for (const c of DK.chunks) {
    const x = c.x - cam; if (x < -24 || x > VW + 24) continue;
    const g = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
    g.addColorStop(0, "rgba(14,8,34,0)"); g.addColorStop(0.5, "rgba(14,8,34,0.6)"); g.addColorStop(1, "rgba(14,8,34,0)");
    ctx.fillStyle = g; ctx.fillRect(x - 22, 0, 44, VH);
  }
}
// Grotte : les trous du sol peint (gouffre sombre, bords en dents de roche)
function drawGrottePits(c, F) {
  for (const q of c.gaps) {
    const g = ctx.createLinearGradient(0, F - 4, 0, VH); g.addColorStop(0, "#2a1d58"); g.addColorStop(0.35, "#120a2c"); g.addColorStop(1, "#05020e");
    ctx.fillStyle = g; ctx.fillRect(q.x, F - 2, q.w, VH - F + 2);
    // parois en dents de roche, plus claires en haut (le bord du gouffre se lit bien)
    for (const [x0, dir] of [[q.x, 1], [q.x + q.w, -1]]) {
      ctx.fillStyle = "#3d2c78"; ctx.beginPath(); ctx.moveTo(x0, F - 3);
      for (let y = F - 3, i = 0; y <= VH; y += 7, i++) ctx.lineTo(x0 + dir * (i % 2 ? 7 : 2), y);
      ctx.lineTo(x0, VH); ctx.closePath(); ctx.fill();
    }
    R(q.x, F - 3, q.w, 1, "#5a44a8");
  }
}
// Grotte, premier plan : gardiens qui suivent le héros du regard (plus rapides que la scène : parallaxe), puis le cadre de stalactites
function drawGrotteFront(cam, p) {
  const hx = p.x + 5 - cam;
  for (const g of DK.guards) {
    const x = Math.round(g.x - cam * DK_FG); if (x < -40 || x > VW + 40) continue;
    const dx = hx - x, look = dx > 110 ? 0 : dx > 35 ? 1 : dx > -35 ? 2 : dx > -110 ? 3 : 4;   // vus de dos : 0 regarde à droite … 4 à gauche
    if (hasAtlas("grotte_gardiens")) drawFrame("grotte_gardiens", ATL.grotte_gardiens.anims[g.row][0] + look, x, VH + 2, 1, 1, 0.85);   // le bord des trous (y 228) reste visible
  }
  // cadre de stalactites fixe à l'écran (il ne cache jamais le héros) ; un autre cadre arrive en fondu tous les 960 px
  const span = 960, k = Math.floor(cam / span), f = Math.min(1, Math.max(0, (cam - k * span - (span - 160)) / 160));
  const id = j => "grotte_avant_" + (1 + j % 4);
  if (hasAtlas(id(k))) drawFrame(id(k), 0, VW / 2, VH, 1, 0.92 * (1 - f));
  if (f > 0 && hasAtlas(id(k + 1))) drawFrame(id(k + 1), 0, VW / 2, VH, 1, 0.92 * f);
}
