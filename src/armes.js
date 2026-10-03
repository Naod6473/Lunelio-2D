/* ---------------- Armes du râtelier ---------------- */
// Registre WEAPONS dans registres.js ; possession et choix par héros dans SAVE.weapons. Une arme autre que le sabre demande une
// planche « mains libres » (anims idle_free, shoot, throw, heavy : Hélio et Lune pour l'instant) : canWield(C) le vérifie.
// L'arme remplace le coup de sabre sur le même bouton (maintenir : arc chargé, rayon laser). Les tirs sont dans `lasers`
// avec owner "player" et wpn (updateWProj, drawWProj) ; les dégâts passent par hitEnemy(e, "proj", p, dégâts).
const canWield = C => !!(ATL[charAtlas(C)] && ATL[charAtlas(C)].anims.shoot);
function curWeapon(p) {
  const id = SAVE.weapons.eq[p.C.id];
  return id && id !== "sabre" && SAVE.weapons.owned[id] && canWield(p.C) ? WEAPON_BY_ID[id] : WEAPON_BY_ID.sabre;
}
// Position de la main (par rapport aux pieds, héros tourné vers la droite) dans les poses mains libres, mesurée sur les planches
const HAND = { 30: [0, -13], 31: [0, -13], 32: [0, -13], 33: [0, -13], 36: [5, -14], 37: [5, -14], 38: [5, -14], 39: [5, -14], 40: [5, -14], 41: [5, -14],
  42: [1, -12], 43: [1, -12], 48: [16, -12], 49: [16, -12], 54: [16, -20], 55: [13, -19], 56: [16, -20], 60: [-13, -21], 61: [9, -13], 62: [19, -21],
  66: [-1, -33], 67: [-4, -35], 68: [11, -8], 69: [9, -8] };
// Angle de l'arme selon la pose : visée (tir), geste de lancer, grand coup ; sinon l'angle de repos de l'arme
const POSE_ANGLE = { 60: -130, 61: -20, 62: 0, 66: -110, 67: -95, 68: 35, 69: 55 };
const wsfx = (n, fb) => audio.sfx(hasSound(SFX_FILES["arme:" + n] || "") ? "arme:" + n : fb);
const boomCd = () => ({ facile: 0.5, normal: 0.7, doom: 1 })[df().id] || 0.7;

// Image du héros armé : poses mains libres, ou la pose de l'action en cours (p.wPose)
function weaponFrame(p, fr) {
  const A = ATL[charAtlas(p.C)];
  if (p.wPose && p.wT >= 0) { const a = A.anims[p.wPose]; return a[0] + Math.min(a[1] - 1, p.wFix ?? Math.floor(p.wT / p.wDur * a[1])); }
  if (fr >= 24 && fr < 30) return A.anims.special_free[0] + (fr - 24) % A.anims.special_free[1];
  if (fr >= 18 && fr < 24) return A.anims.jump_free[0] + (fr - 18) % 2;
  if (fr >= 6 && fr < 12) return A.anims.run_free[0] + (fr - 6);
  return A.anims.idle_free[0] + fr % 4;
}
const setPose = (p, name, dur, fix) => { p.wPose = name; p.wT = 0; p.wDur = dur; p.wFix = fix; };
function wProj(p, o) {
  const l = { owner: "player", wpn: true, alive: true, p, hits: new Set(), t: 0, vx: 0, vy: 0, g: 0, w: 8, h: 4, dmg: 1, ...o };
  l.x -= l.w / 2; l.y -= l.h / 2; lasers.push(l); return l;
}
const handPos = p => { const h = HAND[playerFrame(p)] || [8, -16]; return [p.x + 5 + p.face * h[0], p.y + p.h + h[1]]; };
// Coup au corps à corps d'une arme : chaque ennemi n'est touché qu'une fois par coup (p.wHits)
function meleeHit(p, box, dmg, extra) {
  let any = false;
  for (const e of enemies) if (e.alive && ov(box, e) && !p.wHits.has(e)) { p.wHits.add(e); hitEnemy(e, "proj", p, dmg); if (extra) extra(e); any = true; }
  if (lvl.json) { p.hitList = p.wHits; campAttack(p, box, "atk"); }
  if (any) audio.sfx("sword_hit");
  return any;
}
const nearestFoe = (x, y, face) => {
  let best = null, bd = 1e9;
  for (const e of enemies) if (e.alive) { const dx = e.x + e.w / 2 - x, d = Math.hypot(dx, e.y + e.h / 2 - y) + (Math.sign(dx) === face ? 0 : 120); if (d < bd && d < 320) { bd = d; best = e; } }
  return best;
};

