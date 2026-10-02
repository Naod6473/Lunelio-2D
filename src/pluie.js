/* ---------------- La pluie de chaussettes (mode secret) ---------------- */
// Secret : taper 10 fois de suite le tas de chaussettes de la laverie (au sabre ou avec n'importe quelle arme) pose
// SAVE.flags.pluie et ajoute la carte « Pluie de chaussettes » à l'écran des mondes (PLUIE_CARD).
// Une salle normale de la campagne tirée au hasard, vidée de ses ennemis, pièges, portes et objets ; des chaussettes
// tombent du ciel (couleurs au hasard, dorée = 3, puante = le héros éternue, cœur = +1 cœur), de plus en plus vite ;
// de temps en temps un ennemi du monde tombe aussi (annoncé par « ! »). Objectif : 50 chaussettes (à deux : 50 ensemble,
// ou 25 chacun en compétition). Les trous ne coûtent pas de cœur. Record : temps pour 50, par difficulté, seul ou ensemble
// (SAVE.pluie.best["diff|1"] ou ["diff|2"]). Première réussite : badge et couleurs « Pluie » (emit("pluie")).
let pluie = null;
const PLUIE_GOAL = 50, PLUIE_DUEL = 25;
const PLUIE_COLORS = [   // teinte des chaussettes (seules les parties rouges changent : la fumée reste verte)
  { id: "rouge", h: 0 }, { id: "bleue", h: 212 }, { id: "violette", h: 276 }, { id: "orange", h: 28 },
  { id: "rose", h: 322 }, { id: "turquoise", h: 178 }, { id: "jaune", h: 52 },
];
const PUANTE = { id: "puante", h: 70, s: 0.55, l: -0.12 };
const pluieOpen = () => !!SAVE.flags.pluie;
const pluieKey = () => `${df().id}|${COOP.on && pluie && pluie.mode === "ensemble" ? 2 : 1}`;
const pluieBest = (k = pluieKey()) => (SAVE.pluie.best || {})[k];

/* ---- Le secret de la laverie ---- */
const TAS = { hits: 0, t: 0, shake: 0 };
function pluieTasUpdate(rdt, p) {
  TAS.shake = Math.max(0, TAS.shake - rdt); TAS.t += rdt;
  if (TAS.t > 4) TAS.hits = 0;   // dix coups de suite, sans trop attendre entre deux
  if (hub.room !== "chaussettes" || socksCount() < 1 || !hit(...p.input.attack) || Math.abs(p.x + 5 - 340) > 64 || !p.onGround) return;
  TAS.hits++; TAS.t = 0; TAS.shake = 0.3; audio.sfx(TAS.hits % 3 ? "sock" : "slip");
  burst(340 + (Math.random() - 0.5) * 60, hubRoom().floor - 30, 6, ["#ff4f8a", "#7dffb0", "#ffffff"], 120, 0.5, 300, 2);
  if (TAS.hits >= 10 && !SAVE.flags.pluie) {
    SAVE.flags.pluie = 1; saveGame(); TAS.hits = 0; shake = 6;
    for (let k = 0; k < 40; k++) parts.push({ x: 340 + (Math.random() - 0.5) * 120, y: -10 - Math.random() * 60, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 80, life: 2.5, max: 2.5, color: ["#ff4f8a", "#5ef0ff", "#c86eff", "#ffd23c"][k % 4], size: 2, grav: 40 });
    startDialog([["bulle", "Oh ! Il pleut des chaussettes !"], ["bulle", "Va voir la machine : une nouvelle carte t'attend. Attrape-les toutes !"]]);
    toast("Secret trouvé !", "La pluie de chaussettes", "badge", "#ffd23c");
  }
}

