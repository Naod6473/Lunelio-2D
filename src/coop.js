/* ---------------- Coop à deux sur le même écran ---------------- */
// COOP (template.html) : on, ci (héros du joueur 2), dev ("pad" : deuxième manette ; "kb" : flèches et touches de droite), pad.
// Le joueur 2 rejoint sur l'écran du choix du héros : Start sur une autre manette, ou la touche 2 du clavier.
// Ses commandes (K2) produisent les mêmes actions que celles du joueur 1 ; les menus restent au joueur 1.
// Un héros sans cœur devient une bulle qui suit son copain : en la touchant, le copain le ramène avec 1 cœur.
// La salle ne recommence que si les deux sont tombés (en Doom : dès qu'un héros tombe, voir roomLost()).
const COOP_COL = ["#ffb43c", "#c86eff"];   // J1 soleil, J2 lune : flèche au-dessus des têtes et cœurs du joueur 2
const PAD2_KEYS = ["HLeft", "HRight", "HUp", "HDown", "HJump", "HAtk", "HSpec", "HPower", "HStart"];
const coopPrev = {};
function coopPads(list) {
  for (const g of list) {
    if (!g || !g.connected) continue;
    const st = padBtn(g, 9), sel = padBtn(g, 8), was = coopPrev[g.index] || {};
    coopPrev[g.index] = { st, sel };
    if (state !== "chars" && state !== "vssetup") continue;
    // Start sur une manette qui n'est pas celle du joueur 1 (ou sur la seule manette quand le joueur 1 joue au clavier)
    if (!COOP.on && st && !was.st && (g.index !== padIdx || !PAD)) { if (g.index === padIdx) padIdx = null; coopJoin("pad", g.index); }
    else if (COOP.on && COOP.dev === "pad" && g.index === COOP.pad && sel && !was.sel) coopLeave();
  }
  const s = {}, g = COOP.on && COOP.dev === "pad" ? list[COOP.pad] : null;
  if (g && g.connected) {
    const ax = g.axes[0] || 0, ay = g.axes[1] || 0, vert = Math.abs(ay) > Math.abs(ax), any = l => l.some(i => padBtn(g, i));
    s.HLeft = padBtn(g, 14) || ax < -0.45; s.HRight = padBtn(g, 15) || ax > 0.45;
    s.HUp = padBtn(g, 12) || (ay < -0.6 && vert); s.HDown = padBtn(g, 13) || (ay > 0.6 && vert);
    s.HJump = any(OPT.pad.jump); s.HAtk = any(OPT.pad.attack); s.HSpec = any(OPT.pad.special); s.HPower = any(OPT.pad.power); s.HStart = padBtn(g, 9);
  }
  for (const k of PAD2_KEYS) vkey(k, !!s[k]);
}
addEventListener("gamepaddisconnected", e => { if (COOP.on && COOP.dev === "pad" && e.gamepad.index === COOP.pad && state === "play") pauseGame(); });
function coopJoin(dev, pad = null) {
  Object.assign(COOP, { on: true, dev, pad, ci: charSel === 1 ? 0 : 1 });
  rebuildK(); audio.sfx("start"); voice.say("Joueur 2 arrive !", true);
}
function coopLeave() { Object.assign(COOP, { on: false, dev: null, pad: null }); rebuildK(); audio.sfx("back"); }

// Joueurs d'une salle : le joueur 1, et le joueur 2 en coop (solo : programmes de lavage, course du Dahaka)
function makePlayers(solo) {
  const list = [makePlayer(ch(), K, 0)];
  if (COOP.on && !solo) list.push(makePlayer(CHARS[COOP.ci], K2, 1));
  return list;
}