// Appelé par updatePlayer à la place du coup de sabre quand une autre arme est équipée
function updateWeapon(p, dt, boost) {
  const W = curWeapon(p), I = p.input, A = ATL[charAtlas(p.C)];
  p.wCd = (p.wCd || 0) - dt * boost;
  if (p.wT >= 0 && p.wPose) { p.wT += dt * boost; if (p.wT >= p.wDur && !p.wHoldPose) { p.wPose = null; p.wT = -1; } }
  p.comboT = Math.max(0, (p.comboT || 0) - dt);
  if (!p.wHits) p.wHits = new Set();
  const press = hit(...I.attack), held = down(...I.attack), ready = p.wCd <= 0 && p.dashT <= 0 && state !== "hub";   // pas de tir dans la laverie
  const [hx, hy] = handPos(p);
  if (W.id !== "laser") { p.heat = Math.max(0, (p.heat || 0) - dt / 1.2); if (p.heat <= 0) p.over = false; p.beam = null; }
  switch (W.id) {
    case "arc": {
      if (held && ready) { p.wHold = (p.wHold || 0) + dt; p.wHoldPose = true; setPose(p, "shoot", 1, 0);
        if (p.wHold >= 0.5 && !p.wCharged) { p.wCharged = true; wsfx("arc-charge", "gauge_full"); burst(hx, hy, 8, ["#ff8ab0", "#ffffff"], 60, 0.3, 0, 1); } }
      else if (p.wHold > 0) {
        const ch2 = p.wCharged;
        wProj(p, { kind: "arrow", x: hx + p.face * 6, y: hy + 5, w: 12, h: 14, vx: p.face * (ch2 ? 520 : 380), pierce: ch2 ? 2 : 0, dmg: ch2 ? 2 : 1, life: 1.2 });
        wsfx("arc-tir", "slash"); p.wHold = 0; p.wCharged = false; p.wHoldPose = false; setPose(p, "shoot", 0.25); p.wCd = 0.35;
      }
      break;
    }
    case "boomerang":
      if (press && ready) {
        const t = nearestFoe(p.x + 5, p.y + 16, p.face);
        wProj(p, { kind: "boom", x: hx, y: hy, w: 10, h: 10, vx: p.face * 430, target: t, life: 1.3 });
        wsfx("boomerang-lancer", "dash"); setPose(p, "throw", 0.25); p.wCd = boomCd();
      }
      break;
    case "lance":
      if (press && ready) { p.wHits = new Set(); p.pogo = !p.onGround && down(...I.drop); setPose(p, p.pogo ? "heavy" : "shoot", 0.25, p.pogo ? 3 : undefined); p.wCd = 0.4; wsfx("lance-coup", "slash"); }
      if (p.wPose && p.wT > 0.03 && p.wT < 0.2) {
        if (p.pogo) { if (meleeHit(p, { x: p.x - 6, y: p.y + p.h - 4, w: 22, h: 22 }, 1)) { p.vy = -380; p.pogo = false; wsfx("arme-rebond", "jump"); } }
        else meleeHit(p, { x: p.face > 0 ? p.x + p.w : p.x - 50, y: p.y + 6, w: 50, h: 14 }, 1);
      }
      break;
    case "pistolet":
      if (press && ready) { wProj(p, { kind: "bubble", x: hx + p.face * 6, y: hy, w: 10, h: 10, vx: p.face * 150, y0: hy, life: 2.4 }); wsfx("pistolet-tir", "dj"); setPose(p, "shoot", 0.22); p.wCd = 0.5; }
      break;
    case "canon":
      if (press && ready) {
        wProj(p, { kind: "ball", x: hx + p.face * 8, y: hy - 2, w: 9, h: 9, vx: p.face * 220, vy: -110, g: 520, life: 2 });
        wsfx("canon-tir", "boom"); setPose(p, "shoot", 0.3); p.wCd = 1.2; p.vx -= p.face * 140; shake = Math.max(shake, 2);
      }
      break;
    case "laser": {
      const firing = held && !p.over && p.dashT <= 0 && state !== "hub";
      if (firing) {
        p.wHoldPose = true; setPose(p, "shoot", 1, 1);
        p.heat = (p.heat || 0) + dt / 2.2;
        if (p.heat >= 1) { p.over = true; p.heat = 1; wsfx("laser-surchauffe", "nope"); }
        let x2 = hx, hitE = null;
        for (let d = 0; d < 170; d += 4) { x2 = hx + p.face * d; if (solidAt(x2, hy)) break;
          hitE = enemies.find(e => e.alive && x2 >= e.x && x2 <= e.x + e.w && hy >= e.y - 2 && hy <= e.y + e.h + 2); if (hitE) break; }
        p.beam = { x1: hx, x2, y: hy };
        p.beamT = (p.beamT || 0) - dt; p.laserSnd = (p.laserSnd || 0) - dt;
        if (p.laserSnd <= 0) { p.laserSnd = 0.45; wsfx("laser-rayon", "laser"); }
        if (hitE && p.beamT <= 0) { p.beamT = hitE.type === "bigboss" || hitE.type === "boss" ? 0.35 : 0.15; hitEnemy(hitE, "proj", p, 1); burst(x2, hy, 4, ["#bff4ff", "#ffffff"], 60, 0.2, 0, 1); }
        if (lvl.json && p.beamT <= 0) { p.hitList = new Set(); campAttack(p, { x: Math.min(hx, x2), y: hy - 2, w: Math.abs(x2 - hx) + 2, h: 4 }, "atk"); p.beamT = 0.15; }
      } else {
        p.beam = null; if (p.wHoldPose) { p.wHoldPose = false; p.wPose = null; p.wT = -1; }
        p.heat = Math.max(0, (p.heat || 0) - dt / 1.2); if (p.heat <= 0) p.over = false;
      }
      break;
    }
    case "nunchaku":
      if (press && ready) { p.combo = p.comboT > 0 ? ((p.combo || 0) + 1) % 3 : 0; p.comboT = 0.45; p.wHits = new Set(); setPose(p, "throw", 0.18, [1, 2, 1][p.combo]); p.wCd = 0.22; wsfx("nunchaku-coup", "slash"); }
      if (p.wPose === "throw" && p.wT > 0.02 && p.wT < 0.14) {
        const box = { x: p.face > 0 ? p.x + p.w - 2 : p.x - 26, y: p.y + 2, w: 28, h: p.h - 4 };
        meleeHit(p, box, 1, p.combo === 2 ? e => { if (e.type === "foe" && e.alive) e.x += p.face * 12; } : null);
        for (const l of lasers) if (l.alive && l.owner === "enemy" && l.kind !== "wave" && !l.noReflect && ov(box, l)) {
          l.owner = "player"; l.color = fxCol(p); l.vx = -l.vx * 1.6; l.vy = -(l.vy || 0) * 1.6; l.g = 0; audio.sfx("deflect"); hitstop = 0.05;
        }
      }
      break;
    case "espadon":
      if (press && ready) { p.wHits = new Set(); p.wDone = false; setPose(p, "heavy", 0.5); p.wCd = 0.9; }
      if (p.wPose === "heavy" && p.wT > 0.24 && p.wT < 0.34) {
        meleeHit(p, { x: p.face > 0 ? p.x + p.w - 4 : p.x - 40, y: p.y - 10, w: 44, h: p.h + 14 }, 2);
        if (!p.wDone) { p.wDone = true; wsfx("espadon-coup", "slash"); shake = Math.max(shake, 3);
          if (p.onGround) { wProj(p, { kind: "swave", x: p.x + 5 + p.face * 22, y: p.y + p.h - 6, w: 14, h: 12, vx: p.face * 210, life: 0.35 }); wsfx("espadon-onde", "wave"); } }
      }
      if (p.wPose === "heavy" && p.onGround) p.vx *= 0.85;
      break;
    case "lancepierre":
      if (press && ready) { wProj(p, { kind: "pebble", x: hx + p.face * 6, y: hy + 1, w: 6, h: 10, vx: p.face * 330, vy: -60, g: 500, bounces: 2, life: 1.6 }); wsfx("lancepierre-tir", "slash"); setPose(p, "shoot", 0.2); p.wCd = 0.45; }
      break;
    case "maillet":
      if (press && ready) { p.wHits = new Set(); p.wDone = false; setPose(p, "heavy", 0.55); p.wCd = 1; wsfx("maillet-coup", "slash"); }
      if (p.wPose === "heavy" && p.wT > 0.28 && !p.wDone) {
        p.wDone = true;
        const cx = p.x + 5 + p.face * 14, fy = p.y + p.h;
        meleeHit(p, { x: cx - 48, y: fy - 40, w: 96, h: 44 }, 1, e => { if (e.alive) e.stunT = Math.max(e.stunT || 0, 1); });
        shake = Math.max(shake, 5); rumble(120, 0.4, 0.6); wsfx("maillet-sol", "boom");
        burst(cx, fy - 2, 18, ["#7dffb0", "#fccc28", "#ffffff"], 160, 0.5, 300, 2);
        if (typeof addFx === "function" && lvl.json) addFx("fx_poussiere", cx, fy);
      }
      if (p.wPose === "heavy" && p.onGround) p.vx *= 0.85;
      break;
  }
  // bulles : l'ennemi enfermé flotte puis la bulle éclate
  for (const e of enemies) if (e.alive && e.bubT > 0) {
    e.bubT -= dt; e.y -= 14 * dt; e.stunT = Math.max(e.stunT || 0, 0.2);
    if (e.bubT <= 0) { burst(e.x + e.w / 2, e.y + e.h / 2, 12, ["#bff4ff", "#ff8ad8", "#ffffff"], 120, 0.4, 0, 1); wsfx("pistolet-eclate", "dj"); hitEnemy(e, "proj", e.bubBy || p, 1); }
  }
}