/* ---- Départ ---- */
function startPluie(mode) {
  if (COOP.on && !mode) { state = "pluiechoix"; PLC.sel = 0; audio.sfx("select"); return; }
  // une salle normale au hasard (pas une arène de boss), qui a au moins un ennemi à imiter
  const cand = [];
  CWORLDS.forEach((W, wi) => W.rooms.forEach((R0, ri) => { if (ri < W.rooms.length - 1) cand.push([wi, ri]); }));
  const [wi, ri] = cand[Math.floor(Math.random() * cand.length)];
  pluie = { mode: mode || "solo", wi, ri, n: [0, 0], socks: [], warns: [], next: 1.2, foeT: 9 + Math.random() * 4, combo: 0, comboT: 0, sayT: 0, res: null, tpl: null };
  curWorld = wi; runTime = 0; deaths = 0; msg = null; spokenRoom = -1; audio.sfx("start");
  loadCampRoom(wi, ri, { fadeIn: true });
}
// Appelé par loadCampRoom : la salle est vidée (le décor et les plateformes restent)
function pluieSetup() {
  const P = pluie;
  P.tpl = lvl.foeSpawns[0] || null;
  if (!P.tpl) for (let r = 0; r < CWORLDS[P.wi].rooms.length - 1 && !P.tpl; r++) P.tpl = buildRoom(P.wi, r).foeSpawns[0] || null;
  enemies = [];
  lvl.hazards = lvl.hazards.filter(h => h.kind === "pit");   // les trous restent (le sol n'y est pas)
  Object.assign(lvl, { items: [], exits: [], sock: null, gold: [], qitems: [], covers: [], ckpt: null, machine: null });
  Object.assign(P, { n: [0, 0], socks: [], warns: [], next: 1.2, foeT: 9 + Math.random() * 4, combo: 0, comboT: 0, res: null });
  runTime = 0;
  msg = { text: P.mode === "duel" ? `Le premier à ${PLUIE_DUEL} chaussettes gagne !` : `Attrape ${PLUIE_GOAL} chaussettes !`, t: 2.6 };
  voice.say(msg.text, true);
}
const pluieTotal = () => pluie.n[0] + pluie.n[1];
const pluieGoalReached = () => pluie.mode === "duel" ? Math.max(...pluie.n) >= PLUIE_DUEL : pluieTotal() >= PLUIE_GOAL;