/* ---- Bulles de secours ---- */
function coopBubble(p) {
  p.bubble = { t: 0, x: p.x + 5, y: Math.min(p.y + 12, VH - 40) };
  audio.sfx("dj"); msg = { text: "Touche la bulle pour sauver ton copain !", t: 2.5 };
  voice.say("Touche la bulle pour sauver ton copain !", true);
}
// quiet : changement de salle ou de plan (le héros revient sans bruit, avec tous ses cœurs)
function coopRevive(p, quiet) {
  const b = p.bubble; p.dead = false; p.bubble = null; p.inv = 2; p.vx = 0;
  if (quiet) { p.hp = df().hp; return; }
  p.hp = 1; p.x = b.x - 5; p.y = b.y - 16; p.vy = -180;
  audio.sfx("heal"); burst(b.x, b.y, 24, ["#bff4ff", "#ffffff", p.C.color], 160, 0.6, 100, 2); rumble(200, 0.4, 0.4);
  msg = { text: "Sauvé !", t: 1.6 }; voice.say("Sauvé !", true);
  emit("rescue", {});
}
function updateBubbles(dt) {
  if (players.length < 2) return;
  for (const p of players) {
    const b = p.bubble; if (!p.dead || !b) continue;
    b.t += dt;
    const q = players.find(o => o !== p && !o.dead && !o.hidden); if (!q) continue;
    // la bulle flotte à distance derrière le copain (devant lui s'il est contre un mur), en se balançant
    const W = lvl.width || VW, side = q.x + 5 - q.face * 44 < 14 || q.x + 5 - q.face * 44 > W - 14 ? 1 : -1;
    const tx = q.x + 5 + side * q.face * 44, ty = q.y - 4 + Math.sin(b.t * 3) * 4, dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
    const sp = Math.min(d, 60 * dt * (d > 120 ? 2 : 1));
    b.x = clamp(b.x + dx / d * sp, 12, W - 12); b.y = clamp(b.y + dy / d * sp, 26, VH - 30);
    // il faut aller la toucher exprès (en courant ou en sautant)
    const moving = Math.abs(q.vx) > 30 || !q.onGround;
    if (b.t > 0.8 && moving && Math.abs(q.x + 5 - b.x) < 16 && Math.abs(q.y + 16 - b.y) < 24) coopRevive(p);
  }
}
function drawBubbles() {
  for (const p of players) {
    const b = p.bubble; if (!p.dead || !b) continue;
    const x = Math.round(b.x), y = Math.round(b.y), r = 12 + Math.sin(time * 4) * 0.8;
    ctx.fillStyle = "rgba(190,240,255,0.18)"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    drawChar(p.C, Math.floor(time * 5) % 4, x, y + 9, 1, 0.55, 0.85);
    ctx.strokeStyle = "rgba(220,250,255,0.85)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    R(x - 6, y - 8, 2, 2, "#ffffff"); R(x - 8, y - 5, 1, 2, "#ffffff");
    if (Math.floor(time * 3) % 2) text("!", x, y - r - 5, 8, COOP_COL[p.idx], "center");
  }
}
// Flèche de couleur au-dessus de chaque héros (seulement à deux)
function drawCoopTags() {
  if (players.length < 2) return;
  for (const p of players) {
    if (p.dead || p.hidden || (p.fade ?? 1) < 0.5) continue;
    const x = Math.round(p.x + 5), y = Math.round(p.y) - 10 + Math.round(Math.sin(time * 4 + p.idx) * 1.5), c = COOP_COL[p.idx];
    R(x - 3, y, 7, 1, c); R(x - 2, y + 1, 5, 1, c); R(x - 1, y + 2, 3, 1, c); R(x, y + 3, 1, 1, c);
    text(String(p.idx + 1), x + 1, y - 5, 7, c, "center");
  }
}
// Cœurs et jauge du joueur 2, sous la barre du haut à droite
function drawCoopHud() {
  if (players.length < 2) return;
  const q = players[1], d = df(), pw = powerOf(q.C), right = VW - (TOUCH && !PAD ? 52 : 8), w = d.hp * 10;
  R(right - w - 18, 17, w + 18 + (VW - right), 15, "rgba(10,6,24,0.6)");
  for (let i = 0; i < d.hp; i++) drawHeartIcon(right - w + i * 10 + 4, 23, !q.dead && i < q.hp);
  if (pw && d.power) { R(right - w, 29, w - 2, 2, "#2a1a44"); R(right - w, 29, Math.round((w - 2) * q.gauge), 2, q.powerOn ? "#ffffff" : pw.color); }
  text("J2", right - w - 4, 24, 8, COOP_COL[1], "right");
}
/* ---- Laverie : caméra au milieu des deux héros, le copain reste dans l'écran ---- */
function coopCamX() {
  const vis = players.filter(p => !p.hidden);
  if (!vis.length) return players[0] ? players[0].x + 5 : VW / 2;
  return vis.reduce((a, p) => a + p.x + 5, 0) / vis.length;
}
function coopKeepNear(q, H) {
  if (q.hidden) return;
  const lo = Math.max(4, hub.cam + 4), hi = Math.min(H.w - 14, hub.cam + VW - 14);
  if (q.x < lo) { q.x = lo; q.vx = Math.max(0, q.vx); } else if (q.x > hi) { q.x = hi; q.vx = Math.min(0, q.vx); }
}