// Tirs des armes (dans lasers)
function updateWProj(l, dt) {
  l.t += dt; if (l.t > l.life) { l.alive = false; return; }
  if (l.kind === "aboi") {   // super aboiement : un cercle de son qui grandit ; il renverse tout ce qu'il touche et efface les tirs
    l.r = 10 + 280 * l.t; l.x = l.cx - l.r; l.y = l.cy - l.r * 0.6; l.w = l.h = 0; l.w = l.r * 2; l.h = l.r * 1.2;
    for (const e of enemies) if (e.alive && !l.hits.has(e) && Math.hypot(e.x + e.w / 2 - l.cx, (e.y + e.h / 2 - l.cy) / 0.6) < l.r) { l.hits.add(e); hitEnemy(e, "proj", l.p, e.type === "bigboss" || e.type === "boss" || e.type === "egboss" ? 2 : l.dmg); }
    for (const q of lasers) if (q.alive && q.owner === "enemy" && Math.hypot(q.x + (q.w || 0) / 2 - l.cx, (q.y + (q.h || 0) / 2 - l.cy) / 0.6) < l.r) { q.alive = false; burst(q.x, q.y, 4, ["#c8b8ff", "#ffffff"], 60, 0.25, 0, 1); }
    return;
  }
  const cx = () => l.x + l.w / 2, cy = () => l.y + l.h / 2;
  if (l.kind === "boom" && l.target) {
    if (!l.target.alive) l.target = nearestFoe(cx(), cy(), Math.sign(l.vx) || 1);
    if (l.target) { const dx = l.target.x + l.target.w / 2 - cx(), dy = l.target.y + l.target.h / 2 - cy(), d = Math.hypot(dx, dy) || 1;
      l.vx += (dx / d * 470 - l.vx) * Math.min(1, dt * 8); l.vy += (dy / d * 470 - l.vy) * Math.min(1, dt * 8); }
  }
  if (l.kind === "bubble") { l.x += l.vx * dt; l.y = l.y0 - l.h / 2 + Math.sin(l.t * 7) * 5 - l.t * 6; }
  else { l.vy += l.g * dt; l.x += l.vx * dt; l.y += l.vy * dt; }
  if (l.x < -30 || l.x > (lvl.width || VW) + 30 || l.y > VH + 20 || l.y < -60) { l.alive = false; return; }
  const solid = solidAt(cx(), cy());
  if (l.kind === "pebble" && (solid || (l.vy > 0 && solidAt(cx(), l.y + l.h)))) {
    if (l.bounces-- <= 0) { l.alive = false; burst(cx(), cy(), 5, ["#c8b8a0", "#ffffff"], 80, 0.25, 200, 1); return; }
    if (solidAt(cx(), cy())) { l.vx = -l.vx * 0.8; l.x += l.vx * dt * 2; } else { l.vy = -Math.abs(l.vy) * 0.6 - 120; }
    wsfx("lancepierre-rebond", "jump");
  } else if (l.kind === "ball" && (solid || solidAt(cx(), l.y + l.h))) { explodeBall(l); return; }
  else if (solid && l.kind !== "boom") { l.alive = false; if (l.kind === "arrow") wsfx("arc-impact", "deflect"); burst(cx(), cy(), 6, ["#ff8ab0", "#ffffff"], 90, 0.25, 0, 1); return; }
  if (l.kind === "swave" && lvl.json && !supportAt(cx(), l.y + l.h + 2)) { l.alive = false; return; }
  for (const e of enemies) {
    if (!e.alive || l.hits.has(e) || !ov(l, e)) continue;
    l.hits.add(e);
    if (l.kind === "ball") { explodeBall(l); return; }
    if (l.kind === "bubble" && e.type !== "bigboss" && e.type !== "boss" && e.type !== "egboss" && e.type !== "egcar") { e.bubT = 0.9; e.bubBy = l.p; wsfx("pistolet-bulle", "dj"); l.alive = false; return; }
    hitEnemy(e, "proj", l.p, l.dmg);
    if (l.kind === "arrow") wsfx("arc-impact", "deflect");
    if (l.kind === "boom") { burst(cx(), cy(), 12, ["#fccc28", "#ff8a3c", "#ffffff"], 120, 0.4, 0, 1); l.alive = false; return; }
    if (l.kind === "swave") continue;
    if (l.pierce > 0) { l.pierce--; continue; }
    l.alive = false; return;
  }
}
function explodeBall(l) {
  l.alive = false;
  const cx = l.x + l.w / 2, cy = l.y + l.h / 2, box = { x: cx - 30, y: cy - 30, w: 60, h: 60 };
  for (const e of enemies) if (e.alive && ov(box, e)) hitEnemy(e, "proj", l.p, e.type === "bigboss" || e.type === "boss" ? 2 : 1);
  if (lvl.json) { l.p.hitList = new Set(); campAttack(l.p, box, "atk"); }
  burst(cx, cy, 30, ["#ff4fd8", "#fccc28", "#5ef0ff", "#7dffb0", "#ffffff"], 200, 0.7, 250, 2);
  shake = Math.max(shake, 4); wsfx("canon-confettis", "boom");
}

