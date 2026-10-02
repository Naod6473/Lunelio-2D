/* ---------------- Secrets : grosses têtes, miroir, devinettes, carnet, surprises du calendrier ---------------- */

/* ---- Code Konami sur l'écran titre : le mode « grosses têtes » ---- */
// ↑ ↑ ↓ ↓ ← → ← → B A (clavier ou manette). Une fois trouvé (SAVE.flags.bigHeads), il s'allume et s'éteint dans les
// options (OPT.bigHead). Purement visuel : drawCharCos() redessine le haut du personnage agrandi (drawBigHead).
const KONAMI = "UUDDLRLRBA";
const KON = { buf: [], typed: "" };
function konamiUpdate() {   // appelé par updateMenu, avant les touches du menu ; vrai si le code vient d'être fini
  let tok = null;
  if (hit("ArrowUp", "GUp")) tok = "U"; else if (hit("ArrowDown", "GDown")) tok = "D";
  else if (hit("ArrowLeft", "GLeft")) tok = "L"; else if (hit("ArrowRight", "GRight")) tok = "R";
  else if (hit("GB")) tok = "B"; else if (hit("GA")) tok = "A";
  if (typedBuf !== KON.typed) { const c = typedBuf.slice(-1); KON.typed = typedBuf; if (c === "B" || c === "A") tok = c; }
  if (!tok) return false;
  KON.buf = [...KON.buf, { tok, diff: diffIdx }].slice(-KONAMI.length);
  if (KON.buf.map(b => b.tok).join("") !== KONAMI) return false;
  diffIdx = KON.buf[0].diff;   // les flèches du code ne changent pas la difficulté
  KON.buf = []; for (const k of ["GA", "Enter", "Space"]) delete pressed[k];
  const first = !SAVE.flags.bigHeads;
  SAVE.flags.bigHeads = 1; OPT.bigHead = !OPT.bigHead || first; saveOptions(); saveGame();
  toast(first ? "Secret trouvé !" : "Grosses têtes", OPT.bigHead ? "Mode « grosses têtes »" : "Grosses têtes rangées", "badge", "#ffd23c");
  audio.sfx("boss_intro"); shake = 6;
  return true;
}
const bigHeads = () => OPT.bigHead && SAVE.flags.bigHeads;
// Le haut du personnage (tête et cou), agrandi 1,55 fois autour du cou
const BIG_K = 1.55;
function drawBigHead(aid, img, frame, x, y, face, scale, alpha) {
  const A = ATL[aid]; if (!A || !img) return null;
  const h = headOf(aid, frame), hh = Math.max(6, Math.round(-h.dy * 0.42)), top = Math.max(0, A.ay + h.dy - 1);
  const sx = (frame % A.cols) * A.cw, sy = Math.floor(frame / A.cols) * A.ch + top, k = BIG_K;
  const dw = A.cw * scale * k, dh = (hh + 1) * scale * k, neck = y + (h.dy + hh) * scale, piv = (A.ax + h.dx) * scale * k;
  ctx.globalAlpha = alpha;
  if (face >= 0) ctx.drawImage(img, sx, sy, A.cw, hh + 1, Math.round(x + h.dx * scale - piv), Math.round(neck - dh), dw, dh);
  else { ctx.save(); ctx.translate(Math.round(x - h.dx * scale + piv), Math.round(neck - dh)); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, A.cw, hh + 1, 0, 0, dw, dh); ctx.restore(); }
  ctx.globalAlpha = 1;
  return { dx: h.dx, dy: (neck - dh - y) / scale, k };   // haut de la grosse tête (pour l'accessoire)
}

