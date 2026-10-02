/* ---------------- Niveau secret : la course du Dahaka ---------------- */
// Débloqué en tapant DAHAKA sur l'écran des mondes (SAVE.flags.dahaka). Niveau sans fin vers la droite, fabriqué par morceaux
// de 480 px (sol, trous, plateformes et pièges annoncés du temple). Le Dahaka, invincible, court derrière le héros ; il
// l'attrape s'il le rejoint. Un trou ou un piège ne coûte pas de cœur : le héros est ralenti (ou remis au bord du trou), et le
// Dahaka se rapproche. Score : distance en mètres (16 px = 1 m), record par difficulté dans SAVE.dahaka.best.
const DK = { st: "run", t: 0, cam: 0, chunks: [], nextX: 0, startX: 40, best: 0, dist: 0, dx: 0, dvx: 0, an: "apparait", anT: 0, paused: false, sel: 0 };
const DK_W = 480, DK_FLOOR = 240, DK_SECRET = "DAHAKA";
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
  if (hasAtlas("dahaka")) drawFrame("dahaka", animFrame("dahaka", "repos", time, 8), r.x + r.w / 2 - 8, r.y + 4 + th, 1, 1, 0.8);
}
const dkSpeed = () => ({ facile: 100, normal: 116, doom: 132 })[df().id] || 116;
// Un morceau de niveau : sol (avec 0 à 2 trous), plateformes au-dessus des trous, pièges annoncés sur le sol
function dkChunk(x0, level) {
  const solids = [], plats = [], haz = [];
  if (x0 === 0) solids.push({ x: 0, y: DK_FLOOR, w: DK_W, h: 32 });
  else {
    const gaps = level < 2 ? 1 : Math.random() < 0.5 ? 1 : 2, gw = () => Math.min(40 + level * 6 + Math.random() * 24, 96);
    let x = 0;
    for (let g = 0; g < gaps; g++) {
      const seg = gaps === 1 ? 90 + Math.random() * 90 : 70 + Math.random() * 60, w = gw();
      solids.push({ x, y: DK_FLOOR, w: Math.round(seg), h: 32 }); x += seg;
      // un trou de plus de 52 px (un saut simple en couvre ≈ 75) a toujours une plateforme au-dessus, à 48 px du sol (hauteur d'un saut simple)
      if (w > 52 || Math.random() < 0.3) plats.push({ x: Math.round(x - 8), y: 192, w: Math.round(w + 16), h: 16 });
      x += w;
    }
    solids.push({ x: Math.round(x), y: DK_FLOOR, w: DK_W - Math.round(x), h: 32 });
    // pièges annoncés (lames qui sortent du sol) sur les plus longs bouts de sol
    for (const s of solids) if (s.w > 110 && Math.random() < 0.35 + level * 0.06) {
      const hx = s.x + 40 + Math.floor(Math.random() * (s.w - 80));
      haz.push(makeHazard({ id: "dk_lame", asset: "hazard_effect", hazardType: "floor_blade", cycle: { telegraphSeconds: 0.7, activeSeconds: 0.6, safeSeconds: 1.6 } }, { x: x0 + hx, y: DK_FLOOR - 16, w: 24, h: 16 }, Math.floor(Math.random() * 4)));
    }
  }
  const W = CWORLDS[2], terrain = makeTerrain({ W, solids, plats });
  return { x: x0, solids: solids.map(s => ({ ...s, x: s.x + x0 })), plats: plats.map(p => ({ ...p, x: p.x + x0 })), haz, terrain };
}
function dkRebuild() {
  lvl.solids = DK.chunks.flatMap(c => c.solids); lvl.plats = DK.chunks.flatMap(c => c.plats); lvl.hazards = DK.chunks.flatMap(c => c.haz);
}
function startDahaka() {
  const W = CWORLDS[2];
  lvl = { json: true, dahaka: true, W, R: W.rooms[0], width: 1e9, solids: [], plats: [], blocks: [], decor: [], hazards: [], dest: [], items: [], exits: [],
    machine: null, ckpt: null, start: { x: 60, y: 200 }, foeSpawns: [], bossSpawn: null, lastSafe: null, leaving: false, arena: null, covers: [], gold: [], qitems: [], sock: null };
  enemies = []; lasers = []; parts = []; pickups = []; ghosts = []; fxs = []; mach = null; chal = null; roomTime = 0; hitstop = 0;
  players = [makePlayer(ch(), K, 0)]; const p = players[0]; p.x = 60; p.y = DK_FLOOR - p.h; p.hp = 1; p.inv = 0;
  Object.assign(DK, { st: "run", t: 0, cam: 0, chunks: [], nextX: 0, dist: 0, dx: -60, dvx: 0, an: "apparait", anT: 0, paused: false, sel: 0, slowT: 0, safe: { x: 60, y: DK_FLOOR - 32 }, warn: 0 });
  for (let i = 0; i < 3; i++) { DK.chunks.push(dkChunk(DK.nextX, 0)); DK.nextX += DK_W; }
  dkRebuild();
  DK.best = (SAVE.dahaka.best || {})[df().id] || 0;
  state = "dahaka"; audio.sfx("boss_intro"); voice.say("Cours ! Le Dahaka arrive !", true);
  msg = { text: "Cours ! Le Dahaka arrive !", t: 2.5 };
}
function dkCaught() {
  DK.st = "caught"; DK.t = 0; DK.an = "attrape"; DK.anT = 0;
  const m = Math.floor(DK.dist), id = df().id; DK.isNew = m > (SAVE.dahaka.best[id] || 0);
  if (DK.isNew) { SAVE.dahaka.best[id] = m; saveGame(); }
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
    if (DK.st === "caught") {
      DK.t > 0.5 && (p.fade = Math.max(0, 1 - (DK.t - 0.5) * 2));
      if (DK.t > 1.6) { DK.st = "result"; DK.sel = 0; setTimeFx(false, false); audio.sfx(DK.isNew ? "victory" : "gameover"); }
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
    if (DK.nextX < DK.cam + VW * 2) { DK.chunks.push(dkChunk(DK.nextX, Math.floor(DK.dist / 100))); DK.nextX += DK_W; while (DK.chunks.length > 4) DK.chunks.shift(); dkRebuild(); }
    DK.dist = Math.max(DK.dist, (p.x - DK.startX) / 16);
    // le Dahaka : il court (un peu plus vite avec la distance), passe au-dessus des trous, et se rapproche s'il est trop loin
    const sp = Math.min(dkSpeed() + DK.dist * 0.06, dkSpeed() + 40) * (slowOn ? 0.35 : 1);
    if (DK.an === "apparait" && DK.anT < 0.6) { /* il sort de la fumée */ }
    else {
      DK.an = "course"; DK.dx += sp * rdt;
      if (p.x - DK.dx > 260) DK.dx = p.x - 260;   // jamais trop loin : la poursuite reste tendue
    }
    const gap = p.x - DK.dx;
    DK.warn = Math.max(0, 1 - (gap - 30) / 150);
    if (gap < 70 && Math.floor(DK.t * 6) % 2) shake = Math.max(shake, 1);
    if (gap < 22) dkCaught();
    updateParts(dt); updateFx(dt);
  },
  draw() {
    const p = players[0], cam = Math.round(DK.cam);
    // fond du temple qui défile lentement (parallaxe), répété
    const bg = getImg(lvl.R.bg), sx = cam * 0.3, n0 = Math.floor(sx / VW), off = -Math.round(sx - n0 * VW);
    if (bg.ok) for (let k = 0; k < 2; k++) {   // une copie sur deux en miroir : pas de raccord visible
      ctx.save(); ctx.translate(off + k * VW, 0); if ((n0 + k) % 2) { ctx.translate(VW, 0); ctx.scale(-1, 1); }
      ctx.drawImage(bg.img, 0, 0, VW, VH); ctx.restore();
    } else R(0, 0, VW, VH, "#120a22");
    R(0, 0, VW, VH, "rgba(8,4,20,0.25)");
    ctx.save(); ctx.translate(-cam, 0);
    for (const c of DK.chunks) {
      if (c.terrain) ctx.drawImage(c.terrain, c.x, 0);
      else { for (const s of c.solids) R(s.x, s.y, s.w, s.h, "#2a2440"); for (const q of c.plats) R(q.x, q.y, q.w, 6, "#4a3a68"); }
    }
    for (const h of lvl.hazards) drawCampHazard(h);
    // le Dahaka : lueur violette (il est très sombre), puis la planche
    const dy = DK_FLOOR, fr = DK.st === "caught" ? animFrame("dahaka", "attrape", DK.anT, 8, false) : DK.an === "apparait" ? animFrame("dahaka", "apparait", DK.anT, 10, false) : animFrame("dahaka", "course", DK.t, 10);
    glow(ctx, DK.dx, dy - 28, 48, "160,90,255", 0.45 + 0.1 * Math.sin(time * 5));
    if (hasAtlas("dahaka")) drawFrame("dahaka", fr, Math.round(DK.dx), dy, 1);
    else { R(DK.dx - 14, dy - 50, 28, 50, "#1a1028"); R(DK.dx + 4, dy - 44, 4, 3, "#9fb0ff"); }
    if (Math.random() < 0.5) parts.push({ x: DK.dx - 10 + Math.random() * 20, y: dy - Math.random() * 50, vx: -30, vy: -10, life: 0.6, max: 0.6, color: Math.random() < 0.5 ? "#7a5cc4" : "#2a1a3a", size: 2, grav: 0 });
    drawFxList(true);
    drawCampPlayer(p);
    drawFxList(false);
    for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(Math.round(q.x), Math.round(q.y), q.size, q.size, q.color); }
    ctx.globalAlpha = 1;
    ctx.restore();
    // bord gauche qui s'assombrit quand il approche
    if (DK.warn > 0) { const g = ctx.createLinearGradient(0, 0, 120, 0); g.addColorStop(0, `rgba(90,30,160,${0.55 * DK.warn})`); g.addColorStop(1, "rgba(90,30,160,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 120, VH); }
    // HUD : distance, record, jauge de pouvoir, distance du Dahaka
    R(0, 0, VW, 16, "rgba(10,6,24,0.7)");
    text("La course du Dahaka", 6, 8, 9, "#c86eff");
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
      text("Le Dahaka t'a attrapé !", VW / 2, 92, 16, "#c86eff", "center", "#c86eff");
      text(`Tu as couru ${Math.floor(DK.dist)} m`, VW / 2, 124, 12, "#ffffff", "center");
      text(DK.isNew ? "Nouveau record !" : `Record : ${Math.max(DK.best, Math.floor(DK.dist))} m`, VW / 2, 146, 10, DK.isNew ? "#7dffb0" : "#fccc28", "center");
      text("Il te relâche dans un tourbillon de sable… et tu peux retenter ta chance !", VW / 2, 170, 7, "#b9a6e0", "center");
      drawButton({ x: 150, y: 196, w: 84, h: 20 }, "Rejouer", DK.sel === 0, "#c86eff", 9);
      drawButton({ x: 246, y: 196, w: 84, h: 20 }, "Laverie", DK.sel === 1, "#b9a6e0", 9);
    }
  },
};