/* ---- Dessin ---- */
// Arme tenue en main (icône de armes_icones.png réduite et tournée), d'après l'image du héros
function drawWeaponAt(W, fr, x, y, face, scale = 1, alpha = 1) {
  if (!W || W.icon < 0 || !hasAtlas("armes_icones")) return;
  const h = HAND[fr]; if (!h) return;
  const ang = POSE_ANGLE[fr] ?? (fr >= 54 && fr <= 56 ? W.aim : W.carry), s = W.len / 32 * scale, g = W.grip * 16 * s;
  const a0 = W.a0 * Math.PI / 180;
  ctx.save(); ctx.translate(Math.round(x + face * h[0] * scale), Math.round(y + h[1] * scale)); ctx.scale(face, 1); ctx.rotate(ang * Math.PI / 180 - a0);
  drawFrame("armes_icones", W.icon, Math.cos(a0) * g, Math.sin(a0) * g, 1, alpha, s);
  ctx.restore();
}
function drawHeldWeapon(p, fr, x, y, a) {
  const W = curWeapon(p); if (W.id === "sabre") return;
  if (W.id === "boomerang" && p.wCd > 0) return;   // le boomerang est parti : la main est vide
  drawWeaponAt(W, fr, x, y, p.face, 1, a);
  const [hx, hy] = handPos(p);
  if (p.wCharged) { glow(ctx, hx, hy, 8, "255,138,216", 0.5); }
  if (p.beam) {
    const b = p.beam, x1 = Math.min(b.x1, b.x2), w = Math.abs(b.x2 - b.x1);
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 40); R(x1, b.y - 3, w, 6, "#5ef0ff"); ctx.globalAlpha = 1;
    R(x1, b.y - 1, w, 2, "#ffffff");
  }
  if ((p.heat || 0) > 0.02) { const bx = p.x - 3, by = p.y - 8; R(bx, by, 16, 3, "#0e0a1a"); R(bx + 1, by + 1, Math.round(14 * p.heat), 1, p.over ? "#ff3b5c" : "#fccc28"); }
}
function drawWProj(l) {
  const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
  switch (l.kind) {
    case "arrow": { const d = Math.sign(l.vx) || 1, cy = l.y + 2; R(Math.round(cx - 6), Math.round(cy), 12, 1, "#c89a5a"); R(Math.round(cx + d * 6 - 1), Math.round(cy - 1), 3, 3, "#ff4fd8"); R(Math.round(cx - d * 6 - 1), Math.round(cy - 1), 2, 3, "#ff8ab0"); if (l.pierce > 0 || l.dmg > 1) glow(ctx, cx, cy, 8, "255,138,216", 0.3); break; }
    case "boom": ctx.save(); ctx.translate(cx, cy); ctx.rotate(l.t * 25); if (hasAtlas("armes_icones")) drawFrame("armes_icones", 5, 0, 0, 1, 1, 0.35); else R(-4, -4, 8, 8, "#ff8a3c"); ctx.restore(); break;
    case "bubble": ctx.globalAlpha = 0.5; ctx.strokeStyle = "#bff4ff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; R(Math.round(cx - 2), Math.round(cy - 3), 2, 2, "#ffffff"); break;
    case "ball": ctx.fillStyle = "#ff4fd8"; ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill(); R(Math.round(cx - 1), Math.round(cy - 3), 2, 2, "#fccc28"); R(Math.round(cx + 1), Math.round(cy), 2, 2, "#5ef0ff"); break;
    case "dino": {   // dinosaure magique : il file en brillant, puis s'efface
      const a = Math.min(1, (l.life - l.t) / 0.15), f = l.face || Math.sign(l.vx) || 1;
      glow(ctx, cx, cy, 22, "94,255,200", 0.35 * a);
      if (hasAtlas("magie_dino")) drawFrame("magie_dino", 0, Math.round(cx), Math.round(cy + Math.sin(l.t * 30) * 1), f, a * (0.85 + 0.15 * Math.sin(l.t * 40)), 0.8);
      else R(Math.round(l.x), Math.round(l.y), l.w, l.h, "#5effc8");
      if (Math.random() < 0.5) parts.push({ x: cx - f * 14, y: cy + (Math.random() - 0.5) * 16, vx: -f * 40, vy: -10, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? "#5effc8" : "#5ef0ff", size: 1, grav: 0 });
      break;
    }
    case "coeur": {   // cœur magique : départ, vol (4 images), dispersion à la fin
      const f = l.face || Math.sign(l.vx) || 1, left = l.life - l.t;
      glow(ctx, cx, cy, 16, "255,138,216", 0.35);
      if (hasAtlas("magie_coeur")) { const A = ATL.magie_coeur.anims; drawFrame("magie_coeur", left < 0.12 ? A.fin[0] : l.t < 0.06 ? A.depart[0] : A.vol[0] + Math.floor(l.t * 14) % A.vol[1], Math.round(cx - f * 8), Math.round(cy), f); }
      else R(Math.round(l.x), Math.round(l.y), l.w, l.h, "#ff8ad8");
      break;
    }
    case "aboi": {   // vagues de son : trois anneaux qui s'écartent et s'effacent
      const k = l.t / l.life;
      for (let i = 0; i < 3; i++) { const r = l.r - i * 14; if (r <= 4) continue; ctx.globalAlpha = Math.max(0, (1 - k) * (0.8 - i * 0.22)); ctx.strokeStyle = i ? "#c8b8ff" : "#ffffff"; ctx.lineWidth = 3 - i; ctx.beginPath(); ctx.ellipse(l.cx, l.cy, r, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1; break;
    }
    case "pebble": R(Math.round(l.x), Math.round(l.y), 6, 6, "#8a7a6a"); R(Math.round(l.x), Math.round(l.y), 2, 2, "#c8b8a0"); break;
    case "swave": ctx.globalAlpha = 0.7 * (1 - l.t / l.life); for (let i = 0; i < l.w; i += 2) R(Math.round(l.x + i), Math.round(l.y + l.h - 2 - Math.abs(Math.sin(time * 30 + i)) * 8), 2, 3, i % 4 ? "#fccc28" : "#ffffff"); ctx.globalAlpha = 1; break;
  }
}
// Ennemis enfermés dans une bulle
function drawBubbled() {
  for (const e of enemies) if (e.alive && e.bubT > 0) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2, r = Math.max(e.w, e.h) / 2 + 4;
    ctx.globalAlpha = 0.25; ctx.fillStyle = "#bff4ff"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.8; ctx.strokeStyle = "#ff8ad8"; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; R(Math.round(cx - r / 2), Math.round(cy - r / 2), 2, 2, "#ffffff");
  }
}

/* ---- Râtelier (écran de choix de l'arme) ---- */
const ARM = { sel: 0 };
function openArmory() { state = "armory"; ARM.sel = Math.max(0, WEAPONS.findIndex(w => w.id === curWeapon(players[0] || { C: ch() }).id)); wsfx("arme-equipe", "locker"); }
const armRect = i => ({ x: 232, y: 26 + i * 18, w: 240, h: 16 });
function armPick(i) {
  const W = WEAPONS[i], C = ch();
  if (W.id !== "sabre" && !SAVE.weapons.owned[W.id]) { audio.sfx("nope"); return; }
  if (W.id !== "sabre" && !canWield(C)) { audio.sfx("nope"); return; }
  SAVE.weapons.eq[C.id] = W.id; saveGame(); wsfx("arme-equipe", "equip");
}
SCREENS.armory = {
  update() {
    if (uiBack()) { backToHub(); return; }
    if (hit(...K.up)) { ARM.sel = (ARM.sel + WEAPONS.length - 1) % WEAPONS.length; audio.sfx("select"); }
    if (hit(...K.down)) { ARM.sel = (ARM.sel + 1) % WEAPONS.length; audio.sfx("select"); }
    if (hit(...K.ok)) { armPick(ARM.sel); return; }
    if (hit("Mouse0")) for (let i = 0; i < WEAPONS.length; i++) if (inside(armRect(i))) { ARM.sel = i; armPick(i); }
  },
  draw() {
    drawHub(); R(0, 0, VW, VH, "rgba(10,6,24,0.86)"); drawBack();
    const C = ch(), W = WEAPONS[ARM.sel], own = W.id === "sabre" || !!SAVE.weapons.owned[W.id], cur = SAVE.weapons.eq[C.id] || "sabre";
    drawPanel(8, 26, 216, 228, C.ui);
    text("Râtelier d'armes", 116, 36, 10, "#ffb43c", "center", "#ffb43c");
    // aperçu : le héros avec l'arme survolée (repos puis geste)
    R(30, 150, 172, 2, hexA(C.ui, 0.5));
    const wield = canWield(C), A = ATL[charAtlas(C)];
    if (W.id === "sabre" || !wield || !own) drawCharCos(C, Math.floor(time * 5) % 4, 116, 148, 1, 2.2);
    else {
      const pose = { arc: "shoot", pistolet: "shoot", canon: "shoot", laser: "shoot", lancepierre: "shoot", lance: "shoot", boomerang: "throw", nunchaku: "throw", espadon: "heavy", maillet: "heavy" }[W.id];
      const cyc = time % 2.4, fr = cyc < 1.4 ? A.anims.idle_free[0] + Math.floor(time * 5) % 4 : A.anims[pose][0] + Math.min(A.anims[pose][1] - 1, Math.floor((cyc - 1.4) / 0.25));
      drawCharCos(C, fr, 116, 148, 1, 2.2); drawWeaponAt(W, fr, 116, 148, 1, 2.2);
    }
    text(W.name, 116, 162, 11, own ? "#ffffff" : "#8a7aa8", "center");
    let y = 178;
    for (const l of wrapText(own ? W.desc : "Bats un boss : une nouvelle arme apparaît au hasard !", 200, 7)) { text(l, 16, y, 7, own ? "#e8dcff" : "#b9a6e0"); y += 10; }
    ["Portée", "Vitesse", "Force"].forEach((n, i) => { const yy = 222 + i * 10; text(n, 16, yy, 7, "#b9a6e0"); for (let k = 0; k < 3; k++) R(64 + k * 14, yy - 3, 11, 6, k < W.stats[i] ? "#ffb43c" : "#3a2a5c"); });
    if (!wield) text("Ce héros garde son sabre pour l'instant.", 116, 250, 6, "#ff8ab0", "center");
    WEAPONS.forEach((w, i) => {
      const r = armRect(i), sel = i === ARM.sel, ow = w.id === "sabre" || !!SAVE.weapons.owned[w.id], on = w.id === cur;
      R(r.x, r.y, r.w, r.h, sel ? "rgba(255,255,255,0.16)" : "rgba(20,12,40,0.85)");
      if (sel) { ctx.strokeStyle = C.ui; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
      text(on ? "●" : "○", r.x + 8, r.y + 8, 7, on ? "#7dffb0" : "#5a4a80", "center");
      if (w.icon >= 0 && hasAtlas("armes_icones")) drawFrame("armes_icones", w.icon, r.x + 24, r.y + 8, 1, ow ? 1 : 0.25, 0.42);
      else if (w.icon < 0) { R(r.x + 18, r.y + 7, 12, 2, C.color); R(r.x + 16, r.y + 7, 3, 2, "#e8dcff"); }
      text(ow ? w.name : "???", r.x + 36, r.y + 8, 7, ow ? "#ffffff" : "#6a5a88");
      if (!ow) text("🔒 après un boss", r.x + r.w - 6, r.y + 8, 6, "#8a7aa8", "right");
    });
  },
};