/* ---- Mode miroir : mot de passe MIROIR devant les mondes ---- */
// SAVE.flags.miroir (trouvé) et OPT.mirror (allumé) : les salles normales de la campagne sont retournées gauche-droite
// (mirrorRoom, appelé par buildRoom ; décor dessiné retourné). Les arènes de boss restent comme elles sont.
const MIRROR_WORD = "MIROIR";
function miroirType() {
  if (!typedBuf.endsWith(MIRROR_WORD)) return false;
  typedBuf = "";
  const first = !SAVE.flags.miroir;
  SAVE.flags.miroir = 1; OPT.mirror = !OPT.mirror || first; saveOptions(); saveGame();
  toast(first ? "Secret trouvé !" : "Mode miroir", OPT.mirror ? "Mode miroir : les salles sont retournées" : "Mode miroir éteint", "badge", "#5ef0ff");
  audio.sfx("boss_intro");
  return true;
}
const mirrorOn = () => OPT.mirror && SAVE.flags.miroir;
function mirrorRoom(L) {
  const f = r => { if (r) r.x = VW - r.x - r.w; };
  for (const k of ["solids", "plats", "blocks", "decor", "hazards", "dest", "items", "exits", "covers", "gold", "qitems"]) for (const r of L[k] || []) f(r);
  for (const x of L.exits) f(x.draw);
  f(L.ckpt); f(L.machine); f(L.sock);
  L.start = { x: VW - L.start.x - 10, y: L.start.y };
  L.foeSpawns = L.foeSpawns.map(o => {
    const [x, y, w, h] = o.r, pb = o.patrolBounds;
    return { ...o, r: [VW - x - w, y, w, h], patrolBounds: pb && typeof pb.x === "number" && typeof pb.width === "number" ? { ...pb, x: VW - pb.x - pb.width } : pb };
  });
  L.mirror = true;
}

/* ---- Les devinettes de Mme Bulle : lui parler cinq fois de suite ---- */
const BULLE_SECRETS = [
  ["Devinette ! Qu'est-ce qui est plein de trous mais qui garde l'eau ?", "Une éponge ! Hihi."],
  ["Pourquoi les chaussettes vont-elles toujours par deux ?", "Parce qu'elles ont peur de se perdre dans la machine !"],
  ["Devinette : plus j'ai chaud, plus je rapetisse. Qui suis-je ?", "Un glaçon ! Pas une chaussette, rassure-toi."],
  ["Tu sais ce que dit une machine à laver à une autre machine à laver ?", "« On se fait un petit tour ? »"],
  ["Devinette : je tourne, je tourne, et je ne me fatigue jamais. Qui suis-je ?", "Le tambour de ma machine, bien sûr !"],
  ["Je vais te dire un secret : quand personne ne regarde, je danse avec le balai.", "Ne le dis à personne !"],
  ["Devinette : j'ai des dents mais je ne mords jamais. Qui suis-je ?", "Un peigne ! Comme pour mes bigoudis."],
  ["Pourquoi le Roi Slime est-il toujours de bonne humeur ?", "Parce qu'il est plein d'énergie !"],
  ["Devinette : je suis toujours devant toi, mais tu ne me vois jamais. Qui suis-je ?", "L'avenir ! Et peut-être une chaussette perdue."],
  ["Qu'est-ce qui est jaune et qui attend ?", "Jonathan ! Bon, celle-là, c'est Grand-père Firmin qui me l'a apprise."],
];
const BULLE = { n: 0, t: 0, last: -1 };
// Appelé par talkTo() quand on parle à Mme Bulle : renvoie les lignes du secret au cinquième appel de suite, sinon null
function bulleSecret() {
  BULLE.n = hub.t - BULLE.t < 30 ? BULLE.n + 1 : 1; BULLE.t = hub.t;
  if (BULLE.n < 5) return null;
  BULLE.n = 0;
  let i; do i = Math.floor(Math.random() * BULLE_SECRETS.length); while (i === BULLE.last && BULLE_SECRETS.length > 1);
  BULLE.last = i;
  const [q, a] = BULLE_SECRETS[i], first = !SAVE.flags.bulleSecret;
  return { lines: [["bulle", first ? "Tu insistes, hein ? D'accord, je te dis un secret…" : "Encore toi ! Bon, écoute bien…"], ["bulle", q], ["bulle", a]],
    end: () => { if (first) { SAVE.flags.bulleSecret = 1; checkUnlocks(false); } } };
}