/* ---- En jeu (appelé par updatePlay) ---- */
function pluieUpdate(dt) {
  const P = pluie; if (!P || P.res) return;
  const d = df(), prog = Math.min(1, (P.mode === "duel" ? Math.max(...P.n) / PLUIE_DUEL : pluieTotal() / PLUIE_GOAL));
  // de plus en plus de chaussettes, de plus en plus vite
  P.next -= dt;
  if (P.next <= 0) {
    P.next = (1.05 - 0.55 * prog) * (d.id === "facile" ? 1.15 : d.id === "doom" ? 0.85 : 1) * (players.length > 1 ? 0.75 : 1);
    const r = Math.random(), hurt = players.some(p => !p.dead && p.hp < d.hp);
    const kind = r < 0.06 ? "gold" : r < 0.14 ? "puante" : r < 0.17 && hurt && d.id !== "doom" ? "coeur" : "normal";
    const col = kind === "puante" ? PUANTE : PLUIE_COLORS[Math.floor(Math.random() * PLUIE_COLORS.length)];
    P.socks.push({ x: 16 + Math.random() * (VW - 32), y: -12, vy: (34 + 40 * prog) * (d.id === "facile" ? 0.85 : 1), ph: Math.random() * 6, kind, col, land: 0, t: 0, alive: true });
  }
  for (const s of P.socks) {
    if (!s.alive) continue;
    s.t += dt;
    if (!s.land) {
      s.y += s.vy * dt; s.x += Math.sin(s.t * 2.2 + s.ph) * 18 * dt;
      if (s.y > VH + 10) s.alive = false;
      else if (s.y > 20 && supportAt(s.x, s.y + 6)) { s.land = 3; s.y = Math.floor(s.y); }   // posée : elle reste 3 secondes
    } else if ((s.land -= dt) <= 0) { s.alive = false; burst(s.x, s.y, 5, ["#d8d0e8", "#ffffff"], 40, 0.3, 0, 1); }
    for (const p of players) {
      if (!s.alive || p.dead || p.hidden || !ov(p, { x: s.x - 7, y: s.y - 7, w: 14, h: 14 })) continue;
      pluieCatch(p, s); break;
    }
  }
  P.socks = P.socks.filter(s => s.alive);
  // combo : cinq chaussettes attrapées à moins d'une seconde d'écart
  if (P.comboT > 0 && (P.comboT -= dt) <= 0) P.combo = 0;
  // de temps en temps, un ennemi tombe du ciel (annoncé une seconde avant)
  P.foeT -= dt;
  const maxFoes = d.id === "facile" ? 1 : d.id === "doom" ? 3 : 2;
  if (P.foeT <= 0 && P.tpl) {
    P.foeT = (d.id === "facile" ? 13 : 9) + Math.random() * 5 - prog * 3;
    if (enemies.filter(e => e.alive).length < maxFoes) { const x = 40 + Math.random() * (VW - 80); P.warns.push({ x, t: 1 }); audio.sfx("aim"); }
  }
  for (const w of P.warns) if ((w.t -= dt) <= 0) {
    const T = P.tpl, [, , fw, fh] = T.r, F = FOES[T.asset === "enemy" ? CWORLDS[P.wi].enemy : T.asset] || FOES[CWORLDS[P.wi].enemy];
    const y = F && F.ground ? -fh : 40;
    const e = makeFoe({ ...T, r: [w.x - fw / 2, y, fw, fh], patrolBounds: { x: w.x - 90, width: 180 + fw }, activation: { ...(T.activation || {}), delaySeconds: 0.8 } }, CWORLDS[P.wi]);
    e.var = foeVariant("pluie:" + Math.random()); enemies.push(e);
  }
  P.warns = P.warns.filter(w => w.t > 0);
  if (pluieGoalReached()) pluieWin();
}
function pluieCatch(p, s) {
  const P = pluie;
  s.alive = false;
  const v = s.kind === "gold" ? 3 : 1;
  if (P.mode === "duel") P.n[p.idx] += v; else P.n[0] += v;
  P.combo++; P.comboT = 1;
  if (s.kind === "gold") { audio.sfx("sock_bonus"); burst(s.x, s.y, 16, ["#ffd23c", "#ffffff"], 120, 0.5, 0, 1); addFx("fx_collecte", s.x, s.y); }
  else audio.sfx("sock");
  if (s.kind === "coeur" && p.hp < df().hp) { p.hp++; audio.sfx("heal"); burst(p.x + 5, p.y + 10, 12, ["#ff4f8a", "#ffffff"], 100, 0.5, 0, 1); }
  if (s.kind === "puante") {   // atchoum ! le héros s'arrête une demi-seconde
    p.sneeze = 0.5; p.vx = 0; audio.sfx("nope");
    for (let k = 0; k < 10; k++) parts.push({ x: p.x + 5, y: p.y + 6, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 30, life: 0.8, max: 0.8, color: "#9ac860", size: 2, grav: -10 });
    pluieSay(p, "Atchoum !");
  } else burst(s.x, s.y, 6, [hslCol(s.col), "#ffffff"], 80, 0.35, 0, 1);
  if (P.combo === 5) { pluieSay(p, "Combo !"); audio.sfx("milestone"); burst(p.x + 5, p.y, 22, ["#ffd23c", "#5ef0ff", "#ff4f8a", "#ffffff"], 160, 0.6, 0, 2); }
}
function pluieSay(p, t) { (pluie.says = pluie.says || []).push({ x: p.x + 5, y: p.y - 6, t: 1, text: t }); }
const hslCol = c => `hsl(${(c.h + 360) % 360},${c.id === "puante" ? 40 : 75}%,${c.id === "puante" ? 38 : 55}%)`;
// Le héros qui éternue ne bouge plus (appelé par updatePlayer)
function pluieSneeze(p, dt) { if (!p.sneeze) return false; p.sneeze = Math.max(0, p.sneeze - dt); p.vx = 0; return p.sneeze > 0; }