/* ---- Écran du choix du héros : le joueur 2 rejoint et choisit son héros ---- */
const COOP_BOX = CHARS.length > 10 ? { x: 12, y: 172, w: 222, h: 38 } : { x: 12, y: 166, w: 222, h: 42 };
function coopCharsUpdate() {
  if (hit("Digit2")) { if (!COOP.on) coopJoin("kb"); else if (COOP.dev === "kb") coopLeave(); return; }
  if (!COOP.on) return;
  const n = CHARS.length, mv = i => { do COOP.ci = (COOP.ci + i + n) % n; while (charLocked(CHARS[COOP.ci])); audio.sfx("select"); };   // pas les héros secrets pas encore trouvés
  if (hit(...K2.left)) mv(-1);
  if (hit(...K2.right)) mv(1);
  // haut / bas : le nom du joueur 2 (un profil, ou « Invité »), pour les records à deux
  const names = coopNames(), cur = Math.max(0, names.indexOf(COOP.nom || "Invité")), dn = hit(...K2.drop) ? 1 : hit(...(K2.act || [])) ? -1 : 0;
  if (dn) { const nm = names[(cur + dn + names.length) % names.length]; COOP.nom = nm === "Invité" ? null : nm; audio.sfx("select"); }
}
function coopCharsDraw() {
  const r = COOP_BOX;
  if (COOP.on) {   // carte choisie par le joueur 2 : cadre violet en pointillés
    const c = CUI.cards[COOP.ci];
    ctx.strokeStyle = COOP_COL[1]; ctx.lineWidth = 1; ctx.setLineDash([3, 2]); ctx.strokeRect(c.x + 2.5, c.y + 2.5, c.w - 5, c.h - 5); ctx.setLineDash([]);
    text("J2", c.x + 8, c.y + 8, 7, COOP_COL[1], "center");
  }
  R(r.x, r.y, r.w, r.h, "rgba(14,8,30,0.85)"); ctx.strokeStyle = COOP.on ? COOP_COL[1] : "#3a2a5c"; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  if (!COOP.on) {
    text("Jouer à deux ?", r.x + r.w / 2, r.y + 10, 9, COOP_COL[1], "center");
    text(`Joueur 2 : Start sur une manette, ou la touche ${keyName("Digit2")}`, r.x + r.w / 2, r.y + 24, 7, "#e8dcff", "center");
    text("(clavier : flèches, " + [K2_KB.attack[0], K2_KB.special[0], K2_KB.power[0]].map(keyName).join(" ") + ")", r.x + r.w / 2, r.y + 34, 7, "#b9a6e0", "center");
    return;
  }
  const C2 = CHARS[COOP.ci];
  drawChar(C2, Math.floor(time * 5) % 4, r.x + 20, r.y + r.h - 4, 1, 0.8);
  text(`Joueur 2 : ${C2.name}`, r.x + 38, r.y + 11, 9, C2.ui);
  text(`${COOP.nom || "Invité"} ▲▼`, r.x + r.w - 6, r.y + 11, 7, "#fccc28", "right");
  text(COOP.dev === "pad" ? "◀ ▶ héros, ▲ ▼ nom, Select pour partir" : `◀ ▶ héros, ▲ ▼ nom, ${keyName("Digit2")} pour partir`, r.x + 38, r.y + 24, 7, "#e8dcff");
  text(COOP.dev === "pad" ? "Manette 2" : "Clavier : flèches, " + [K2_KB.attack[0], K2_KB.special[0], K2_KB.power[0]].map(keyName).join(" "), r.x + 38, r.y + 34, 7, "#b9a6e0");
}