/* ---- Le carnet des secrets (onglet « Secrets » des collections) ---- */
// Les secrets trouvés, et un indice pour les autres. Image : atlas carnet_secrets s'il existe (fourni plus tard), sinon un
// carnet dessiné par le code (provisoire).
const SECRETS = [
  { id: "dahaka", name: "La course du Dahaka", found: () => SAVE.flags.dahaka, what: "Un niveau sans fin : cours, le démon du temps te poursuit !",
    hint: "Devant les mondes, tape le nom du démon qui poursuit le prince (six lettres, il commence par D)." },
  { id: "pluie", name: "La pluie de chaussettes", found: () => SAVE.flags.pluie, what: "Attrape 50 chaussettes qui tombent du ciel.",
    hint: "Le tas de chaussettes de la laverie n'aime pas qu'on le chatouille… au sabre, plusieurs fois de suite." },
  { id: "grosses_tetes", name: "Les grosses têtes", found: () => SAVE.flags.bigHeads, what: "Tout le monde a une énorme tête ! (dans les options)",
    hint: "Sur l'écran titre : haut, haut, bas, bas, gauche, droite, gauche, droite, puis B et A." },
  { id: "miroir", name: "Le mode miroir", found: () => SAVE.flags.miroir, what: "Les salles sont retournées, comme dans un miroir ! (dans les options)",
    hint: "Devant les mondes, tape le nom de ce qui te montre ton reflet dans la salle de bain." },
  { id: "bulle", name: "Les devinettes de Mme Bulle", found: () => SAVE.flags.bulleSecret, what: "Mme Bulle connaît plein de devinettes.",
    hint: "Mme Bulle a beaucoup à raconter, si on lui parle encore et encore…" },
  { id: "dorees", name: "Les chaussettes dorées", found: () => SAVE.flags.secret, what: "Des chemins cachés, pour les héros qui ont la bonne capacité.",
    hint: "Certaines chaussettes brillent là où seul un super saut, un dash ou un double saut peut aller." },
  { id: "eglise", name: "L'église", found: () => SAVE.flags.egliseWon, what: "Le mariage de Laurène et Jules, dans une autre réalité.",
    hint: "Une cloche sonne quand les six mondes sont finis…" },
];
const SEC = { sel: 0 };
const secRect = i => ({ x: 10, y: 34 + i * 30, w: 228, h: 27 });
function drawCarnet(x, y, s = 1) {
  if (hasAtlas("carnet_secrets")) { const A = ATL.carnet_secrets, an = A.anims.anime || A.anims.play || [0, 1]; drawFrame("carnet_secrets", an[0] + Math.floor(time * 6) % an[1], x, y, 1, 1, s); return; }
  // provisoire : un petit carnet violet avec un point d'interrogation
  const X = Math.round(x - 12 * s), Y = Math.round(y - 30 * s), w = Math.round(24 * s), h = Math.round(30 * s);
  R(X - 1, Y - 1, w + 2, h + 2, "#0e0a1a"); R(X, Y, w, h, "#6a2a9a"); R(X, Y, Math.round(4 * s), h, "#3a1260");
  R(X + Math.round(6 * s), Y + Math.round(4 * s), w - Math.round(9 * s), h - Math.round(8 * s), "#8a4aca");
  text("?", x + 2 * s, y - 15 * s, Math.round(14 * s), "#ffd23c", "center");
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 4); R(Math.round(x + 9 * s), Math.round(y - 32 * s), 2, 2, "#ffffff"); ctx.globalAlpha = 1;
}
function drawAlbumSecrets() {
  const n = SECRETS.filter(s => s.found()).length;
  text(`Secrets trouvés : ${n}/${SECRETS.length}`, 12, 28, 8, "#fccc28");
  SECRETS.forEach((s, i) => {
    const r = secRect(i), ok = s.found(), sel = i === ALB.sel && ALB.focus === "list";
    R(r.x, r.y, r.w, r.h, sel ? "rgba(255,255,255,0.14)" : "rgba(20,12,40,0.8)");
    if (sel) { ctx.strokeStyle = "#ffffff"; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
    text(ok ? "✦" : "?", r.x + 10, r.y + r.h / 2, 10, ok ? "#ffd23c" : "#5a4a80", "center");
    text(ok ? s.name : "Secret à trouver", r.x + 22, r.y + 9, 8, ok ? "#ffffff" : "#b9a6e0");
    text(ok ? "Trouvé !" : "Indice à droite", r.x + 22, r.y + 19, 6, ok ? "#7dffb0" : "#8a7aa8");
  });
  const s = SECRETS[ALB.sel]; if (!s) return;
  const ok = s.found(), px = 248, py = 30;
  drawPanel(px, py, 224, 200, ok ? "#ffd23c" : "#3a2a5c");
  drawCarnet(px + 112, py + 66, 1.6);
  text(ok ? s.name : "Un secret à trouver…", px + 112, py + 84, 9, ok ? "#ffd23c" : "#b9a6e0", "center");
  let y = py + 104;
  for (const l of wrapText(ok ? s.what : "Indice : " + s.hint, 204, 8)) { text(l, px + 10, y, 8, "#e8dcff"); y += 12; }
}

/* ---- Surprises du calendrier (laverie) ---- */
// Neige en décembre, citrouilles et chauves-souris en papier fin octobre (dessins provisoires), confettis et banderole
// aux anniversaires (CALENDAR.birthdays, « JJ-MM »), et des jours de pluie au printemps et à l'automne (gouttes derrière
// les vitres ; bruit de pluie si sfx/laverie/pluie.mp3 existe). Pour essayer : ajouter ?jour=JJ-MM à l'adresse du jeu.
function calToday() {
  const q = /[?&]jour=(\d{2})-(\d{2})/.exec(location.search);
  if (q) return { d: +q[1], m: +q[2] };
  const t = new Date(); return { d: t.getDate(), m: t.getMonth() + 1 };
}
function season() {
  const { d, m } = calToday(), key = `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}`;
  if ((CALENDAR.birthdays || []).includes(key)) return "anniversaire";
  if (m === 12) return "neige";
  if (m === 10 && d >= 15) return "halloween";
  // un jour sur cinq environ, au printemps (mars à mai) et à l'automne (septembre, octobre avant Halloween, novembre)
  if ([3, 4, 5, 9, 10, 11].includes(m) && ((d * 37 + m * 11) % 5 === 0)) return "pluie";
  return null;
}
const CAL = { parts: [], said: false };
function updateSeason(rdt) {
  const s = season(); if (!s) { CAL.parts = []; return; }
  if (!CAL.said && s === "anniversaire") { CAL.said = true; toast("Joyeux anniversaire !", "Mme Bulle a décoré la laverie", "badge", "#ff4f8a"); }
  const want = s === "neige" ? 60 : s === "pluie" ? 90 : s === "anniversaire" ? 50 : 0;
  while (CAL.parts.length < want) CAL.parts.push({ x: Math.random() * VW, y: -Math.random() * VH, v: 0.5 + Math.random(), ph: Math.random() * 6, c: Math.floor(Math.random() * 6) });
  for (const p of CAL.parts) {
    if (s === "neige") { p.y += (14 + 16 * p.v) * rdt; p.x += Math.sin(time + p.ph) * 8 * rdt; }
    else if (s === "pluie") { p.y += (180 + 120 * p.v) * rdt; p.x -= 30 * rdt; }
    else { p.y += (30 + 30 * p.v) * rdt; p.x += Math.sin(time * 2 + p.ph) * 20 * rdt; }
    if (p.y > VH + 4) { p.y = -4 - Math.random() * 20; p.x = Math.random() * (VW + 40); }
  }
}
// Par-dessus la laverie (coordonnées de l'écran)
function drawSeasonScreen() {
  const s = season(); if (!s) return;
  for (const p of CAL.parts) {
    if (s === "neige") { ctx.globalAlpha = 0.5 + 0.4 * p.v / 1.5; R(Math.round(p.x), Math.round(p.y), p.v > 1 ? 2 : 1, p.v > 1 ? 2 : 1, "#ffffff"); }
    else if (s === "pluie") { if (p.y > 108) continue; ctx.globalAlpha = (0.25 + 0.2 * p.v) * Math.min(1, (108 - p.y) / 30); R(Math.round(p.x), Math.round(p.y), 1, 5, "#bfe4ff"); }   // derrière les vitres (le haut de la pièce)
    else { ctx.globalAlpha = 0.9; R(Math.round(p.x), Math.round(p.y), 2, 2, ["#ff4f8a", "#fccc28", "#5ef0ff", "#7dffb0", "#c86eff", "#ffffff"][p.c]); }
  }
  ctx.globalAlpha = 1;
  if (s === "pluie") R(0, 0, VW, 110, "rgba(40,60,100,0.08)");
}
// Dans la pièce (avec la caméra) : décorations provisoires dessinées par le code, remplacées par saison.png s'il existe
function drawSeasonWorld() {
  const s = season(); if (!s || hub.room !== "salle") return;
  const fl = hubRoom().floor;
  if (hasAtlas("saison")) { const an = ATL.saison.anims[s]; if (an) drawFrame("saison", an[0] + Math.floor(time * 4) % an[1], 408, fl - 70); return; }
  if (s === "halloween") {
    for (const x of [140, 300, 560, 700]) {   // citrouilles en papier
      R(x - 7, fl - 12, 14, 11, "#0e0a1a"); R(x - 6, fl - 11, 12, 9, "#ff8a3c"); R(x - 1, fl - 14, 2, 3, "#3a6a2a");
      R(x - 4, fl - 8, 2, 2, "#2a1206"); R(x + 2, fl - 8, 2, 2, "#2a1206"); R(x - 3, fl - 5, 6, 1, "#2a1206");
    }
    for (let i = 0; i < 3; i++) { const x = 200 + i * 180 + Math.sin(time * 1.5 + i) * 20, y = 70 + Math.sin(time * 3 + i) * 6, wg = Math.floor(time * 8 + i) % 2 ? 3 : 1;   // chauves-souris en papier
      R(Math.round(x) - 1, Math.round(y), 3, 2, "#1a1020"); R(Math.round(x) - 5, Math.round(y) - wg + 1, 4, 1, "#1a1020"); R(Math.round(x) + 2, Math.round(y) - wg + 1, 4, 1, "#1a1020"); }
  } else if (s === "neige" || s === "anniversaire") {
    // guirlande lumineuse (Noël) ou fanions (anniversaire) en haut de la pièce
    const cols = s === "neige" ? ["#ff4f4f", "#7dffb0", "#ffd23c", "#5ef0ff"] : ["#ff4f8a", "#fccc28", "#5ef0ff", "#7dffb0", "#c86eff"];
    for (let x = 20; x < hubRoom().w - 20; x += 14) {
      const y = 22 + Math.round(Math.sin(x / 40) * 4), c = cols[(x / 14 | 0) % cols.length];
      if (s === "neige") { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 4 + x); R(x, y, 2, 3, c); ctx.globalAlpha = 1; }
      else { R(x - 3, y, 7, 1, "#e8dcff"); R(x - 2, y + 1, 5, 2, c); R(x - 1, y + 3, 3, 2, c); R(x, y + 5, 1, 1, c); }
    }
    if (s === "anniversaire") text("Joyeux anniversaire !", 408, 44, 10, "#ff4f8a", "center", "#ff4f8a");
  }
}
// Bruit de pluie (si le son existe) : choisi par hubAmbience()
const seasonAmbience = () => season() === "pluie" && hasSound("sfx/laverie/pluie") ? "sfx/laverie/pluie" : null;