/* ---- Fin ---- */
function pluieWin() {
  const P = pluie, solo = P.mode !== "duel";
  const k = pluieKey(), prev = pluieBest(k), rec = solo && (prev === undefined || runTime < prev);
  if (rec) SAVE.pluie.best[k] = runTime;
  const first = !SAVE.flags.pluieDone;
  emit("pluie", { time: runTime });
  P.res = { ok: true, time: runTime, rec, prev, first, t: 0, sel: 0 };
  setTimeFx(false, false); enemies = []; lasers = []; saveGame();
  for (let k2 = 0; k2 < 70; k2++) P.socks.push({ x: Math.random() * VW, y: -10 - Math.random() * 120, vy: 80 + Math.random() * 60, ph: Math.random() * 6, kind: "normal", col: PLUIE_COLORS[k2 % PLUIE_COLORS.length], land: 0, t: 0, alive: true, deco: true });
  audio.sfx("chal_ok"); voice.say(P.mode === "duel" ? `${pluieName(P.n[0] >= P.n[1] ? 0 : 1)} gagne !` : "Bravo ! Toutes les chaussettes !", true);
  state = "pluieres";
}
function pluieLost() {
  const P = pluie; P.res = { ok: false, time: runTime, t: 0, sel: 0 };
  setTimeFx(false, false); audio.sfx("chal_fail"); voice.say("Presque ! On réessaie ?", true);
  state = "pluieres";
}
const pluieName = i => i === 0 ? (curProfil() ? curProfil().nom : "Joueur 1") : (COOP.nom || "Joueur 2");
function pluieQuit() { pluie = null; enterHub({ room: "chaussettes", x: 200 }); }

/* ---- Dessin ---- */
const sockTintCache = {};
// Image de la planche des chaussettes recolorée : seules les parties rouges prennent la couleur (la fumée reste verte)
function sockSheet(c) {
  const img = atlasImg("chaussette"); if (!img) return null;
  const key = c.id; if (sockTintCache[key]) return sockTintCache[key];
  let out = img;
  try {
    const [cv2, x] = mkCanvas(img.width, img.height); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] < 8) continue;
      const r = a[i] / 255, g = a[i + 1] / 255, b = a[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn;
      if (dd < 0.12 || mx !== r || g > r * 0.75) continue;   // rouges seulement
      let l = (mx + mn) / 2, s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
      s = Math.min(1, s * (c.s || 1)); l = Math.min(1, Math.max(0, l + (c.l || 0)));
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p2 = 2 * l - q, hk = ((c.h + 360) % 360) / 360;
      const t2 = t => { t = (t + 1) % 1; return t < 1 / 6 ? p2 + (q - p2) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p2 + (q - p2) * (2 / 3 - t) * 6 : p2; };
      a[i] = t2(hk + 1 / 3) * 255; a[i + 1] = t2(hk) * 255; a[i + 2] = t2(hk - 1 / 3) * 255;
    }
    x.putImageData(d, 0, 0); out = cv2;
  } catch (e) {}
  return sockTintCache[key] = out;
}
function drawRainSock(s) {
  const blink = s.land && s.land < 1 && Math.floor(time * 10) % 2;
  if (blink) return;
  const y = s.y + (s.land ? 0 : Math.sin(s.t * 6 + s.ph) * 1);
  if (s.kind === "gold") { glow(ctx, s.x, y, 12, "255,210,60", 0.4); drawSock(s.x, y, { gold: true, t: s.ph }); return; }
  const A = ATL.chaussette, img = A && sockSheet(s.col);
  if (img) {
    const fr = animFrame("chaussette", "flotte", time + s.ph, 8), sc = 0.9;
    ctx.drawImage(img, (fr % A.cols) * A.cw, Math.floor(fr / A.cols) * A.ch, A.cw, A.ch, Math.round(s.x - A.ax * sc), Math.round(y - A.ay * sc), A.cw * sc, A.ch * sc);
  } else drawSock(s.x, y, { t: s.ph });
  if (s.kind === "puante") for (let i = 0; i < 3; i++) { const k = (time * 1.2 + i / 3 + s.ph) % 1; ctx.globalAlpha = (1 - k) * 0.8; R(Math.round(s.x - 6 + i * 6 + Math.sin(time * 5 + i) * 2), Math.round(y - 10 - k * 14), 2, 2, "#9ac860"); ctx.globalAlpha = 1; }
  if (s.kind === "coeur") drawHeartIcon(s.x + 7, y - 9, true);
}
// Appelé par drawCampWorld (avant les héros)
function drawPluie() {
  const P = pluie; if (!P) return;
  for (const w of P.warns) { if (Math.floor(time * 8) % 2) text("!", w.x, 30, 14, "#ff4f8a", "center", "#ff4f8a"); R(Math.round(w.x) - 1, 40, 2, 10, "rgba(255,79,138,0.4)"); }
  for (const s of P.socks) drawRainSock(s);
  for (const b of P.says || []) { ctx.globalAlpha = Math.min(1, b.t * 2); text(b.text, b.x, b.y - (1 - b.t) * 12, 8, b.text === "Combo !" ? "#ffd23c" : "#9ac860", "center", "#0e0a1a"); ctx.globalAlpha = 1; }
}
function updatePluieFx(dt) {
  const P = pluie; if (!P) return;
  for (const b of P.says || []) b.t -= dt;
  if (P.says) P.says = P.says.filter(b => b.t > 0);
}
// Bandeau du haut (drawCampHUD)
function pluieTag() {
  const P = pluie;
  return P.mode === "duel" ? `${pluieName(0)} ${P.n[0]} · ${pluieName(1)} ${P.n[1]} / ${PLUIE_DUEL}` : `Pluie de chaussettes  ${Math.min(pluieTotal(), PLUIE_GOAL)}/${PLUIE_GOAL}`;
}
// Carte de l'écran des mondes : des chaussettes de toutes les couleurs qui tombent sur la centrale
function drawPluieCard(r, tw, th) {
  const im = getImg(CWORLDS[0].rooms[1].bg);
  if (im.ok) ctx.drawImage(im.img, r.x + 4, r.y + 4, tw, th); else R(r.x + 4, r.y + 4, tw, th, "#1a1030");
  R(r.x + 4, r.y + 4, tw, th, "rgba(10,6,24,0.35)");
  ctx.save(); ctx.beginPath(); ctx.rect(r.x + 4, r.y + 4, tw, th); ctx.clip();
  for (let k = 0; k < 9; k++) {
    const x = r.x + 10 + ((k * 37) % (tw - 12)), y = r.y + 4 + ((time * (18 + k * 3) + k * 23) % (th + 10)) - 6;
    drawRainSock({ x, y, t: time, ph: k, kind: k === 4 ? "gold" : "normal", col: PLUIE_COLORS[k % PLUIE_COLORS.length], land: 0 });
  }
  ctx.restore();
}

/* ---- Écran de choix à deux ---- */
const PLC = { sel: 0 };
const PLC_BTN = [{ x: 110, y: 120, w: 120, h: 40, label: "Ensemble", sub: `${PLUIE_GOAL} chaussettes à deux` }, { x: 250, y: 120, w: 120, h: 40, label: "Compétition", sub: `le premier à ${PLUIE_DUEL}` }];
SCREENS.pluiechoix = {
  update() {
    if (hit("Escape", "GB", "Backspace")) { audio.sfx("back"); state = "worlds"; return; }
    if (hit(...K.left, ...K.right, "HLeft", "HRight")) { PLC.sel = 1 - PLC.sel; audio.sfx("select"); }
    if (hit("Mouse0")) PLC_BTN.forEach((b, i) => { if (inside(b)) { PLC.sel = i; startPluie(i ? "duel" : "ensemble"); } });
    if (state === "pluiechoix" && hit(...K.ok)) startPluie(PLC.sel ? "duel" : "ensemble");
  },
  draw() {
    drawMenuBg(); R(0, 0, VW, VH, "rgba(13,8,32,0.7)");
    text("Pluie de chaussettes", VW / 2, 60, 16, "#ffd23c", "center", "#ffd23c");
    text("Comment voulez-vous jouer ?", VW / 2, 90, 9, "#e8dcff", "center");
    PLC_BTN.forEach((b, i) => { drawButton(b, "", PLC.sel === i || (!TOUCH && inside(b)), i ? "#ff8ab0" : "#7dffb0"); text(b.label, b.x + b.w / 2, b.y + 14, 10, PLC.sel === i ? "#120828" : "#ffffff", "center"); text(b.sub, b.x + b.w / 2, b.y + 29, 7, PLC.sel === i ? "#120828" : "#b9a6e0", "center"); });
    text(say("Flèches pour choisir, Entrée pour partir", "Touche un mode pour partir", "Croix pour choisir, {A} pour partir"), VW / 2, 254, 8, "#b9a6e0", "center");
  },
};

/* ---- Résultat ---- */
const PR_BTN = [{ x: 140, y: 200, w: 96, h: 22, label: "Rejouer" }, { x: 244, y: 200, w: 96, h: 22, label: "Laverie" }];
SCREENS.pluieres = {
  update(rdt) {
    const r = pluie.res; r.t += rdt; updateParts(rdt);
    for (const s of pluie.socks) { s.t += rdt; s.y += s.vy * rdt; s.x += Math.sin(s.t * 2.2 + s.ph) * 18 * rdt; }
    if (r.t < 0.8) return;
    if (hit(...K.left, ...K.right, ...K.up, ...K.down)) { r.sel = 1 - r.sel; audio.sfx("select"); }
    const act = i => { if (i === 0) startPluie(pluie.mode === "solo" ? null : pluie.mode); else pluieQuit(); };
    if (hit(...K.ok)) { act(r.sel); return; }
    if (hit("Escape", "GB")) { act(1); return; }
    if (hit("Mouse0")) PR_BTN.forEach((b, i) => { if (state === "pluieres" && inside(b)) act(i); });
  },
  draw() {
    const P = pluie, r = P.res;
    drawCampWorld();
    for (const s of P.socks) if (s.deco) drawRainSock(s);   // la pluie de la victoire, derrière le voile (le texte reste lisible)
    R(0, 0, VW, VH, "rgba(10,6,24,0.62)");
    if (!r.ok) {
      text("Presque !", VW / 2, 70, 22, "#ff8ab0", "center", "#ff8ab0");
      text(P.mode === "duel" ? `${pluieName(0)} : ${P.n[0]}   ${pluieName(1)} : ${P.n[1]}` : `${pluieTotal()} chaussettes sur ${PLUIE_GOAL}`, VW / 2, 104, 11, "#ffffff", "center");
    } else if (P.mode === "duel") {
      const w = P.n[0] >= P.n[1] ? 0 : 1;
      text(`${pluieName(w)} gagne !`, VW / 2, 70, 22, COOP_COL[w], "center", COOP_COL[w]);
      text(`${pluieName(0)} : ${P.n[0]}   ${pluieName(1)} : ${P.n[1]}`, VW / 2, 104, 11, "#ffffff", "center");
      text(`en ${fmtTime(r.time)}`, VW / 2, 124, 9, "#e8dcff", "center");
    } else {
      text("Toutes les chaussettes !", VW / 2, 70, 20, "#7dffb0", "center", "#7dffb0");
      text(`${PLUIE_GOAL} chaussettes en ${fmtTime(r.time)}` + (r.rec ? "   Nouveau record !" : ""), VW / 2, 104, 11, r.rec ? "#fccc28" : "#ffffff", "center");
      const b = pluieBest(); if (b !== undefined) text(`Record (${df().label}${P.mode === "ensemble" ? ", à deux" : ""}) : ${fmtTime(b)}`, VW / 2, 124, 8, "#b9a6e0", "center");
      if (r.first) text("Nouveau : badge « Pluie de chaussettes » et couleurs « Pluie »", VW / 2, 148, 8, "#fccc28", "center");
    }
    PR_BTN.forEach((bt, i) => drawButton(bt, bt.label, (PAD || TOUCH) ? r.sel === i : inside(bt), i ? "#b9a6e0" : "#7dffb0", 9));
  },
};
