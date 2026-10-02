/* ---------------- Nouvelle campagne : données et images ---------------- */
// Six mondes de douze salles, préparés par src/preparer_pack.py à partir du pack graphique (src/campagne.json).
// Les salles sont décrites par des rectangles (pas par une grille) : sol `solid`, plateformes `one_way_top`, déclencheurs.
// Les images (fonds, planches recalées) sont dans assets/ à côté du jeu ; en version autonome, build.py les intègre.
const CAMP = __CAMPAGNE__;
const ATL = CAMP.atlas, CWORLDS = CAMP.worlds;
const ASSET_EMBED = __ASSET_EMBED__, ASSET_VER = __ASSET_VER__;
// planches d'origine d'Hélio et Lune, déjà intégrées au jeu (SPRITES), tant qu'une planche complète de laverie.json ne les remplace pas
const ATLAS_SPRITE = Object.fromEntries([["perso_helio", "helio"], ["perso_lune", "lune"]].filter(([k]) => ATL[k] && ATL[k].src.startsWith("assets/sprites/")));
const imgCache = {};
const assetSrc = p => AUDIO_MODE === "embed" ? (ASSET_EMBED[p] || p) : p + (ASSET_VER[p] ? "?v=" + ASSET_VER[p] : "");
function getImg(p) {
  let o = imgCache[p];
  if (!o) {
    o = imgCache[p] = { img: new Image(), ok: false, done: false };
    o.img.onload = () => { o.ok = o.done = true; }; o.img.onerror = () => { o.done = true; };
    o.img.src = assetSrc(p);
  }
  return o;
}
function atlasImg(aid) {
  if (ATLAS_SPRITE[aid]) return IMG[ATLAS_SPRITE[aid]] || null;
  const A = ATL[aid]; if (!A) return null;
  const o = getImg(A.src); return o.ok ? o.img : null;
}
// Charge toutes les planches au démarrage (une image manquante ou lente ne bloque jamais le jeu plus de quelques secondes)
// onEach : appelé pour chaque planche prête (écran de chargement)
function preloadAtlases(timeout = 8000, onEach = () => {}) {
  const list = Object.keys(ATL).filter(k => !ATLAS_SPRITE[k] && !ATL[k].lazy).map(k => getImg(ATL[k].src));   // lazy : chargées à la demande (souvenirs)
  const all = Promise.all(list.map(o => o.done ? onEach() : new Promise(r => { const f = () => { onEach(); r(); }; o.img.addEventListener("load", f); o.img.addEventListener("error", f); })));
  return Promise.race([all, new Promise(r => setTimeout(r, timeout))]);
}
// Dessine l'image i d'un atlas, son point d'ancrage (pieds, centre ou base selon l'atlas) en (x, y). face < 0 : retournée.
// cos : identifiant d'un cosmétique de couleurs (planche recolorée, laverie.js)
function drawFrame(aid, i, x, y, face = 1, alpha = 1, scale = 1, cos = null) {
  const A = ATL[aid]; if (!A) return;
  const img = cos ? atlasImgCos(aid, cos) : atlasImg(aid); if (!img) return;
  const sx = (i % A.cols) * A.cw, sy = Math.floor(i / A.cols) * A.ch, w = A.cw * scale, h = A.ch * scale;
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  if (face >= 0) ctx.drawImage(img, sx, sy, A.cw, A.ch, Math.round(x - A.ax * scale), Math.round(y - A.ay * scale), w, h);
  else { ctx.save(); ctx.translate(Math.round(x + A.ax * scale), Math.round(y - A.ay * scale)); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, A.cw, A.ch, 0, 0, w, h); ctx.restore(); }
  ctx.globalAlpha = 1;
}
// Image d'une animation à l'instant t (fps images par seconde ; loop : en boucle, sinon s'arrête sur la dernière)
function animFrame(aid, name, t, fps = 10, loop = true) {
  const a = ATL[aid] && ATL[aid].anims[name]; if (!a) return 0;
  let k = Math.floor(Math.max(0, t) * fps); k = loop ? k % a[1] : Math.min(a[1] - 1, k);
  return a[0] + k;
}
const charAtlas = C => "perso_" + C.id;
// Héros avec ses cosmétiques équipés (couleurs, accessoire) ; voir drawCharCos dans laverie.js
function drawChar(C, frame, x, y, face = 1, scale = 1, alpha = 1) { drawCharCos(C, frame, x, y, face, scale, alpha); }

/* ---------------- Nouvelle campagne : fiches ---------------- */
// Ennemis des nouveaux mondes. ground : marche avec la gravité ; contact : "always", "attack" (pendant l'attaque) ou "never".
// defeat : effet de disparition (sans violence) ; les comportements et attaques viennent des JSON de placement.
const FOES = {
  slime:         { atlas: "ennemi_slime", name: "Slime électrique", ground: true, hp: 1, speed: 26, contact: "always", defeat: "slime" },
  drone:         { atlas: "ennemi_drone", name: "Drone sentinelle", ground: false, hp: 1, speed: 34, contact: "never", defeat: "robot" },
  ninja_ombre:   { atlas: "ennemi_ninja_ombre", name: "Ninja de l'ombre", ground: true, hp: 1, speed: 42, contact: "never", defeat: "ombre" },
  golem:         { atlas: "ennemi_golem", name: "Golem de lave", ground: true, hp: 2, speed: 22, contact: "attack", defeat: "lave" },
  singe_pirate:  { atlas: "ennemi_singe_pirate", name: "Singe pirate", ground: true, hp: 1, speed: 46, contact: "never", defeat: "etoiles" },
  chauve_souris: { atlas: "ennemi_chauve_souris", name: "Chauve-souris néon", ground: false, hp: 1, speed: 36, contact: "attack", defeat: "etoiles" },
};
const FOE_DEFEATS = {
  robot: { fx: "fx_explosion", sparks: ["#fccc28", "#ffffff", "#ff8a3c"], debris: ["#6f7ea8", "#9fb0d8", "#3a3460"] },
  slime: { fx: "fx_eclaboussure", sparks: ["#7dffff", "#ffffff", "#5ef0ff"], debris: ["#5ef0ff", "#2fa8c8"] },
  ombre: { fx: "fx_teleport", sparks: ["#c86eff", "#ffffff", "#7a3aff"], debris: ["#3a2a5a", "#5a3a8a"] },
  lave: { fx: "fx_poussiere", sparks: ["#ffb43c", "#ff6a1a", "#ffffff"], debris: ["#3a2a2a", "#5a3a2a", "#ff6a1a"] },
  etoiles: { fx: "fx_collecte", sparks: ["#fccc28", "#ffffff", "#ff8ab0"], debris: ["#fccc28", "#ffffff"] },
};
// Variantes des ennemis : chaque ennemi reçoit au hasard une nuance proche de sa couleur d'origine et, parfois, un effet visuel
// (dans les couleurs de sa disparition, FOE_DEFEATS). Apparence seulement : vitesse, attaques et résistance ne changent pas.
// Le tirage dépend de la salle et de la place de l'ennemi (foeVariant(clé)) : une salle recommencée garde les mêmes ennemis.
// w : poids du tirage. hue : décalage de teinte (degrés, assez petit pour rester dans la même famille), sat, light : comme les cosmétiques.
const FOE_VARIANTS = [
  { id: "fv_base", w: 4 },
  { id: "fv_chaud", hue: -16, w: 2 }, { id: "fv_froid", hue: 16, w: 2 },
  { id: "fv_vif", sat: 1.25, light: 0.03, w: 2 }, { id: "fv_sombre", sat: 0.9, light: -0.08, w: 2 },
  { id: "fv_pastel", sat: 0.75, light: 0.07, w: 1 },
];
const FOE_EFFECTS = [[null, 6], ["aura", 2], ["scintille", 2], ["ombre", 1], ["eclat", 1]];
// Petit générateur pseudo-aléatoire à graine (mulberry32) : même clé → même tirage
function seededRand(key) {
  let h = 2166136261; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function weighted(list, r, w = x => x.w) { const tot = list.reduce((a, x) => a + w(x), 0); let k = r * tot; for (const x of list) { k -= w(x); if (k < 0) return x; } return list[0]; }
function foeVariant(key) {
  const rnd = key ? seededRand(key) : Math.random, v = weighted(FOE_VARIANTS, rnd()), fx = weighted(FOE_EFFECTS, rnd(), x => x[1])[0];
  return { pal: v.id === "fv_base" ? null : v, fx, ph: rnd() * 6 };
}
// Effet d'une variante autour d'un ennemi (cx, cy : centre ; cols : couleurs de sa disparition) ; under : sous le sprite
function drawFoeFx(v, cx, cy, w, h, cols, under) {
  if (!v || !v.fx) return;
  const t = time + v.ph, rgb = c => { const n = parseInt(c.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };
  if (under && v.fx === "aura") glow(ctx, cx, cy, Math.max(w, h) * 0.8, rgb(cols[0]), 0.22 + 0.1 * Math.sin(t * 4));
  if (under && v.fx === "ombre") { ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 3); R(Math.round(cx - w / 2), Math.round(cy + h / 2 - 2), w, 3, "#0e0a1a"); ctx.globalAlpha = 1; }
  if (!under && v.fx === "scintille") for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1, k = (t * 1.3 + i / 3) % 1; ctx.globalAlpha = 1 - k; R(Math.round(cx + Math.cos(a) * w * 0.7), Math.round(cy - h * 0.2 - k * 10 + Math.sin(a) * 4), 1, 1, cols[i % cols.length]); }
  if (!under && v.fx === "eclat" && (t % 2.4) < 0.25) { ctx.globalAlpha = 0.9; R(Math.round(cx + w * 0.25), Math.round(cy - h * 0.3), 1, 3, "#ffffff"); R(Math.round(cx + w * 0.25 - 1), Math.round(cy - h * 0.3 + 1), 3, 1, "#ffffff"); }
  ctx.globalAlpha = 1;
}
// Couleur décalée (dessins faits par le code : robots de l'ancienne aventure)
const hexShiftCache = {};
function shiftHex(hex, pal) {
  if (!pal) return hex;
  const k = hex + pal.id; if (hexShiftCache[k]) return hexShiftCache[k];
  const n = parseInt(hex.slice(1, 7), 16); let r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0, s = 0, l = (mx + mn) / 2;
  if (d > 1e-6) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; }
  h = (h + (pal.hue || 0) + 360) % 360; s = Math.min(1, s * (pal.sat || 1)); l = clamp(l + (pal.light || 0), 0, 1);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  const hx = v => Math.round(v * 255).toString(16).padStart(2, "0");
  return hexShiftCache[k] = "#" + hx(f(h / 360 + 1 / 3)) + hx(f(h / 360)) + hx(f(h / 360 - 1 / 3)) + hex.slice(7);
}

// Boss des nouveaux mondes : une suite d'actions par phase (moves[phase - 1]), jouées en boucle.
// P1 : attaques posées, rythme pour apprendre. P2 : plus rapide, nouvelles combinaisons, il se dégrade (fumée, étincelles).
// P3 (P2 pour le singe, qui n'a que deux phases) : rage, attaques spectaculaires… puis « tired » : il s'essouffle, c'est le moment de frapper.
const BIG = {
  roi_slime:           { name: "Roi Slime électrique", hp: 10, color: "#5ef0ff", fly: false, speed: 34, w: 40, h: 40, minion: null, defeat: "slime",
    moves: [["walk", "hop"], ["hop", "orb", "walk", "hop", "orb"], ["hop", "orb3", "hop", "tired"]] },
  drone_titan:         { name: "Drone Titan", hp: 12, color: "#ff5a3c", fly: true, speed: 60, w: 44, h: 40, minion: "drone", defeat: "robot",
    moves: [["hover", "burst"], ["hover", "burst2", "summon", "burst2"], ["dive", "burst3", "hover", "dive", "tired"]] },
  maitre_ombres:       { name: "Maître des ombres", hp: 13, color: "#c86eff", fly: false, speed: 52, w: 32, h: 52, minion: null, defeat: "ombre",
    moves: [["walk", "slash"], ["teleport", "walk", "blades", "teleport"], ["teleport", "blades3", "slash", "tired"]] },
  colosse_lave:        { name: "Colosse de lave", hp: 14, color: "#ff8a3c", fly: false, speed: 26, w: 40, h: 56, minion: null, defeat: "lave",
    moves: [["walk", "slam"], ["walk", "slam", "rain"], ["slam", "rain", "slam", "tired"]] },
  singe_roi_pirate:    { name: "Singe roi pirate", hp: 12, color: "#ffc23c", fly: false, speed: 56, w: 32, h: 52, minion: null, defeat: "etoiles",
    moves: [["walk", "leap"], ["leap", "coco", "leap", "leap", "tired"]] },
  reine_chauve_souris: { name: "Reine chauve-souris néon", hp: 15, color: "#ff4fd8", fly: true, speed: 50, w: 44, h: 44, minion: "chauve_souris", defeat: "etoiles",
    moves: [["hover", "orb"], ["hover", "summon", "orb3"], ["dive", "orb5", "summon", "dive", "tired"]] },
};
// Réaction du décor en P2 et plus (effets visuels seulement : le parcours et les zones sûres ne changent pas)
const ARENA_FX = { "01_centrale": "lumieres", "02_usine": "alarme", "03_temple": "ombres", "04_volcan": "braises", "05_port": "pluie", "06_grotte": "cristaux" };
// Annonce d'un changement de phase de boss (P2 : il s'énerve ; P3 : rage, mais il s'épuise et laisse des ouvertures)
const BOSS_PHASE_SAY = {
  2: e => e.th.length === 1 ? `${e.name} entre dans une rage folle !` : `${e.name} s'énerve !`,
  3: e => `${e.name} est furieux… mais il s'épuise vite !`,
};
// Effets autour de la machine selon l'époque (même machine dans tous les mondes)
const MACHINE_FX = {
  "01_centrale": ["#fccc28", "#ffffff", "#5ef0ff"], "02_usine": ["#c8d0dc", "#ffffff", "#8a92a8"], "03_temple": ["#c86eff", "#ffffff", "#7a3aff"],
  "04_volcan": ["#ff8a3c", "#ffd23c", "#ff3b1a"], "05_port": ["#7dd8ff", "#ffffff", "#2fa8ff"], "06_grotte": ["#ff4fd8", "#ffffff", "#c86eff"],
};
// Consignes des salles (jetons comme dans worlds.py, ou texte libre) ; "UP" : entrer par une porte
const CAMP_HINTS = {
  centrale_01: ["MOVE", "UP"], centrale_02: ["ATTACK"], centrale_03: ["Attention au câble : passe quand il est éteint"],
  centrale_04: ["SPECIAL"], centrale_05: ["POWER"], centrale_06: ["Tranche la borne… puis gare à l'eau électrique !"],
  centrale_09: ["Saute par-dessus les trous"], centrale_11: ["Le drapeau garde ta place avant le boss"],
  usine_01: ["Les drones visent : renvoie leurs lasers au sabre !"], usine_05: ["Le laser s'allume après l'alerte"],
  temple_01: ["Les ninjas lèvent leur sabre avant de frapper"], volcan_01: ["Le golem charge quand il brille"],
  port_01: ["Les singes bondissent : recule puis tranche"], grotte_01: ["Les chauves-souris plongent : esquive puis frappe"],
};
const MAX_ATTACKERS = 2;

/* ---------------- Nouvelle campagne : sauvegardes ---------------- */
// Progression, salle de reprise et records : sauvegarde commune à tous les héros (sauvegarde.js : campProgress, campResume…).

/* ---------------- Nouvelle campagne : salles ---------------- */
let mode = "camp";   // "camp" : nouvelle campagne ; "bonus" : ancienne aventure
let chal = null;     // défi en cours (programme de lavage, defis.js), sinon null
let camp = { wi: 0, ri: 0, ckpt: 0, fromStart: true };
let fxs = [], mach = null, campTrans = null, arrival = null, campFade = 0;
const campRoom = () => CWORLDS[camp.wi].rooms[camp.ri];
function roomIndex(wi, id) { return CWORLDS[wi].rooms.findIndex(r => r.id === id); }
function makeHazard(o, rc, i) {
  const c = o.cycle || null;
  const kind = o.asset === null ? "pit" : o.asset === "hazard_effect" ? o.hazardType : o.asset;
  return { ...rc, id: o.id, o, kind, cycle: c, period: c ? c.telegraphSeconds + c.activeSeconds + c.safeSeconds : 0, offset: i * 0.9,
    enabled: !o.enabledWhen && o.initiallyActive !== false, disabled: false, phase: kind === "pit" ? "active" : "safe", arena: !c && kind === "water" };
}
function buildRoom(wi, ri) {
  const W = CWORLDS[wi], R = W.rooms[ri];
  const L = { json: true, wi, ri, W, R, solids: [], plats: [], blocks: [], decor: [], hazards: [], dest: [], items: [], exits: [], machine: null,
    ckpt: null, start: { x: 24, y: 208 }, foeSpawns: [], bossSpawn: null, lastSafe: null, leaving: false, arena: null };
  for (const o of R.objects) {
    const [x, y, w, h] = o.r, rc = { x, y, w, h };
    if (o.kind === "terrain" && o.collision === "solid") L.solids.push(rc);
    else if (o.kind === "platform") L.plats.push(rc);
    else if (o.kind === "spawn") L.start = { x, y: y + h - 32 };
    else if (o.kind === "decor" && o.sprite) L.decor.push({ ...rc, sprite: o.sprite });
    else if (o.kind === "destructible") L.dest.push({ ...rc, o, type: o.asset, hp: 2, state: 0, alive: true, hurtT: 0, fxT: 0 });
    else if (o.kind === "hazard") L.hazards.push(makeHazard(o, rc, L.hazards.length));
    else if (o.kind === "pickup") L.items.push({ ...rc, o, kind: o.bonusType || "energy", alive: true });
    else if (o.kind === "checkpoint") L.ckpt = { ...rc, o, on: false, t: 0 };
    else if (o.kind === "exit") {
      const machineExit = o.asset === "machine";
      // porte de la centrale 01–11 : zone 24 × 32, dessin 48 × 40 centré sur la base de la zone
      const draw = { x: x + w / 2 - 24, y: y + h - 40, w: 48, h: 40 };
      L.exits.push({ ...rc, o, draw, kind: machineExit ? "machine" : "door", locked: false, st: "closed", t: 0, next: o.nextLevel || null });
    }
    else if (o.kind === "portal") L.machine = { ...rc, o };
    else if (o.kind === "enemy_spawn") L.foeSpawns.push(o);
    else if (o.kind === "boss_spawn") L.bossSpawn = o;
  }
  addRoomExtras(L, R);
  // salle de boss : sortie verrouillée jusqu'à la victoire
  if (L.bossSpawn) for (const e of L.exits) e.locked = true;
  // salle normale : porte verrouillée tant qu'il reste des ennemis (foeLock : ouverte par updateDoorLocks) ; pas dans les programmes de lavage, qui ont leurs propres règles
  else if (L.foeSpawns.length && !chal) for (const e of L.exits) if (e.kind === "door") { e.locked = true; e.foeLock = true; }
  if (L.bossSpawn && L.hazards.some(h => h.arena)) L.arena = { t: 1.5, cur: null, side: 0 };
  return L;
}
// Ajouts de campagne_ajouts.json : plateformes et caisses en plus, chaussette de la salle, chaussettes dorées, objets de quête.
// Dans un défi (chal), la chaussette principale est remplacée par la cible du défi s'il en a une.
function addRoomExtras(L, R) {
  for (const q of (AJOUTS.platforms[R.id] || [])) L.plats.push({ x: q[0], y: q[1], w: q[2], h: q[3], extra: true });
  for (const c of (AJOUTS.crates[R.id] || [])) { const [x, y, w, h] = c.r; L.dest.push({ x, y, w, h, o: { id: c.id, onDestroyed: {} }, type: c.type || "crate", hp: 2, state: 0, alive: true, hurtT: 0, fxT: 0 }); }
  L.sock = null; L.gold = []; L.qitems = []; L.covers = [];
  const S = AJOUTS.socks[R.id];
  if (S && !chal) {
    const found = !!SAVE.socks[R.id];
    L.sock = { x: S.r[0], y: S.r[1], w: 12, h: 12, type: S.type, alive: true, found, crate: S.crate || null,
      hidden: !!S.crate || S.type === "apres_boss", t: Math.random() * 3 };
    if (S.cover) L.covers.push({ x: S.cover[0], y: S.cover[1], w: S.cover[2], h: S.cover[3], a: 1 });
  }
  if (!chal) for (const g of AJOUTS.gold) if (g.room === R.id) L.gold.push({ ...g, x: g.r[0], y: g.r[1], w: 12, h: 12, alive: !SAVE.gold[g.id], t: 0 });
  if (!chal) for (const q of AJOUTS.questItems) {
    const st = SAVE.quests[q.quest];
    if (q.room === R.id && st && st.st === "active" && !(st.items && st.items[q.id])) L.qitems.push({ ...q, x: q.r[0], y: q.r[1], w: 12, h: 12, alive: true, t: 0 });
  }
  if (chal && chal.C.prog === "solitaire") {
    const t = AJOUTS.challengeTargets[chal.C.id];
    if (t && R.id === chal.C.rooms[chal.C.rooms.length - 1]) L.sock = { x: t[0], y: t[1], w: 12, h: 12, type: "cible", alive: true, found: false, hidden: false, target: true, t: 0 };
    for (const x of L.exits) x.locked = true;   // on cherche la chaussette, pas la sortie
  }
}
let terrainCanvas = null, terrainFor = null;
// Sol et plateformes pré-rendus une fois par salle à partir de l'atlas de terrain du monde (bords seulement au bord d'un trou)
function makeTerrain(L) {
  const A = ATL[L.W.terrain], img = atlasImg(L.W.terrain); if (!A || !img) return null;
  const [c, x] = mkCanvas(VW, VH);
  const box = i => A.boxes[i] || [0, 0, A.cw, A.ch];
  const cell = i => [(i % A.cols) * A.cw, Math.floor(i / A.cols) * A.ch];
  // bande : un bord gauche, un milieu répété, un bord droit (cap px), tous à la hauteur h, posés en (rx, ry)
  function strip(i, rx, ry, rw, h, capL, capR) {
    const [cx0, cy0] = cell(i), [bx, by, bw, bh] = box(i), sy = cy0 + by;
    const midW = Math.max(4, bw - capL - capR);
    let xx = rx;
    if (capL) { x.drawImage(img, cx0 + bx, sy, capL, bh, xx, ry, capL, h); xx += capL; }
    const end = rx + rw - capR;
    while (xx < end) { const w = Math.min(midW, end - xx); x.drawImage(img, cx0 + bx + capL, sy, w, bh, xx, ry, w, h); xx += w; }
    if (capR) x.drawImage(img, cx0 + bx + bw - capR, sy, capR, bh, end, ry, capR, h);
  }
  for (const s of L.solids) {
    const [, , fw] = box(0);
    let xx = s.x;
    const leftEdge = s.x > 0, rightEdge = s.x + s.w < VW;
    if (leftEdge) { const [cx0, cy0] = cell(1), [bx, by, bw, bh] = box(1); x.drawImage(img, cx0 + bx, cy0 + by, bw, bh, xx, s.y, bw, s.h); xx += bw; }
    const end = s.x + s.w - (rightEdge ? box(2)[2] : 0);
    const [cx0, cy0] = cell(0), [bx, by, , bh] = box(0);
    while (xx < end) { const w = Math.min(fw, end - xx); x.drawImage(img, cx0 + bx, cy0 + by, w, bh, xx, s.y, w, s.h); xx += w; }
    if (rightEdge) { const [cx2, cy2] = cell(2), [bx2, by2, bw2, bh2] = box(2); x.drawImage(img, cx2 + bx2, cy2 + by2, bw2, bh2, end, s.y, bw2, s.h); }
  }
  for (const p of L.plats) strip(3, p.x, p.y, p.w, p.h, 6, 6);
  return c;
}
function makeFoe(o, W, minion = false) {
  const sp = o.asset === "enemy" ? W.enemy : FOES[o.asset] ? o.asset : W.enemy, F = FOES[sp];
  const [x, y, w, h] = o.r, pb = o.patrolBounds || {}, act = o.activation || {};
  const atk = { ...(o.attack || {}) };
  if (sp === "drone") atk.type = "tir";
  return { type: "foe", sp, F, x, y, w, h, vx: 0, vy: 0, face: x > 240 ? -1 : 1, alive: true, hp: F.hp, beh: o.behavior || "patrouille", minion,
    pb: { x: pb.x ?? x - 24, w: pb.width ?? w + 48, y: pb.y ?? y, h: pb.height ?? h }, homeX: x, homeY: y,
    wake: act.delaySeconds || 0, tele: act.attackTelegraphSeconds || atk.windupSeconds || 0.6, st: "wait", t: 0, cd: 0.8 + Math.random() * 0.8,
    atk, hurtT: 0, animT: Math.random() * 2, stunT: 0, aim: null, dive: null };
}
function makeBig(o, W) {
  const id = W.boss, B = BIG[id], [x, y, w, h] = o.r;
  const rules = W.rooms[W.rooms.length - 1].rules || {};
  const th = (rules.boss && rules.boss.phaseThresholds) || (id === "singe_roi_pirate" ? [0.5] : [0.65, 0.3]);
  const hp = Math.max(4, Math.round(B.hp * df().bossHp));
  const bottom = o.anchor ? o.anchor.y : y + h, cx = o.anchor ? o.anchor.x : x + w / 2;
  return { type: "bigboss", id, B, name: B.name, atlas: "boss_" + id, x: cx - B.w / 2, y: bottom - B.h, w: B.w, h: B.h, vx: 0, vy: 0, face: -1,
    hp, maxHp: hp, mus: Math.floor(Math.random() * 6), phase: 1, th, st: "intro", t: 1.8, at: 0, inv: 0, flashT: 0, alive: true, dying: false, mi: 0, stunT: 0, onGround: false,
    pose: "idle", shots: 0, target: null, hoverX: cx, spawnT: 0 };
}
// Charge une salle de la nouvelle campagne (restart : on recommence la même salle, sans annonce)
function loadCampRoom(wi, ri, opts = {}) {
  mode = "camp"; camp.wi = wi; camp.ri = ri;
  lvl = buildRoom(wi, ri);
  terrainCanvas = null; terrainFor = null;
  const W = CWORLDS[wi], d = df();
  players = makePlayers(!!chal);   // programmes de lavage : en solo
  enemies = lvl.foeSpawns.map((o, i) => { const e = makeFoe(o, W); e.var = foeVariant(`${lvl.R.id}:${i}`); return e; });
  if (lvl.bossSpawn) { enemies.push(makeBig(lvl.bossSpawn, W)); audio.sfx("boss_intro"); audio.sfx("sig_" + W.boss); }
  pickups = []; lasers = []; parts = []; ghosts = []; fxs = [];
  roomTime = 0; hintT = 0; deathT = 0; doorOpen = false; campTrans = null; mach = null; campFade = opts.fadeIn ? 1 : 0;
  lvl.lastSafe = { x: lvl.start.x, y: lvl.start.y };
  getImg(lvl.R.bg);
  const nx = W.rooms[ri + 1] || (CWORLDS[wi + 1] && CWORLDS[wi + 1].rooms[0]); if (nx) getImg(nx.bg);   // fond suivant en avance
  // arrivée par la machine temporelle dans un nouveau monde
  arrival = opts.arrive ? { t: 0, mx: lvl.start.x + 5 + 30, done: false } : null;
  if (arrival) for (const p of players) { p.hidden = true; p.vx = p.vy = 0; }
  setTimeFx(false, false);
  state = "play";
  lvl.hurt = false;   // touché dans cette salle (défi Délicat, boss sans dégâts)
  if (!opts.restart && !chal && !rush && !pluie) { setCampResume(wi, ri); emit("visit", { wid: W.id }); }
  if (pluie) pluieSetup();
  if (rush) rushApply(opts.restart);
  if (!opts.restart) speakCampRoom();
  if (ri === 0 && !opts.restart) hintT = 0;
}
function startCampWorld(wi) {
  curWorld = wi; runTime = 0; deaths = 0; msg = null; spokenRoom = -1; audio.sfx("start");
  const r = campResume(wi);
  camp.ckpt = 0; camp.fromStart = r === 0;
  if (r > 0) camp.ckpt = r;
  loadCampRoom(wi, r);
  if (r > 0) msg = { text: `On reprend à la salle ${r + 1}`, t: 2.5 };
}
function campHints() {
  const R = campRoom(), list = CAMP_HINTS[R.id] || [];
  return list.map(h => h === "UP" ? say("Flèche du haut devant la porte pour sortir", "▲ devant la porte pour sortir", "{JUMP} devant la porte pour sortir")
    : (df().id === "doom" && h === "POWER") ? "Mode Doom : pas de pouvoir, pas de pitié" : hintText(h).replace("les robots", "les ennemis")).filter(Boolean);
}
function speakCampRoom() {
  const W = CWORLDS[camp.wi], R = campRoom(), bits = [];
  if (camp.ri === 0) bits.push(`Monde ${camp.wi + 1} : ${W.name}.`);
  if (lvl.bossSpawn) bits.push(`Attention, voici ${BIG[W.boss].name} !`);
  bits.push(...campHints().map(h => /[.!?]$/.test(h) ? h : h + "."));
  voice.say(bits.join(" "), true);
}

/* ---------------- Nouvelle campagne : collisions ---------------- */
function rectSolidAt(x, y) {
  if (x < 0 || x >= (lvl.width || VW)) return true;   // lvl.width : pièces plus larges que l'écran (laverie)
  for (const s of lvl.solids) if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return true;
  return false;
}
// Un point sur lequel on peut se tenir (sol, plateforme ou bloc)
function supportAt(x, y) {
  if (!lvl.json) return tileAt(x, y) !== 0;
  if (rectSolidAt(x, y)) return x >= 0 && x < (lvl.width || VW);
  for (const s of lvl.plats) if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return true;
  for (const s of lvl.blocks) if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return true;
  return false;
}
// Le joueur est-il sur une plateforme traversable (pour descendre) ?
function onOneWay(p) {
  if (!lvl.json) return tileAt(p.x + 5, p.y + p.h + 1) === 2;
  const b = p.y + p.h;
  return lvl.plats.some(s => p.x + p.w > s.x && p.x < s.x + s.w && Math.abs(b - s.y) < 1.5) && !lvl.solids.some(s => p.x + p.w > s.x && p.x < s.x + s.w && Math.abs(b - s.y) < 1.5);
}
function moveBodyJ(e, dt) {
  e.blockedX = false;
  e.x += e.vx * dt;
  if (e.x < 0) { e.x = 0; e.blockedX = e.vx < 0; }
  const RW = lvl.width || VW;
  if (e.x + e.w > RW) { e.x = RW - e.w; e.blockedX = e.vx > 0; }
  for (const s of lvl.solids) if (ov(e, s)) {
    if (e.vx > 0 || (e.vx === 0 && e.x + e.w / 2 < s.x + s.w / 2)) e.x = s.x - e.w; else e.x = s.x + s.w;
    e.blockedX = true;
  }
  e.onGround = false;
  const prevBottom = e.y + e.h, prevTop = e.y;
  e.y += e.vy * dt;
  if (e.vy >= 0) {
    let land = null;
    const test = (s) => { if (e.x + e.w > s.x && e.x < s.x + s.w && prevBottom <= s.y + 0.5 && e.y + e.h >= s.y && (land === null || s.y < land)) land = s.y; };
    for (const s of lvl.solids) test(s);
    if (!(e.dropT > 0)) { for (const s of lvl.plats) test(s); }
    for (const s of lvl.blocks) test(s);
    if (land !== null) { e.y = land - e.h; e.vy = 0; e.onGround = true; }
  } else {
    for (const s of lvl.solids) if (ov(e, s) && prevTop >= s.y + s.h - 0.5) { e.y = s.y + s.h; e.vy = 0; }
  }
}
// Blocs posés par un pouvoir dans l'ancienne aventure (grille) : on s'y pose aussi
function landOnBlocks(e, prevBottom) {
  if (!lvl || !lvl.blocks || !lvl.blocks.length || e.vy < 0) return;
  for (const s of lvl.blocks) if (e.x + e.w > s.x && e.x < s.x + s.w && prevBottom <= s.y + 0.5 && e.y + e.h >= s.y) { e.y = s.y - e.h; e.vy = 0; e.onGround = true; }
}
function groundAhead(e) { const fx = e.face > 0 ? e.x + e.w + 2 : e.x - 2; return supportAt(fx, e.y + e.h + 2); }
const hidden = p => !!(p && p.powerOn && powerOf(p.C) && powerOf(p.C).invisible);

/* ---------------- Nouvelle campagne : effets ---------------- */
// Effet animé d'un atlas fx_… : fps, loop (durée life en boucle) ; sinon supprimé après sa dernière image
// opts.anim : animation de l'atlas à jouer (play par défaut)
function addFx(aid, x, y, opts = {}) {
  const A = ATL[aid]; if (!A) return null;
  const an = A.anims[opts.anim || "play"] || [0, 1], n = an[1], fps = opts.fps || 12;
  const f = { aid, a0: an[0], x, y, t: 0, fps, n, life: opts.life || n / fps, loop: !!opts.life, face: opts.face || 1, alpha: opts.alpha ?? 1, scale: opts.scale || 1, follow: opts.follow || null, under: !!opts.under };
  fxs.push(f); return f;
}
function updateFx(dt) {
  for (const f of fxs) { f.t += dt; if (f.follow) { f.x = f.follow.x + f.follow.w / 2; f.y = f.follow.y + f.follow.h / 2; } }
  fxs = fxs.filter(f => f.t < f.life);
}
function drawFxList(under) {
  for (const f of fxs) {
    if (f.under !== under) continue;
    const k = f.loop ? Math.floor(f.t * f.fps) % f.n : Math.min(f.n - 1, Math.floor(f.t * f.fps));
    const fade = f.loop ? Math.min(1, (f.life - f.t) * 4) : 1;
    drawFrame(f.aid, f.a0 + k, f.x, f.y, f.face, f.alpha * fade, f.scale);
  }
}

/* ---------------- Nouvelle campagne : ennemis ---------------- */
const windMul = () => ({ facile: 1.35, normal: 1, doom: 0.75 })[df().id] || 1;
const attackers = () => enemies.filter(e => e.alive && e.type === "foe" && (e.st === "windup" || e.st === "active")).length;
function updateFoe(e, dt) {
  const F = e.F, p = targetOf(e);
  e.animT += dt; e.hurtT = Math.max(0, e.hurtT - dt);
  if (e.stunT > 0 || e.st === "wait") {
    if (e.stunT > 0) e.stunT -= dt; else { e.wake -= dt; if (e.wake <= 0) e.st = "patrol"; }
    if (F.ground) { e.vx = 0; e.vy = Math.min(e.vy + 1500 * dt, 600); moveBody(e, dt); }
    return;
  }
  const dx = p.x + 5 - (e.x + e.w / 2), dy = p.y + 16 - (e.y + e.h / 2), can = !p.dead && !hidden(p) && !p.hidden;
  e.cd -= dt;
  if (F.ground) groundFoe(e, dt, dx, dy, can); else flyFoe(e, dt, p, dx, dy, can);
  if (F.contact === "always" || (F.contact === "attack" && e.st === "active")) touchPlayers(e, e.x + e.w / 2);
  if (e.y > VH + 30) e.alive = false;
}
function foeAtkBox(e) {
  const r = e.atk.type === "bond_et_sabre" ? 22 : (e.atk.rangePixels || 28);
  return { x: e.face > 0 ? e.x + e.w : e.x - r, y: e.y + 2, w: r, h: e.h - 2 };
}
function groundFoe(e, dt, dx, dy, can) {
  const F = e.F, A = e.atk, sp = F.speed * df().eSpeed;
  e.vy = Math.min(e.vy + 1500 * dt, 600);
  if (e.st === "patrol") {
    const range = A.rangePixels || 0, lunge = e.beh === "bond_annonce" || e.beh === "charge_annoncee";
    const sameLevel = Math.abs(dy) < 26, reach = range + (lunge ? 36 : 4) + e.w / 2;
    if (range && can && sameLevel && Math.abs(dx) <= reach && e.cd <= 0 && attackers() < MAX_ATTACKERS && e.onGround) {
      e.st = "windup"; e.t = (A.windupSeconds || e.tele) * windMul(); e.face = Math.sign(dx) || e.face; e.vx = 0; audio.sfx("aim");
    } else if (e.beh === "garde") {
      e.vx = 0; if (can && Math.abs(dx) < 160 && Math.abs(dy) < 40) e.face = Math.sign(dx) || e.face;
    } else {
      const lo = e.pb.x, hi = e.pb.x + e.pb.w - e.w;
      if (hi - lo < 4) e.vx = 0;
      else {
        if (e.x <= lo) e.face = 1; else if (e.x >= hi) e.face = -1;
        e.vx = e.face * sp * (e.beh === "marche_lente" ? 0.7 : 1);
        if (e.onGround && !groundAhead(e)) { e.face *= -1; e.vx = 0; }
      }
    }
  } else if (e.st === "windup") {
    e.vx = 0; e.t -= dt;
    if (e.t <= 0) {
      e.st = "active"; e.t = A.activeSeconds || 0.2; audio.sfx("slash");
      if (A.type === "charge_courte") e.vx = e.face * (A.rangePixels || 56) / (A.activeSeconds || 0.4);
      else if (A.type === "bond_et_sabre") { e.vy = -250; e.vx = e.face * ((A.rangePixels || 40) + 12) / 0.4; }
    }
  } else if (e.st === "active") {
    e.t -= dt;
    if (A.type === "sabre" || A.type === "bond_et_sabre") { const box = foeAtkBox(e); for (const q of players) if (!q.dead && !q.hidden && ov(box, q)) hurtPlayer(q, e.x + e.w / 2); }
    if (A.type === "charge_courte" && (!groundAhead(e) || e.blockedX)) e.vx = 0;
    if (e.t <= 0 && (e.onGround || A.type !== "bond_et_sabre")) { e.st = "recover"; e.t = (A.recoverySeconds || 0.8); e.vx = 0; }
  } else if (e.st === "recover") {
    e.vx = 0; e.t -= dt;
    if (e.t <= 0) { e.st = "patrol"; e.cd = 0.4 + Math.random() * 0.6; }
  }
  if (e.st === "active" && A.type === "bond_et_sabre" && !e.onGround) {
    // en plein bond : ne pas sauter dans un trou
    const fx = e.x + e.w / 2 + e.vx * 0.15; if (!supportAt(fx, 242) && !lvl.plats.some(s => fx >= s.x && fx < s.x + s.w)) e.vx *= 0.5;
  }
  moveBody(e, dt);
  if (e.blockedX && e.st === "patrol") e.face *= -1;
}
function lineClear(ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 8);
  for (let i = 1; i < n; i++) if (rectSolidAt(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false;
  return true;
}
function fireBolt(x, y, tx, ty, opts = {}) {
  const a = Math.atan2(ty - y, tx - x), s = (opts.speed || 160) * df().laser;
  const w = opts.w || 8, h = opts.h || 4;
  lasers.push({ kind: opts.kind || "bolt", x: x - w / 2, y: y - h / 2, w, h, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: opts.g || 0,
    owner: "enemy", alive: true, color: opts.color || "#ff2d6a", noReflect: !!opts.noReflect, spin: 0 });
}
function flyFoe(e, dt, p, dx, dy, can) {
  const F = e.F, A = e.atk, sp = F.speed * df().eSpeed, dist = Math.hypot(dx, dy);
  const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
  // drone hors de portée d'un saut : quand le héros passe dessous, il descend un moment à hauteur de saut (jamais de blocage)
  if (e.sp === "drone") { if (can && Math.abs(dx) < 70 && dy > 70) e.dipT = 3; else if (e.dipT > 0) e.dipT -= dt; }
  const lowY = y0 => e.dipT > 0 ? Math.max(y0, p.y - 44) : y0;
  const patrolMove = () => {
    if (e.beh === "horizontal_patrol" || e.beh === "vol_horizontal") {
      const lo = e.pb.x, hi = e.pb.x + Math.max(e.pb.w, e.w) - e.w;
      if (hi - lo > 4) { if (e.x <= lo) e.face = 1; else if (e.x >= hi) e.face = -1; e.x += e.face * sp * dt; }
      e.y += (lowY(e.pb.y) + Math.sin(e.animT * 2.2) * 4 - e.y) * Math.min(1, dt * 3);
    } else {
      e.x += (e.homeX - e.x) * Math.min(1, dt * 2);
      e.y += (lowY(e.homeY) + Math.sin(e.animT * 2) * 5 - e.y) * Math.min(1, dt * 3);
      if (can && dist < 220) e.face = Math.sign(dx) || e.face;
    }
  };
  if (e.sp === "drone") {
    if (e.st === "patrol") {
      patrolMove();
      if (can && dist < 220) e.face = Math.sign(dx) || e.face;
      if (can && dist < 270 && e.cd <= 0 && attackers() < MAX_ATTACKERS && lineClear(ecx, ecy, p.x + 5, p.y + 16)) {
        e.st = "windup"; e.t = e.tele * windMul(); e.aim = { x: p.x + 5, y: p.y + 16 }; audio.sfx("aim");
      }
    } else if (e.st === "windup") {
      e.t -= dt; e.aim.x += (p.x + 5 - e.aim.x) * Math.min(1, dt * 3); e.aim.y += (p.y + 16 - e.aim.y) * Math.min(1, dt * 3);
      e.face = Math.sign(e.aim.x - ecx) || e.face;
      if (e.t <= 0) { e.st = "active"; e.t = 0.18; fireBolt(ecx + e.face * 10, ecy + 2, e.aim.x, e.aim.y, { kind: "bolt", w: 10, h: 3 }); audio.sfx("laser"); }
    } else if (e.st === "active") { e.t -= dt; if (e.t <= 0) { e.st = "recover"; e.t = 0.4; } }
    else { e.t -= dt; patrolMove(); if (e.t <= 0) { e.st = "patrol"; e.cd = df().cd * 1.2 + Math.random() * 0.8; } }
  } else {
    const range = A.rangePixels || 72;
    if (e.st === "patrol") {
      patrolMove();
      if (can && dy > -12 && Math.abs(dx) < range + 24 && dist < range * 1.7 && e.cd <= 0 && attackers() < MAX_ATTACKERS) {
        e.st = "windup"; e.t = (A.windupSeconds || e.tele) * windMul(); e.face = Math.sign(dx) || e.face; audio.sfx("aim");
        e.dive = { x: p.x + 5 - e.w / 2, y: clamp(p.y + 14 - e.h / 2, 16, 236 - e.h) };
      }
    } else if (e.st === "windup") {
      e.t -= dt; e.dive.x += (p.x + 5 - e.w / 2 - e.dive.x) * Math.min(1, dt * 2);
      if (e.t <= 0) {
        e.st = "active"; e.t = A.activeSeconds || 0.35;
        const ddx = e.dive.x - e.x, ddy = e.dive.y - e.y, dd = Math.hypot(ddx, ddy) || 1, s = Math.min(320, dd / e.t);
        e.vx = ddx / dd * s; e.vy = ddy / dd * s;
      }
    } else if (e.st === "active") {
      e.t -= dt; e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.t <= 0) { e.st = "recover"; e.t = A.recoverySeconds || 1; e.vx = e.vy = 0; }
    } else {
      e.t -= dt; e.x += (e.homeX - e.x) * Math.min(1, dt * 2.5); e.y += (e.homeY - e.y) * Math.min(1, dt * 2.5);
      if (e.t <= 0) { e.st = "patrol"; e.cd = 0.6 + Math.random() * 0.8; }
    }
  }
  e.x = clamp(e.x, 0, VW - e.w); e.y = clamp(e.y, 4, 236 - e.h);
}
function foeDefeatFx(kind, cx, cy, big = false) {
  const D = FOE_DEFEATS[kind] || FOE_DEFEATS.etoiles;
  burst(cx, cy, big ? 50 : 22, D.sparks, big ? 260 : 200, big ? 0.9 : 0.5, 200, 1);
  burst(cx, cy, big ? 20 : 8, D.debris, 150, 0.8, 500, 2);
  addFx(D.fx, cx, D.fx === "fx_poussiere" || D.fx === "fx_teleport" || D.fx === "fx_eclaboussure" ? cy + 10 : cy, { fps: 12, scale: big ? 2 : 1 });
}
function damageFoe(e, dmg) {
  if (!e.alive) return;
  e.hp -= dmg; e.hurtT = 0.12;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  if (e.hp > 0) {
    burst(cx, cy, 10, ["#ffffff", e.F.ground ? "#ffb43c" : "#5ef0ff"], 140, 0.3, 200, 1);
    audio.sfx("bosshit"); hitstop = Math.max(hitstop, 0.04);
    if (e.st === "windup") { e.st = "recover"; e.t = 0.5; }
    return;
  }
  e.alive = false;
  foeDefeatFx(e.F.defeat, cx, cy);
  shake = Math.max(shake, 4); hitstop = Math.max(hitstop, 0.05);
  audio.sfx(pickSfx("def_" + e.F.defeat, e.F.defeat === "robot" ? "hit_robot" : "hit_foe")); rumble(80, 0, 0.35);
  emit("foe", { sp: e.sp });
}

/* ---------------- Nouvelle campagne : boss ---------------- */
function bigSpeed(e) { return df().eSpeed * (1 + (e.phase - 1) * 0.18); }
function bigCenter(e) { return [e.x + e.w / 2, e.y + e.h / 2]; }
function bigNext(e) {
  const list = e.B.moves[Math.min(e.phase, e.B.moves.length) - 1];
  const m = list[e.mi++ % list.length];
  const p = targetOf(e), [cx] = bigCenter(e);
  e.face = Math.sign(p.x + 5 - cx) || e.face;
  e.move = m; e.pose = "idle";
  switch (m) {
    case "walk": e.st = "walk"; e.t = 1.2; break;
    case "tired": e.st = "tired"; e.t = 1.6 * windMul(); e.vx = 0; if (!e.toldTired) { e.toldTired = true; msg = { text: `${e.name} s'essouffle : frappe !`, t: 2 }; voice.say(msg.text); } break;
    case "hover": e.st = "hover"; e.t = 1.4; e.hoverX = clamp(p.x + 5 + (Math.random() < 0.5 ? -90 : 90), 50, VW - 50); break;
    case "hop": case "leap": e.st = "prep"; e.t = 0.45 * windMul(); e.pose = "prep"; audio.sfx("aim"); break;
    case "slash": e.st = "prep"; e.t = 0.55 * windMul(); e.pose = "prep"; audio.sfx("aim"); break;
    case "teleport": e.st = "vanish"; e.t = 0.35; addFx("fx_teleport", cx, e.y + e.h); audio.sfx("dash"); break;
    case "summon": {
      const n = enemies.filter(m2 => m2.alive && m2.minion).length;
      if (!e.B.minion || n >= 2) { e.st = "idle"; e.t = 0.3; break; }
      e.st = "prep"; e.t = 0.5; e.pose = "prep"; break;
    }
    case "dive": e.st = "prep"; e.t = 0.55 * windMul(); e.pose = "prep"; e.target = { x: clamp(p.x + 5 - e.w / 2, 10, VW - 10 - e.w), y: 240 - e.h - 2 }; audio.sfx("aim"); break;
    case "rain": case "slam": case "orb": case "orb3": case "orb5": case "burst": case "burst2": case "burst3": case "blades": case "blades3": case "coco":
      e.st = "prep"; e.t = (m === "slam" ? 0.7 : 0.55) * windMul(); e.pose = "prep"; audio.sfx("aim"); break;
    default: e.st = "idle"; e.t = 0.5;
  }
}
function bigFire(e) {
  const p = targetOf(e), [cx, cy] = bigCenter(e), tx = p.x + 5, ty = p.y + 16, col = e.B.color;
  const spread = (n, step, opts) => { const base = Math.atan2(ty - cy, tx - cx); for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * step; fireBolt(cx + e.face * 12, cy, cx + Math.cos(a) * 100, cy + Math.sin(a) * 100, opts); } };
  switch (e.move) {
    case "orb": spread(1, 0, { kind: "orb", w: 8, h: 8, color: col, speed: 130 }); break;
    case "orb3": spread(3, 0.26, { kind: "orb", w: 8, h: 8, color: col, speed: 130 }); break;
    case "orb5": spread(5, 0.22, { kind: "orb", w: 8, h: 8, color: col, speed: 125 }); break;
    case "burst": case "burst2": case "burst3": {
      e.shots = e.move === "burst" ? 3 : e.move === "burst2" ? 3 : 1; e.st = "fire"; e.t = 0; return;
    }
    case "blades": spread(1, 0, { kind: "blade", w: 10, h: 6, color: col, speed: 170 }); break;
    case "blades3": spread(3, 0.2, { kind: "blade", w: 10, h: 6, color: col, speed: 160 }); break;
    case "coco": for (const k of [0.8, 1.15]) { const ddx = tx - cx; lasers.push({ kind: "coco", x: cx - 4, y: e.y + 4, w: 8, h: 8, vx: clamp(ddx * k, -220, 220), vy: -300, g: 700, owner: "enemy", alive: true, color: "#a8743a", spin: 0 }); } break;
  }
  audio.sfx("laser");
}
function bigWaves(e, speed = 170) {
  const gy = e.y + e.h - 10;
  for (const dir of [-1, 1]) lasers.push({ kind: "wave", x: dir > 0 ? e.x + e.w : e.x - 14, y: gy, w: 14, h: 10, vx: dir * speed * df().eSpeed, owner: "enemy", alive: true });
  addFx("fx_poussiere", e.x + e.w / 2, e.y + e.h, { scale: 2 });
  shake = Math.max(shake, 7); audio.sfx("boom"); rumble(200, 0.6, 0.4);
}
function updateBig(e, dt) {
  e.at += dt; e.inv = Math.max(0, e.inv - dt); e.flashT = Math.max(0, e.flashT - dt);
  const B = e.B, sp = bigSpeed(e), p = targetOf(e), [cx] = bigCenter(e);
  const grav = () => { if (!B.fly) { e.vy = Math.min(e.vy + 1500 * dt, 700); moveBody(e, dt); } };
  if (e.dying) { e.t -= dt; e.vx = 0; grav(); if (e.t <= 0) { e.alive = false; if (rush) rushWin(e); else campVictory(e); } return; }
  if (roomLost()) { e.st = "taunt"; e.vx = 0; grav(); return; }
  if (e.st === "intro") { e.t -= dt; e.vx = 0; if (B.fly) e.y += (90 - e.y) * Math.min(1, dt * 1.5); else grav(); if (e.t <= 0) { e.st = "idle"; e.t = 0.6; } return; }
  if (e.st === "transform") { e.t -= dt; e.vx = 0; grav(); if (e.t <= 0) { e.st = "idle"; e.t = 0.4; } return; }
  if (e.stunT > 0) { e.stunT -= dt; e.vx = 0; grav(); return; }
  const pcx = p.x + 5;
  switch (e.st) {
    case "idle": e.vx = 0; e.pose = "idle"; e.t -= dt; if (B.fly) e.y += (88 + Math.sin(e.at * 2) * 8 - e.y) * Math.min(1, dt * 2); if (e.t <= 0) bigNext(e); break;
    case "walk": e.face = Math.sign(pcx - cx) || e.face; e.vx = Math.abs(pcx - cx) > 18 ? e.face * B.speed * sp : 0; e.pose = e.vx ? "move" : "idle"; e.t -= dt; if (e.t <= 0) { e.st = "idle"; e.t = 0.35; } break;
    case "hover": {
      e.pose = "move"; e.t -= dt;
      e.x += (e.hoverX - e.w / 2 - e.x) * Math.min(1, dt * 1.6 * sp); e.y += (84 + Math.sin(e.at * 2.4) * 10 - e.y) * Math.min(1, dt * 2);
      e.face = Math.sign(pcx - cx) || e.face;
      if (e.t <= 0) { e.st = "idle"; e.t = 0.2; }
      break;
    }
    case "prep":
      e.vx = 0; e.t -= dt; e.pose = "prep";
      if (e.move === "dive") e.target.x += (clamp(pcx - e.w / 2, 10, VW - 10 - e.w) - e.target.x) * Math.min(1, dt * 2);
      else e.face = Math.sign(pcx - cx) || e.face;
      if (e.t <= 0) {
        e.pose = "attack"; bossAtkSfx(e, BOSS_ATK_SFX[e.move]);
        if (e.move === "hop" || e.move === "leap") {
          e.st = "air"; e.vy = e.move === "leap" ? -470 : -520; e.vx = clamp((pcx - cx) * 1.25, -210, 210) * Math.min(1.3, sp); e.airT = 0; audio.sfx("jump");
        } else if (e.move === "slash") { e.st = "charge"; e.t = 0.5; e.vx = e.face * 300 * sp; audio.sfx("dash"); }
        else if (e.move === "slam") { e.st = "attack"; e.t = 0.35; bigWaves(e, 170 + (e.phase - 1) * 30); if (e.phase >= 3 && !e.isSecond) e.second = true; e.isSecond = false; }
        else if (e.move === "rain") { e.st = "attack"; e.t = 0.4; const n = 3 + e.phase; for (let i = 0; i < n; i++) e.rocks = (e.rocks || []).concat([{ x: 24 + Math.random() * (VW - 48), t: 0.7 + i * 0.22 }]); audio.sfx("aim"); }
        else if (e.move === "summon") {
          e.st = "attack"; e.t = 0.4;
          const W = CWORLDS[camp.wi], n = e.B.minion === "drone" ? 2 : 2;
          for (let i = 0; i < n; i++) {
            const mx = clamp(cx + (i ? 40 : -40), 20, VW - 40), my = clamp(e.y - 10, 30, 120);
            const m = makeFoe({ asset: e.B.minion, r: [mx, my, e.B.minion === "drone" ? 24 : 20, e.B.minion === "drone" ? 24 : 20], behavior: e.B.minion === "drone" ? "sentry" : "plongeon_annonce",
              activation: { delaySeconds: 0.6, attackTelegraphSeconds: 0.6 }, attack: e.B.minion === "drone" ? {} : { type: "plongeon", rangePixels: 72, windupSeconds: 0.6, activeSeconds: 0.35, recoverySeconds: 1.0 } }, W, true);
            if (enemies.filter(q => q.alive && q.minion).length < 2) { m.var = foeVariant(null); enemies.push(m); addFx("fx_teleport", mx + 10, my + 20); }
          }
        }
        else if (e.move === "dive") { e.st = "dive"; audio.sfx("dash"); }
        else { e.st = "attack"; e.t = 0.3; bigFire(e); }
      }
      break;
    case "air":
      e.airT += dt; e.pose = "attack";
      if (e.onGround && e.airT > 0.15) {
        e.vx = 0; e.st = "idle"; e.t = 0.8 / sp;
        if (e.move === "hop" ? e.phase >= 2 : e.phase >= 2) bigWaves(e, 160); else { shake = Math.max(shake, 5); audio.sfx("boom"); addFx("fx_poussiere", cx, e.y + e.h, { scale: 1.5 }); }
      }
      break;
    case "charge":
      e.t -= dt; e.pose = "attack";
      if (Math.random() < 0.6) parts.push({ x: cx, y: e.y + 10 + Math.random() * e.h * 0.7, vx: -e.face * 30, vy: 0, life: 0.3, max: 0.3, color: B.color, size: 2, grav: 0 });
      if (e.t <= 0 || e.blockedX) { e.vx = 0; e.st = "idle"; e.t = e.blockedX ? 1.0 : 0.6; if (e.blockedX) { shake = 6; audio.sfx("boom"); } }
      break;
    case "vanish":
      e.t -= dt; e.pose = "idle";
      if (e.t <= 0) {
        const side = p.face > 0 ? -1 : 1;
        e.x = clamp(pcx + side * 46 - e.w / 2, 8, VW - 8 - e.w); e.face = -side;
        addFx("fx_teleport", e.x + e.w / 2, e.y + e.h); e.st = "appear"; e.t = 0.3;
      }
      break;
    case "appear": e.t -= dt; if (e.t <= 0) { e.move = "slash"; e.st = "prep"; e.t = 0.35 * windMul(); e.pose = "prep"; audio.sfx("aim"); } break;
    case "fire":
      e.t -= dt; e.pose = "attack";
      if (e.t <= 0) {
        const [fx, fy] = bigCenter(e), tx = pcx, ty = p.y + 16;
        if (e.move === "burst3") { const base = Math.atan2(ty - fy, tx - fx); for (let i = -2; i <= 2; i++) fireBolt(fx, fy, fx + Math.cos(base + i * 0.22) * 100, fy + Math.sin(base + i * 0.22) * 100, { kind: "bolt", w: 10, h: 3, color: "#ff5a3c" }); }
        else if (e.move === "burst2") { for (const o of [-7, 7]) fireBolt(fx, fy + o, tx, ty + o, { kind: "bolt", w: 10, h: 3, color: "#ff5a3c" }); }
        else fireBolt(fx, fy, tx, ty, { kind: "bolt", w: 10, h: 3, color: "#ff5a3c" });
        audio.sfx("laser"); e.shots--; e.t = 0.2;
        if (e.shots <= 0) { e.st = "idle"; e.t = 0.9 / sp; }
      }
      break;
    case "dive": {
      e.pose = "attack";
      const tx = e.target.x, ty = e.target.y, ddx = tx - e.x, ddy = ty - e.y, dd = Math.hypot(ddx, ddy) || 1, s = 300 * sp * dt;
      if (dd <= s) { e.x = tx; e.y = ty; e.st = "low"; e.t = 0.9; shake = 5; addFx("fx_poussiere", e.x + e.w / 2, 240, { scale: 2 }); audio.sfx("boom"); }
      else { e.x += ddx / dd * s; e.y += ddy / dd * s; }
      break;
    }
    case "low": e.t -= dt; e.pose = "idle"; if (e.t <= 0) { e.st = "hover"; e.t = 0.9; e.hoverX = cx; } break;
    case "tired":
      // ouverture : il reste sur place (au sol s'il vole), souffle, puis repart
      e.t -= dt; e.vx = 0; e.pose = "idle";
      if (B.fly) e.y += (240 - e.h - 4 - e.y) * Math.min(1, dt * 4);
      if (Math.random() < dt * 5) parts.push({ x: cx + (Math.random() - 0.5) * e.w, y: e.y + 4, vx: (Math.random() - 0.5) * 20, vy: -30, life: 0.6, max: 0.6, color: "#bff4ff", size: 2, grav: 120 });
      if (e.t <= 0) { e.st = B.fly ? "hover" : "idle"; e.t = 0.5; e.hoverX = cx; }
      break;
    case "attack":
      e.t -= dt; e.vx = 0;
      if (e.t <= 0) {
        if (e.second) { e.second = false; e.isSecond = true; e.st = "prep"; e.t = 0.45; e.pose = "prep"; break; }   // une seule frappe en plus
        e.st = "idle"; e.t = 0.8 / sp;
      }
      break;
  }
  // dégradation : fumée et étincelles de plus en plus nombreuses
  if (e.phase >= 2 && Math.random() < dt * (e.phase >= 3 ? 9 : 4)) {
    const sx = e.x + Math.random() * e.w, sy = e.y + Math.random() * e.h * 0.5;
    parts.push(Math.random() < 0.6 ? { x: sx, y: sy, vx: (Math.random() - 0.5) * 12, vy: -25, life: 0.9, max: 0.9, color: "#5a5070", size: 2, grav: -15 }
      : { x: sx, y: sy, vx: (Math.random() - 0.5) * 80, vy: -60, life: 0.35, max: 0.35, color: B.color, size: 1, grav: 300 });
  }
  // rochers de lave annoncés au sol, puis qui tombent
  if (e.rocks) {
    for (const r of e.rocks) { r.t -= dt; if (r.t <= 0 && !r.fell) { r.fell = true; lasers.push({ kind: "rock", x: r.x - 6, y: -12, w: 12, h: 12, vx: 0, vy: 260, g: 300, owner: "enemy", alive: true, noReflect: true, color: "#ff6a1a", spin: 0 }); } }
    e.rocks = e.rocks.filter(r => !r.fell);
    if (!e.rocks.length) e.rocks = null;
  }
  if (!B.fly || e.st === "dive" || e.st === "low") { if (!B.fly) { e.vy = Math.min(e.vy + 1500 * dt, 700); moveBody(e, dt); } }
  e.x = clamp(e.x, 4, VW - 4 - e.w);
  if (!["intro", "transform", "vanish", "taunt", "tired"].includes(e.st)) touchPlayers(e, e.x + e.w / 2);
}
function damageBig(e, dmg) {
  if (!e.alive || e.dying || e.inv > 0 || e.st === "intro" || e.st === "transform" || e.st === "vanish") return;
  e.hp -= dmg; e.inv = 0.4; e.flashT = 0.12;
  const [cx, cy] = bigCenter(e);
  burst(cx, cy, 16, ["#ffffff", e.B.color, ch().color], 200, 0.45, 150, 1);
  addFx("fx_impact", cx, cy);
  shake = Math.max(shake, 4); hitstop = Math.max(hitstop, 0.05); audio.sfx("bosshit"); rumble(90, 0.2, 0.4);
  if (e.hp <= 0) {
    e.hp = 0; e.dying = true; e.st = "dying"; e.t = 1.4; e.at = 0; e.vx = 0;
    // fin des attaques dangereuses : projectiles, renforts et pièges s'arrêtent tout de suite
    lasers = lasers.filter(l => l.owner === "player");
    for (const m of enemies) if (m !== e && m.alive) { m.alive = false; foeDefeatFx(m.F ? m.F.defeat : "etoiles", m.x + m.w / 2, m.y + m.h / 2); }
    for (const h of lvl.hazards) h.disabled = true;
    e.rocks = null;
    shake = 12; flash = 0.25; hitstop = 0.25; bossDefeatSfx(BOSS_IDS.indexOf(e.id)); audio.sfx("victory"); rumble(700, 1, 1);
    msg = { text: `${e.name} est vaincu !`, t: 3 }; voice.say(msg.text, true);
    if (!chal && !rush) emit("boss", { id: e.id, noDamage: !lvl.hurt, doom: df().id === "doom" });
    return;
  }
  const frac = e.hp / e.maxHp, ph = 1 + e.th.filter(t => frac <= t).length;
  if (ph > e.phase) {
    e.phase = ph; e.st = "transform"; e.t = 0.8; e.at = 0; e.inv = 0.8; e.vx = 0; e.rocks = null;
    flash = 0.15; shake = 8; audio.sfx("transform");
    msg = { text: BOSS_PHASE_SAY[ph] ? BOSS_PHASE_SAY[ph](e) : `${e.name} se transforme !`, t: 1.8 };
    if (!chal) emit("phase", { id: e.id, n: ph });
  }
}
function campVictory(e) {
  const W = CWORLDS[camp.wi];
  foeDefeatFx(e.B.defeat, e.x + e.w / 2, e.y + e.h / 2, true);
  // récompense : fragment d'énergie temporelle (jauge pleine), sauvegarde du monde débloqué
  for (const p of players) { p.gauge = 1; if (!p.dead && p.hp < df().hp) p.hp++; }
  addFx("fx_collecte", players[0].x + 5, players[0].y + 10, { scale: 2 });
  const prev = campBest(camp.wi);
  best = camp.fromStart ? { time: runTime, deaths, isNew: !prev || runTime < prev.time } : null;
  if (best && best.isNew) setBest(campBestKey(camp.wi), { time: runTime, deaths });
  // médaille du chrono (monde fait d'une traite) : annoncée si elle est meilleure que la précédente
  const md = best ? medalOf(W.id, runTime) : 0, mPrev = prev ? medalOf(W.id, prev.time) : 0;
  if (md > mPrev) { toast(MEDAL_LABELS[md], `${W.name} en ${fmtTime(runTime)}`, "badge", MEDAL_COLS[md]); emit("medal", { m: md }); }
  setCampResume(camp.wi, 0);
  const P = PIECES[W.id];
  msg = { text: P ? `Tu as récupéré ${P.name} !` : "Fragment d'énergie temporelle !", t: 3 };
  audio.sfx("piece");
  if (lvl.sock && lvl.sock.type === "apres_boss" && lvl.sock.hidden) { lvl.sock.hidden = false; lvl.sock.pop = 0.4; burst(lvl.sock.x + 6, lvl.sock.y + 6, 20, ["#7dffb0", "#ffffff"], 120, 0.6, 0, 1); }
  emit("roomDone", { room: campRoom().id, char: ch().id, doom: df().id === "doom" });
  emit("worldDone", { wi: camp.wi, duo: players.length > 1 });
  for (const x of lvl.exits) x.locked = false;
  const mx = lvl.exits.find(x => x.kind === "machine");
  if (mx) startMachine(mx.x + mx.w / 2, mx.y + mx.h);
  else voice.say("La porte est ouverte !");
  audio.sfx("door");
  void W;
}

/* ---------------- Nouvelle campagne : machine temporelle ---------------- */
// États : locked → activating → ready → entering → departing → loading → arriving → finished.
// Tout avance avec le temps du jeu (la pause arrête la séquence) ; machStarted empêche un double départ.
const MACH_HOLE = { x: -5, y: -33, r: 15 };   // centre et rayon du hublot par rapport au pied de la machine (réglés à l'œil)
function startMachine(x, y) { mach = { st: "activating", t: 0, x, y, started: false, first: !SAVE.flags.machineSeen }; audio.sfx("machine"); }
function machNear(p) { return mach && Math.abs(p.x + 5 - mach.x) < 40 && p.y + p.h > mach.y - 50 && p.y < mach.y; }
function updateMachine(dt) {
  if (!mach) return;
  mach.t += dt;
  const p = mach.who || players[0];   // le héros qui est entré dans la machine
  if (mach.st === "activating" && mach.t > 0.9) { mach.st = "ready"; mach.t = 0; }
  else if (mach.st === "entering") {
    const k = Math.min(1, mach.t / 0.7);
    p.x = mach.ex + (mach.x + MACH_HOLE.x - 5 - mach.ex) * k; p.y = mach.ey + (mach.y + MACH_HOLE.y - 16 - mach.ey) * k;
    p.vx = p.vy = 0;
    if (Math.random() < 0.5) parts.push({ x: mach.x + MACH_HOLE.x + (Math.random() - 0.5) * 30, y: mach.y + MACH_HOLE.y + (Math.random() - 0.5) * 30, vx: 0, vy: 0, life: 0.3, max: 0.3, color: "#c86eff", size: 1, grav: 0 });
    for (const q of players) if (q !== p && !q.hidden) { q.hidden = true; addFx("fx_teleport", q.x + 5, q.y + q.h); }   // à deux : le copain saute aussi dans la machine
    if (mach.t >= 0.7) { mach.st = "departing"; mach.t = 0; p.hidden = true; audio.sfx("spin"); SAVE.flags.machineSeen = 1; saveGame(); }
  } else if (mach.st === "departing") {
    shake = Math.max(shake, 2);
    if (Math.random() < 0.5) burst(mach.x + (Math.random() - 0.5) * 40, mach.y - Math.random() * 50, 2, MACHINE_FX[CWORLDS[camp.wi].id], 80, 0.4, 100, 1);
    campFade = Math.max(0, (mach.t - 0.5) / 0.4);
    const skip = hit("Enter", "GA", "GStart", ...K.attack) && mach.t > 0.2;
    if (mach.t >= 0.9 || skip) { mach.st = "loading"; mach.t = 0; campFade = 1; }
  } else if (mach.st === "loading") {
    if (!mach.started) { mach.started = true; campNextWorld(); }
  }
}
function machInteract(p) {
  if (!mach || mach.st !== "ready" || !p.onGround || p.inv > 1 || p.dead || !machNear(p)) return false;
  mach.st = "entering"; mach.t = 0; mach.who = p; mach.ex = p.x; mach.ey = p.y; p.atkT = -1; p.dashT = 0;
  for (const q of players) q.powerOn = false;
  setTimeFx(false, false); audio.sfx(pickSfx("mach_door", "door"));   // le hublot s'ouvre
  return true;
}
// Après le boss, la machine ramène le héros à la laverie (la pièce y est remise en place)
function campNextWorld() { enterHub({ arrive: true }); }
function updateArrival(dt) {
  if (!arrival || arrival.done) return;
  arrival.t += dt;
  campFade = Math.max(0, 1 - arrival.t / 0.4);
  for (const p of players) if (arrival.t >= 1.0 + p.idx * 0.15 && p.hidden) { p.hidden = false; p.inv = 0.6; addFx("fx_teleport", p.x + 5, p.y + p.h); burst(p.x + 5, p.y + 16, 16, MACHINE_FX[CWORLDS[camp.wi].id], 140, 0.5, 100, 1); audio.sfx("heal"); }
  if (arrival.t >= 1.4) arrival.done = true;
}
function drawMachineAt(x, y, st, t) { drawMachineSkin(x, y, st, t); }
// Personnage aspiré : entre le vortex (dans le dessin de la machine) et le rebord du hublot (redessiné par-dessus)
function drawEntering(p) {
  const k = Math.min(1, mach.t / 0.7), sc = 1 - 0.85 * k, rot = k * Math.PI;
  const hx = mach.x + MACH_HOLE.x, hy = mach.y + MACH_HOLE.y;
  ctx.save();
  if (k > 0.35) { ctx.beginPath(); ctx.arc(hx, hy, MACH_HOLE.r, 0, Math.PI * 2); ctx.clip(); }
  ctx.translate(p.x + 5, p.y + 16); ctx.rotate(rot); ctx.scale(sc, sc);
  drawChar(p.C, playerFrame(p), 0, 16, p.face);
  ctx.restore();
  // rebord du hublot simplifié et chaussette rouge coincée, devant le personnage
  ctx.strokeStyle = "#8a8070"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, MACH_HOLE.r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#3a3430"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx, hy, MACH_HOLE.r + 1.5, 0, Math.PI * 2); ctx.stroke();
  const sw = Math.sin(time * 18) * 2 * k;
  R(Math.round(hx + 6 + sw), Math.round(hy + 6), 3, 7, "#d02a2a"); R(Math.round(hx + 6 + sw), Math.round(hy + 12), 5, 2, "#d02a2a");
}

/* ---------------- Nouvelle campagne : mise à jour ---------------- */
function hazardPhase(h) {
  if (h.kind === "pit") return "active";
  if (h.disabled || !h.enabled) return "off";
  if (h.arena) return h.phase;
  if (!h.cycle) return "active";
  const c = h.cycle, t = (roomTime + h.offset) % h.period;
  if (t < c.safeSeconds) return "safe";
  if (t < c.safeSeconds + c.telegraphSeconds) return "tele";
  return "active";
}
function updateArena(dt) {
  const A = lvl.arena, b = enemies.find(e => e.type === "bigboss"); if (!A || !b) return;
  const pud = lvl.hazards.filter(h => h.arena && !h.disabled);
  for (const h of lvl.hazards) if (h.arena && h !== A.cur) h.phase = "safe";
  if (!b.alive || b.dying || b.phase < 2 || !pud.length || b.st === "intro") { if (A.cur) A.cur.phase = "safe"; A.cur = null; return; }
  A.t -= dt;
  if (A.cur) {
    if (A.cur.phase === "tele" && A.t <= 0) { A.cur.phase = "active"; A.t = 0.8; audio.sfx("zap"); }
    else if (A.cur.phase === "active" && A.t <= 0) { A.cur.phase = "safe"; A.cur = null; A.t = b.phase >= 3 ? 0.6 : 1.6; }
  } else if (A.t <= 0) {
    // jamais les deux flaques à la fois ; en phase 3 elles alternent
    A.side = b.phase >= 3 ? (A.side + 1) % pud.length : Math.floor(Math.random() * pud.length);
    A.cur = pud[A.side % pud.length]; A.cur.phase = "tele"; A.t = 0.6; audio.sfx("aim");
  }
}
function campFall(p) {
  if (!pluie) hurtPlayer(p, p.x);   // pluie de chaussettes : un trou ne coûte pas de cœur
  if (p.dead) return;
  const s = lvl.lastSafe || lvl.start;
  p.x = s.x; p.y = s.y; p.vx = p.vy = 0; p.inv = Math.max(p.inv, 1.1);
  addFx("fx_teleport", p.x + 5, p.y + p.h);
}
// Coup de sabre ou dash sur les objets destructibles (une seule fois par coup)
function campAttack(p, box, src) {
  for (const d of lvl.dest) {
    if (!d.alive || !ov(box, d)) continue;
    const seen = src === "dash" ? p.dashHits : p.hitList; if (seen.has(d)) continue; seen.add(d);
    d.hp--; d.hurtT = 0.12; audio.sfx("bosshit");
    burst(d.x + d.w / 2, d.y + d.h / 2, 10, ["#ffffff", "#ffb43c", "#c89a5a"], 140, 0.4, 400, 2);
    addFx("fx_impact", d.x + d.w / 2, d.y + d.h / 2);
    if (d.hp <= 0) breakDest(d); else d.state = 1;
  }
}
function breakDest(d) {
  d.alive = false; d.state = 2;
  const od = d.o.onDestroyed || {};
  shake = Math.max(shake, 4); audio.sfx("boom");
  addFx("fx_explosion", d.x + d.w / 2, d.y + d.h / 2, { scale: 0.8 });
  burst(d.x + d.w / 2, d.y + d.h / 2, 18, ["#c89a5a", "#7a4a24", "#ffffff"], 180, 0.8, 600, 2);
  // la récompense sort de l'objet, à hauteur du personnage (on la ramasse en passant)
  if (od.reward) lvl.items.push({ x: d.x + d.w / 2 - 8, y: d.y + d.h - 18, w: 16, h: 16, kind: od.reward, alive: true, pop: 0.25 });
  if (lvl.sock && lvl.sock.crate === d.o.id && lvl.sock.hidden) { lvl.sock.hidden = false; lvl.sock.pop = 0.3; if (!lvl.sock.found) msg = { text: "Une chaussette était cachée là !", t: 2 }; }
  if (od.playEffect === "hydrantWater") d.jet = 2.5;
  if (od.createsWaterAt) { const h = lvl.hazards.find(x => x.id === od.createsWaterAt); if (h) { h.enabled = true; h.offset = -roomTime; msg = { text: "L'eau coule… attention aux étincelles !", t: 2 }; } }
  if (od.disableHazard) { const h = lvl.hazards.find(x => x.id === od.disableHazard); if (h) { h.disabled = true; h.phase = "safe"; msg = { text: "Le générateur est coupé : la flaque est sans danger", t: 2.5 }; } }
}
function collectItem(p, it) {
  it.alive = false;
  addFx("fx_collecte", it.x + it.w / 2, it.y + it.h / 2);
  audio.sfx("heal");
  if (it.kind === "energy") { p.gauge = Math.min(1, p.gauge + 0.5); msg = { text: powerOf(p.C) && df().power ? "+ Énergie !" : "Énergie !", t: 1.2 }; }
  else if (it.kind === "heart") { if (p.hp < df().hp) p.hp++; msg = { text: "+1 cœur", t: 1.2 }; }
}
// Chaussettes, chaussettes dorées, objets de quête et rideaux des recoins secrets
const touching = it => players.some(p => !p.dead && !p.hidden && ov(p, it));
function updateCollectibles(dt) {
  const k = lvl.sock;
  if (k && k.alive && !k.hidden) {
    k.t += dt; if (k.pop > 0) { k.pop -= dt; k.y -= 40 * dt; }
    else if (touching(k)) {
      if (k.target) { k.alive = false; collectFx(k, "#c86eff"); chalWin(); }
      else if (!k.found) {
        k.alive = false; collectFx(k, "#7dffb0"); audio.sfx("sock"); rumble(120, 0.2, 0.5);
        emit("sock", { room: campRoom().id });
        const W = CWORLDS[camp.wi];
        msg = { text: `Chaussette puante trouvée ! ${socksInWorld(W.id)}/${socksWorldTotal(W.id)}`, t: 2.2 }; voice.say("Chaussette trouvée !");
      }
    }
  }
  for (const g of lvl.gold) {
    if (!g.alive) continue; g.t += dt;
    if (touching(g)) { g.alive = false; collectFx(g, "#ffd23c"); audio.sfx("sock_bonus"); emit("gold", { id: g.id }); msg = { text: "Chaussette dorée ! Un chemin secret !", t: 2.4 }; }
  }
  for (const q of lvl.qitems) {
    if (!q.alive) continue; q.t += dt;
    const near = players.some(p => Math.hypot(p.x + 5 - (q.x + 6), p.y + 16 - (q.y + 6)) < 70);
    q.vis = q.shadow ? Math.min(1, Math.max(0.12, (q.vis || 0.12) + (near ? dt * 2 : -dt))) : 1;
    if (touching(q)) {
      q.alive = false; collectFx(q, "#ff8ab0"); audio.sfx("quest_item"); emit("questItem", { quest: q.quest, id: q.id });
      const Q = QUEST_BY_ID[q.quest], st = SAVE.quests[q.quest], n = Q.goal.items ? Q.goal.items.filter(i => st.items && st.items[i]).length : 1;
      msg = { text: Q.goal.items && Q.goal.items.length > 1 ? `Objet de quête : ${n}/${Q.goal.items.length}` : "Objet de quête trouvé !", t: 2.2 };
    }
  }
  for (const c of lvl.covers) { const inside = players.some(p => !p.dead && ov(p, c)); c.a += ((inside ? 0.18 : 1) - c.a) * Math.min(1, dt * 6); }
}
const hasAtlas = aid => !!(ATL[aid] && atlasImg(aid));
function collectFx(it, col) {
  addFx("fx_collecte", it.x + it.w / 2, it.y + it.h / 2, { scale: 1.3 });
  if (hasAtlas("chaussette") && (it.type || it.requires)) addFx(it.requires && hasAtlas("chaussette_bonus") ? "chaussette_bonus" : "chaussette", it.x + it.w / 2, it.y + it.h / 2, { anim: "collecte", fps: 14 });
  burst(it.x + it.w / 2, it.y + it.h / 2, 18, [col, "#ffffff", "#fccc28"], 140, 0.6, 0, 1);
  flash = Math.max(flash, 0.05);
}
// Chaussette puante (provisoire, dessinée par le code tant que l'atlas « chaussette » n'existe pas) : x, y = centre
// o.s : taille (icônes de l'interface : plus petites que la chaussette des salles)
function drawSock(x, y, o = {}) {
  const aid = o.gold ? "chaussette_bonus" : "chaussette", sc = o.s ?? 1;
  if (hasAtlas(aid) && !o.striped && !o.ghost) { drawFrame(aid, animFrame(aid, "flotte", time + (o.t || 0), 8), x, y, 1, o.alpha ?? 1, sc); return; }
  if (hasAtlas("chaussette") && o.ghost) { drawFrame("chaussette", ATL.chaussette.anims.flotte[0], x, y, 1, (o.alpha ?? 1) * 0.7, sc); return; }
  if (o.striped && hasAtlas("objets_quete")) { drawFrame("objets_quete", 0, x, y, 1, o.alpha ?? 1); return; }
  const a = o.alpha ?? 1, body = o.gold ? "#ffd23c" : o.ghost ? "#8a80a8" : "#f4f0ff", band = o.gold ? "#ff8a3c" : o.striped ? "#d02a2a" : "#ff4f8a";
  ctx.globalAlpha = a;
  const X = Math.round(x - 5), Y = Math.round(y - 6);
  R(X - 1, Y - 1, 7, 10, "#0e0a1a"); R(X - 1, Y + 7, 11, 5, "#0e0a1a");
  R(X, Y, 5, 9, body); R(X, Y + 8, 9, 3, body); R(X + 7, Y + 8, 2, 2, o.ghost ? body : "#c8c0e0");
  R(X, Y, 5, 2, band); if (o.striped) { R(X, Y + 4, 5, 1, band); R(X, Y + 7, 5, 1, band); }
  if (!o.ghost && !o.gold) {
    // odeur : petites vagues vertes qui montent
    const k = (time * 1.5 + (o.t || 0)) % 1;
    ctx.globalAlpha = a * (1 - k) * 0.9;
    for (const dx of [-3, 3]) for (let i = 0; i < 3; i++) R(Math.round(x + dx + Math.sin(time * 6 + i + dx) * 1.5), Math.round(Y - 3 - k * 8 - i * 2), 1, 2, "#8aff6a");
  }
  if (o.gold) { ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(time * 8)); R(X + 6, Y - 3, 1, 3, "#ffffff"); R(X + 5, Y - 2, 3, 1, "#ffffff"); }
  ctx.globalAlpha = 1;
}
function drawCollectibles(behind) {
  const k = lvl.sock;
  if (k && k.alive && !k.hidden && (k.type === "decor") === behind) {
    const bob = Math.sin(time * 3 + (k.t || 0)) * 1.5, cx = k.x + 6, cy = k.y + 6 + bob;
    if (k.found) drawSock(cx, cy, { ghost: true, alpha: 0.35 });   // déjà trouvée : discrète
    else if (k.target) { const a = chalTargetAlpha(k); if (a > 0.01) { ctx.globalAlpha = a * 0.3; R(Math.round(k.x - 2), Math.round(k.y - 2 + bob), 16, 16, "#c86eff"); ctx.globalAlpha = 1; drawSock(cx, cy, { t: k.t, alpha: a }); } }
    else {
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(time * 5); R(Math.round(k.x - 2), Math.round(k.y - 2 + bob), 16, 16, "#7dffb0"); ctx.globalAlpha = 1;
      drawSock(cx, cy, { t: k.t });
    }
  }
  if (behind) return;
  for (const g of lvl.gold) if (g.alive) { ctx.globalAlpha = 0.2 + 0.15 * Math.sin(time * 6); R(g.x - 3, g.y - 3, 18, 18, "#ffd23c"); ctx.globalAlpha = 1; drawSock(g.x + 6, g.y + 6 + Math.sin(time * 3) * 2, { gold: true }); }
  for (const q of lvl.qitems) {
    if (!q.alive) continue;
    const y = q.y + 6 + Math.sin(time * 3 + q.x) * 1.5;
    ctx.globalAlpha = (q.vis ?? 1) * (0.2 + 0.12 * Math.sin(time * 5)); R(q.x - 2, Math.round(y - 8), 16, 16, "#ff8ab0"); ctx.globalAlpha = 1;
    if (q.kind === "chaussette_rayee") drawSock(q.x + 6, y, { striped: true, alpha: q.vis ?? 1 });
    else if (hasAtlas("objets_quete")) drawFrame("objets_quete", 1, q.x + 6, y, 1, q.vis ?? 1);
    else { ctx.globalAlpha = q.vis ?? 1; R(q.x, Math.round(y - 3), 12, 5, "#0e0a1a"); R(q.x + 1, Math.round(y - 2), 10, 3, "#7a3aff"); R(q.x + 4, Math.round(y - 3), 3, 6, "#c86eff"); ctx.globalAlpha = 1; }
  }
}
// Rideaux des recoins secrets : par-dessus le joueur, ils s'effacent quand on entre dedans
function drawCovers() {
  const col = MACHINE_FX[CWORLDS[camp.wi].id];
  for (const c of lvl.covers) {
    ctx.globalAlpha = c.a;
    R(c.x, c.y, c.w, c.h, "#0e0a1a"); R(c.x + 1, c.y + 1, c.w - 2, c.h - 2, "#1e1630");
    for (let yy = c.y + 4; yy < c.y + c.h - 2; yy += 6) R(c.x + 2 + ((yy / 6) % 2) * 3, yy, c.w - 7, 1, "#2a2244");
    // petite étincelle de temps en temps : un indice pour les curieux
    if (Math.floor(time * 2 + c.x) % 7 === 0) { ctx.globalAlpha = c.a * 0.8; R(c.x + c.w / 2, c.y + c.h - 10, 2, 2, col[0]); }
    ctx.globalAlpha = 1;
  }
}
// Haut devant une porte ou la machine : entre (le saut est alors ignoré)
function campTryInteract(p) {
  if (!lvl.json || lvl.leaving || p.dead || p.hidden) return false;
  const want = hit(...p.input.jump) || hit(...(p.input.act || []));
  if (!want || !p.onGround) return false;
  if (machInteract(p)) return true;
  if (mach && mach.st === "activating" && machNear(p)) return true;   // la machine s'ouvre : on attend sans sauter
  for (const x of lvl.exits) {
    if (x.kind === "door" && x.locked && x.foeLock && ov(p, x) && !(x.shake > 0)) {
      const n = enemies.filter(e => e.alive && e.type === "foe").length;
      x.shake = 0.35; audio.sfx("nope"); msg = { text: n > 1 ? `Encore ${n} ennemis !` : "Encore un ennemi !", t: 1.6 };
    }
    if (x.kind !== "door" || x.locked || !ov(p, x)) continue;
    lvl.leaving = true; campTrans = { kind: "door", ex: x, t: 0 }; x.st = "half"; x.t = 0;
    p.vx = 0; p.atkT = -1; audio.sfx("door"); setTimeFx(false, false);
    return true;
  }
  return false;
}
function updateCampTransition(dt) {
  if (!campTrans) return;
  const T0 = campTrans; T0.t += dt;
  const x = T0.ex, p = players[0];
  if (T0.kind === "door") {
    if (T0.t < 0.15) x.st = "half"; else x.st = "open";
    if (T0.t > 0.3) for (const q of players) { q.x += (x.x + x.w / 2 - 5 - q.x) * Math.min(1, dt * 10); q.fade = Math.max(0, 1 - (T0.t - 0.3) / 0.25); }
    campFade = Math.max(0, (T0.t - 0.45) / 0.25);
    if (T0.t >= 0.7 && !T0.done) {
      T0.done = true;
      const W = CWORLDS[camp.wi];
      if (lvl.bossSpawn) {
        // porte du boss franchie : la machine temporelle attend derrière
        campTrans = null; lvl.leaving = false; x.st = "closed";
        const m = lvl.machine;
        const mx = m ? m.x + m.w / 2 : 392, my = m ? m.y + m.h : 240;
        for (const q of players) { q.fade = 1; q.x = mx - 44 - q.idx * 18; q.y = 240 - q.h; q.face = 1; q.vx = q.vy = 0; if (q.dead) coopRevive(q, true); }
        startMachine(mx, my); campFade = 1; mach.fadeIn = 0.4;
        for (const e of lvl.exits) e.locked = true;   // la porte se referme derrière
        return;
      }
      if (!chal) emit("roomDone", { room: campRoom().id, char: ch().id, doom: df().id === "doom" });
      if (chal && chalRoomDone()) return;
      const ni = x.next ? roomIndex(camp.wi, x.next) : camp.ri + 1;
      if (ni >= 0 && ni < W.rooms.length) loadCampRoom(camp.wi, ni, { fadeIn: true });
    }
  }
}
// Portes des salles normales : le cadenas saute quand le dernier ennemi a disparu
function updateDoorLocks(dt) {
  for (const x of lvl.exits) { if (x.shake > 0) x.shake -= dt; if (x.pop > 0) x.pop -= dt; }
  if (!lvl.exits.some(x => x.foeLock && x.locked) || enemies.some(e => e.alive && e.type === "foe")) return;
  for (const x of lvl.exits) {
    if (!x.foeLock || !x.locked) continue;
    x.locked = false; x.pop = 1;
    burst(x.draw.x + x.draw.w / 2, x.draw.y + 15, 18, ["#ffd23c", "#ffffff", "#7dffb0"], 110, 0.6, 0, 1);
  }
  audio.sfx("unlock"); msg = { text: "Sortie ouverte !", t: 2 }; voice.say("La porte est ouverte !");
}
function updateCamp(dt) {
  updateDoorLocks(dt);
  // ennemis et boss
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.type === "foe") updateFoe(e, dt); else if (e.type === "bigboss") updateBig(e, dt);
  }
  updateArena(dt);
  // pièges
  for (const h of lvl.hazards) {
    const ph = hazardPhase(h);
    if (ph === "tele" && h.lastPh !== "tele" && h.kind !== "pit" && Math.abs(h.x - players[0].x) < 140) audio.sfx("aim");
    h.lastPh = ph;
    if (ph !== "active") continue;
    for (const p of players) if (!p.dead && !p.hidden && ov(p, h)) { if (h.kind === "pit") campFall(p); else hurtPlayer(p, h.x + h.w / 2); }
  }
  // objets
  for (const d of lvl.dest) { d.hurtT = Math.max(0, d.hurtT - dt); if (d.jet > 0) d.jet -= dt; }
  for (const it of lvl.items) {
    if (!it.alive) continue;
    if (it.pop > 0) { it.pop -= dt; it.y -= 30 * dt; continue; }
    for (const p of players) if (!p.dead && !p.hidden && ov(p, it)) { collectItem(p, it); break; }
  }
  updateCollectibles(dt);
  const ck = lvl.ckpt;
  if (ck) {
    ck.t += dt;
    if (!ck.on && players.some(p => !p.dead && ov(p, ck))) {
      ck.on = true; ck.t = 0;
      const ni = roomIndex(camp.wi, ck.o.saveNextLevel);
      camp.ckpt = Math.max(camp.ckpt, ni >= 0 ? ni : camp.ri); setCampResume(camp.wi, camp.ckpt);
      msg = { text: "Point de sauvegarde !", t: 1.8 }; audio.sfx("door");
      burst(ck.x + 8, ck.y + 6, 16, ["#5ef0ff", "#ffffff"], 120, 0.5, 0, 1);
    }
  }
  // blocs posés (pouvoir) : ils disparaissent au bout de quelques secondes
  for (const b of lvl.blocks) b.t -= dt;
  lvl.blocks = lvl.blocks.filter(b => b.t > 0);
  // position sûre pour revenir après une chute
  const p = players[0];
  if (p.onGround && !p.dead && !p.hidden && supportAt(p.x - 4, p.y + p.h + 1) && supportAt(p.x + p.w + 4, p.y + p.h + 1)
    && !lvl.hazards.some(h => h.kind === "pit" && Math.abs(h.x + h.w / 2 - (p.x + 5)) < h.w)) lvl.lastSafe = { x: p.x, y: p.y };
  updateMachine(dt); updateArrival(dt); updateCampTransition(dt); updateRush(dt); updateFx(dt);
  if (mach && mach.fadeIn > 0) { mach.fadeIn -= dt; campFade = Math.max(0, mach.fadeIn / 0.4); }
  if (!campTrans && !mach && !arrival && campFade > 0) campFade = Math.max(0, campFade - dt * 3);
  if (arrival && arrival.done && !campTrans && campFade > 0) campFade = Math.max(0, campFade - dt * 3);
}
// Les commandes sont-elles bloquées par une cinématique (porte, machine, arrivée) ?
function campLocked(p) {
  if (!lvl || !lvl.json) return false;
  if (campTrans) return true;
  if (mach && ["entering", "departing", "loading"].includes(mach.st)) return true;
  if (arrival && !arrival.done) return true;
  return !!p.hidden;
}

/* ---------------- Nouvelle campagne : dessin ---------------- */
function drawCampHazard(h) {
  const ph = hazardPhase(h), cx = h.x + h.w / 2, by = h.y + h.h;
  if (h.kind === "pit") { const g = ctx.createLinearGradient(0, h.y - 16, 0, VH); g.addColorStop(0, "rgba(6,3,16,0)"); g.addColorStop(1, "rgba(6,3,16,0.9)"); ctx.fillStyle = g; ctx.fillRect(h.x, 240, h.w, 32); return; }
  if (ph === "off" && !(h.kind === "water" && h.enabled)) { if (h.kind === "water" && h.disabled) drawFrame("fx_flaque", animFrame("fx_flaque", "play", time, 3), cx, h.y + 4, 1, 0.6); return; }
  const blink = ph === "tele" && Math.floor(time * 10) % 2;
  const idx = ph === "active" ? 2 : ph === "tele" ? 1 : 0;
  const trap = (name) => drawFrame("pieges", ATL.pieges.anims[name][0] + idx, cx, by);
  switch (h.kind) {
    case "electricity":
      trap("cable");
      if (ph === "active") drawFrame("fx_electricite", animFrame("fx_electricite", "play", time, 12), cx, h.y + 6);
      break;
    case "laser":
      ctx.save(); ctx.beginPath(); ctx.rect(h.x - 8, h.y - 10, h.w + 16, h.h + 10); ctx.clip(); trap("laser"); ctx.restore();
      if (ph === "active") { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 40); R(h.x, h.y + 2, h.w, h.h - 4, "#5ef0ff"); ctx.globalAlpha = 1; R(h.x + 2, h.y + h.h / 2 - 1, h.w - 4, 2, "#ffffff"); }
      break;
    case "floor_blade": trap("spikes"); break;
    case "hot_vent": trap("lava"); if (ph === "active") drawFrame("fx_flammes", animFrame("fx_flammes", "play", time, 10), cx, by - 4, 1, 0.9); break;
    case "wave_surge":
      drawFrame("fx_flaque", animFrame("fx_flaque", "play", time, 4), cx, by - 3, 1, ph === "safe" ? 0.5 : 0.9, 0.5);
      if (ph === "active") drawFrame("fx_eclaboussure", animFrame("fx_eclaboussure", "play", time, 10), cx, by);
      break;
    case "crystal_pulse":
      if (ph !== "safe") drawFrame("fx_cristal", animFrame("fx_cristal", "play", time, ph === "active" ? 12 : 4), cx, h.y + 8, 1, ph === "active" ? 1 : 0.45);
      R(h.x + 4, by - 3, h.w - 8, 3, ph === "active" ? "#ff4fd8" : "#6a2a6a");
      break;
    case "water": {
      drawFrame("fx_flaque", animFrame("fx_flaque", "play", time, 3), cx, h.y + 4);
      if (ph === "active") { ctx.save(); ctx.beginPath(); ctx.rect(h.x - 4, h.y - 14, h.w + 8, h.h + 16); ctx.clip(); for (let k = -1; k <= 1; k++) drawFrame("fx_electricite", animFrame("fx_electricite", "play", time + k * 0.13, 12), cx + k * 18, h.y + 2); ctx.restore(); }
      else if (ph === "tele" && blink) { for (let k = 0; k < 4; k++) R(h.x + 6 + ((k * 13 + Math.floor(time * 20)) % (h.w - 10)), h.y - 2 - (k % 2) * 3, 2, 2, "#fff3a0"); }
      break;
    }
  }
  if (ph === "tele" && blink) { text("!", cx, h.y - 12, 12, "#ffd23c", "center", "#ff3b5c"); }
}
function drawCampObjects() {
  drawCollectibles(true);
  for (const d of lvl.decor) drawFrame(d.sprite, 0, d.x + d.w / 2, d.y + d.h);
  // sorties
  for (const x of lvl.exits) {
    if (x.kind !== "door") continue;
    const aid = CWORLDS[camp.wi].door, A = ATL[aid];
    const fr = A.anims[x.st] ? A.anims[x.st][0] : 0, jx = x.shake > 0 ? Math.round(Math.sin(x.shake * 60) * 1.5) : 0;
    if (x.foeLock && x.locked) glow(ctx, x.draw.x + x.draw.w / 2, x.draw.y + 18, 20, "255,59,92", 0.12 + 0.05 * Math.sin(time * 3));
    if (x.pop > 0) glow(ctx, x.draw.x + x.draw.w / 2, x.draw.y + 18, 26, "125,255,176", 0.35 * x.pop);
    drawFrame(aid, fr, x.draw.x + x.draw.w / 2 + jx, x.draw.y + x.draw.h);
    if (x.locked) { const lx = x.draw.x + x.draw.w / 2 + jx; R(lx - 4, x.draw.y + 14, 8, 7, "#ff3b5c"); R(lx - 3, x.draw.y + 10, 1, 4, "#ff3b5c"); R(lx + 2, x.draw.y + 10, 1, 4, "#ff3b5c"); R(lx - 2, x.draw.y + 9, 4, 1, "#ff3b5c"); R(lx - 1, x.draw.y + 16, 2, 3, "#2a1030"); }
  }
  if (lvl.ckpt) { const c = lvl.ckpt, a = ATL.interactifs.anims.checkpoint[0]; drawFrame("interactifs", c.on ? a + 1 + Math.floor(time * 4) % 2 : a, c.x + c.w / 2, c.y + c.h); }
  for (const d of lvl.dest) {
    const a = ATL.destructibles.anims[d.type] ? ATL.destructibles.anims[d.type][0] : 0;
    const jx = d.hurtT > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
    drawFrame("destructibles", a + d.state, d.x + d.w / 2 + jx, d.y + d.h, 1, d.alive ? 1 : 0.85);
    if (d.jet > 0) drawFrame("fx_jet_eau", animFrame("fx_jet_eau", "play", time, 10), d.x + d.w / 2 + 14, d.y + d.h - 4);
  }
  for (const h of lvl.hazards) drawCampHazard(h);
  for (const b of lvl.blocks) {
    if (b.t < 1 && Math.floor(time * 10) % 2) continue;
    R(b.x, b.y, b.w, b.h, "#0e0a1a"); R(b.x + 1, b.y + 1, b.w - 2, b.h - 2, "#8a5a2a"); R(b.x + 1, b.y + 1, b.w - 2, 4, "#4fbf3a");
    for (let i = 0; i < 4; i++) R(b.x + 2 + ((i * 7) % (b.w - 4)), b.y + 6 + (i * 5) % (b.h - 8), 2, 2, "#6a4220"); R(b.x + 3, b.y + 2, 3, 1, "#8aff6a");
  }
  drawCollectibles(false);
  for (const it of lvl.items) {
    if (!it.alive) continue;
    const an = ATL.bonus.anims[it.kind] || ATL.bonus.anims.energy;
    const y = it.y + it.h / 2 + Math.sin(time * 4 + it.x) * 2;
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 6); R(Math.round(it.x - 1), Math.round(y - 9), it.w + 2, 18, "#5ef0ff"); ctx.globalAlpha = 1;
    drawFrame("bonus", an[0] + Math.floor(time * 6) % an[1], it.x + it.w / 2, y);
  }
  if (mach) {
    const hide = mach.st === "loading";
    if (!hide) drawMachineAt(mach.x, mach.y, mach.st, mach.t);
  }
  if (arrival) drawMachineAt(arrival.mx, lvl.start.y + 32, arrival.done ? "idle" : arrival.t < 0.9 ? "activating" : "ready", arrival.done ? arrival.t : arrival.t);
}
function foeFrame(e) {
  const A = ATL[e.F.atlas], an = A.anims;
  if (e.hurtT > 0) return an.hurt[0];
  if (e.st === "windup") return Math.floor(time * 12) % 2 ? an.attack[0] : an.idle[0];
  if (e.st === "active") return an.attack[0];
  if (e.st === "wait" || e.stunT > 0) return an.idle[0];
  const moving = Math.abs(e.vx) > 1 || !e.F.ground;
  return moving ? an.move[0] + Math.floor(e.animT * 8) % 2 : an.idle[0];
}
function drawFoe(e) {
  const A = ATL[e.F.atlas]; if (!A) return;
  const fr = foeFrame(e), grounded = e.F.ground;
  const ax = e.x + e.w / 2, ay = grounded ? e.y + e.h : e.y + e.h / 2;
  const wake = e.st === "wait" ? 0.55 + 0.25 * Math.sin(time * 6) : 1;
  // les planches regardent vers la droite : retournées quand l'ennemi regarde à gauche ; variante : couleur et effet
  const cols = (FOE_DEFEATS[e.F.defeat] || FOE_DEFEATS.etoiles).sparks, pal = e.var && e.var.pal;
  drawFoeFx(e.var, e.x + e.w / 2, e.y + e.h / 2, e.w, e.h, cols, true);
  drawFrame(e.F.atlas, fr, ax, ay, e.face, wake, 1, pal);
  if (e.hurtT > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; drawFrame(e.F.atlas, fr, ax, ay, e.face, 0.6, 1, pal); ctx.restore(); }
  drawFoeFx(e.var, e.x + e.w / 2, e.y + e.h / 2, e.w, e.h, cols, false);
  if (e.st === "windup") {
    if (e.sp === "drone" && e.aim) {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time * 40);
      const sx = e.x + e.w / 2, sy = e.y + e.h / 2, dx = e.aim.x - sx, dy = e.aim.y - sy, d = Math.hypot(dx, dy) || 1;
      for (let i = 10; i < Math.min(d, 260); i += 6) R(Math.round(sx + dx / d * i), Math.round(sy + dy / d * i), 2, 1, "#ff2d6a");
      ctx.globalAlpha = 1;
    } else text("!", e.x + e.w / 2, e.y - 8, 10, "#ffd23c", "center", "#ff3b5c");
  }
  if (e.stunT > 0) stunStars(e);
}
function stunStars(e) { for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1; R(Math.round(e.x + e.w / 2 + Math.cos(a) * 10), Math.round(e.y - 4 + Math.sin(a) * 3), 2, 2, "#fccc28"); } }
function bigFrame(e) {
  const A = ATL[e.atlas], an = A.anims, row = an["P" + Math.min(e.phase, e.th.length + 1)] || an.P1;
  if (e.st === "intro") return animFrame(e.atlas, "appear", 1.8 - e.t, 5 / 1.8, false);
  if (e.st === "transform") {
    const k = Math.floor(e.at / 0.16);
    if (e.phase === 2) return an.transform[0] + Math.min(4, k);
    return k < 4 ? an.transform[0] + k : row[0];
  }
  if (e.dying) {
    if (e.phase >= 3 || !an.death) return row[0] + 5;
    return animFrame(e.atlas, "death", e.at, 5 / 1.2, false);
  }
  if (e.st === "taunt") return animFrame(e.atlas, "victory", e.at, 6);
  if (e.flashT > 0) return row[0] + 5;
  if (e.pose === "prep") return row[0] + 3;
  if (e.pose === "attack") return row[0] + 4;
  if (e.pose === "move" || Math.abs(e.vx) > 1) return row[0] + 1 + Math.floor(e.at * 7) % 2;
  return row[0];
}
function drawBig(e) {
  const fr = bigFrame(e), x = e.x + e.w / 2, y = e.y + e.h;
  let a = 1;
  if (e.st === "vanish") a = Math.max(0, e.t / 0.35);
  if (e.st === "appear") a = 1 - Math.max(0, e.t / 0.3);
  if (e.dying && (e.phase >= 3 || !ATL[e.atlas].anims.death)) a = Math.max(0, e.t / 1.4);
  // les planches de boss regardent vers la droite
  drawFrame(e.atlas, fr, x, y, e.face, a);
  if (e.flashT > 0 || (e.st === "transform" && Math.floor(e.at * 12) % 2)) { ctx.save(); ctx.globalCompositeOperation = "lighter"; drawFrame(e.atlas, fr, x, y, e.face, 0.55); ctx.restore(); }
  if (e.st === "prep" && e.move === "dive" && e.target) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 30); R(Math.round(e.target.x), 238, e.w, 2, "#ff2d6a"); ctx.globalAlpha = 1; }
  if (e.st === "prep" && e.move === "slash") { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 40); for (let i = 0; i < 160; i += 6) R(Math.round(e.face > 0 ? e.x + e.w + i : e.x - i), Math.round(e.y + e.h * 0.55), 3, 1, "#ff2d6a"); ctx.globalAlpha = 1; }
  if (e.rocks) for (const r of e.rocks) if (Math.floor(time * 10) % 2) { R(Math.round(r.x - 7), 237, 14, 3, "#ff6a1a"); text("!", r.x, 226, 9, "#ffd23c", "center"); }
  if (e.stunT > 0 || e.st === "tired") stunStars(e);
  if (e.st === "tired") { const k = (time * 1.2) % 1; ctx.globalAlpha = 1 - k; text("z", e.x + e.w - 2 + k * 6, e.y - 6 - k * 10, 8, "#bff4ff", "center"); ctx.globalAlpha = 1; }
}
function drawCampProjectile(l) {
  const x = Math.round(l.x), y = Math.round(l.y), cx = l.x + l.w / 2, cy = l.y + l.h / 2;
  const col = l.owner === "player" ? (l.color2 || ch().color) : l.color || "#ff2d6a";
  if (l.kind === "bolt" || l.kind === "blade") {
    const a = Math.atan2(l.vy || 0, l.vx);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    if (l.kind === "bolt" && l.owner === "enemy" && col === "#ff2d6a") drawFrame("fx_laser", animFrame("fx_laser", "play", time, 12), 0, 0, 1, 1, 0.6);
    else { ctx.globalAlpha = 0.4; R(-l.w / 2 - 2, -l.h / 2 - 2, l.w + 4, l.h + 4, col); ctx.globalAlpha = 1; R(-l.w / 2, -l.h / 2, l.w, l.h, col); R(-l.w / 2 + 2, -1, l.w - 4, 1, "#ffffff"); }
    ctx.restore(); return;
  }
  if (l.kind === "orb" || l.kind === "coco" || l.kind === "rock") {
    const r = l.w / 2;
    ctx.globalAlpha = 0.35; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = l.kind === "rock" ? "#3a2a2a" : col; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = l.kind === "rock" ? "#ff8a3c" : "#ffffff"; R(Math.round(cx - 2), Math.round(cy - 2), 2, 2, ctx.fillStyle);
    return;
  }
  R(x, y, l.w, l.h, col);
}
// Commande « entrer » affichée au-dessus d'une porte ou de la machine quand on peut s'en servir
function drawPrompt(x, y, label) {
  const s = say("Haut :", "▲", "{JUMP} :") + " " + label;
  ctx.font = `700 8px ${FONT}`; const w = ctx.measureText(s).width + 10;
  const by = y + Math.sin(time * 5) * 1.5;
  R(Math.round(x - w / 2), Math.round(by - 7), Math.round(w), 13, "rgba(10,6,24,0.85)");
  ctx.strokeStyle = "#7dffb0"; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x - w / 2) + 0.5, Math.round(by - 7) + 0.5, Math.round(w) - 1, 12);
  text(s, x, by, 8, "#7dffb0", "center");
}
function drawCampPlayer(p) {
  if (p.dead || p.hidden) return;
  if (mach && mach.st === "entering") { if (p === (mach.who || players[0])) drawEntering(p); return; }
  if (p.inv > 0 && Math.floor(time * 20) % 2 && p.inv < 1.25 && !(arrival && !arrival.done)) return;
  let a = p.fade ?? 1;
  if (hidden(p)) a *= 0.35 + 0.1 * Math.sin(time * 12);
  const fr = playerFrame(p), x = p.x + 5, y = p.y + p.h;
  if (p.dashT > 0) for (let i = 1; i <= 3; i++) drawChar(p.C, fr, x - p.face * i * 9, y, p.face, 1, 0.18 * (4 - i) * a);
  drawChar(p.C, fr, x, y, p.face, 1, a);
  drawHeldWeapon(p, fr, x, y, a);
  drawSlash(p);
  if (p.powerOn && powerOf(p.C) && powerOf(p.C).shield) drawFrame("fx_bouclier", animFrame("fx_bouclier", "play", time, 8), x, p.y + 16, 1, 0.8, 0.9);
}
function drawCampWorld() {
  const bg = getImg(lvl.R.bg);
  if (bg.ok) ctx.drawImage(bg.img, 0, 0, VW, VH); else R(0, 0, VW, VH, "#120a22");
  R(0, 0, VW, VH, "rgba(8,4,20,0.16)");   // le décor reste plus sombre que les éléments jouables
  if (terrainFor !== lvl) { terrainCanvas = makeTerrain(lvl); if (terrainCanvas) terrainFor = lvl; }
  if (terrainCanvas) ctx.drawImage(terrainCanvas, 0, 0);
  else { ctx.fillStyle = "#2a2440"; for (const s of lvl.solids) ctx.fillRect(s.x, s.y, s.w, s.h); for (const s of lvl.plats) ctx.fillRect(s.x, s.y, s.w, 6); }
  drawCampObjects();
  drawFxList(true);
  for (const e of enemies) if (e.alive && e.type === "foe") drawFoe(e);
  for (const e of enemies) if (e.alive && e.type === "bigboss") drawBig(e);
  for (const l of lasers) {
    if (l.kind === "wave") {
      const x = Math.round(l.x), y = Math.round(l.y);
      ctx.globalAlpha = 0.35; R(x - 2, y - 2, l.w + 4, l.h + 2, "#c0c8e0"); ctx.globalAlpha = 1;
      for (let i = 0; i < l.w; i += 2) R(x + i, y + l.h - 2 - Math.abs(Math.sin(time * 30 + i)) * (l.h - 2), 2, 2 + Math.abs(Math.sin(time * 30 + i)) * (l.h - 2), i % 4 ? "#ffffff" : "#9fb0d8");
    } else if (l.wpn) drawWProj(l); else drawCampProjectile(l);
  }
  drawBubbled();
  if (pluie) drawPluie();
  drawGhosts(); for (const p of players) drawCampPlayer(p);
  drawBubbles(); drawCoopTags();
  drawCovers();
  drawArenaFx();
  // invites « entrer »
  const p = players[0];
  if (!p.dead && !campLocked(p)) {
    for (const x of lvl.exits) if (x.kind === "door" && !x.locked && ov(p, x)) drawPrompt(x.draw.x + x.draw.w / 2, x.draw.y - 10, "Entrer");
    if (mach && mach.st === "ready" && machNear(p)) drawPrompt(mach.x, mach.y - 74, "Entrer dans la machine");
  }
  drawFxList(false);
  for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(Math.round(q.x), Math.round(q.y), q.size, q.size, q.color); }
  ctx.globalAlpha = 1;
}
function drawHeartIcon(x, y, full) { drawFrame("hud", ATL.hud.anims[full ? "heart" : "heart_empty"][0], x, y, 1, 1, 0.75); }
function drawCampHUD() {
  const d = df(), C = ch(), W = CWORLDS[camp.wi], R0 = campRoom(), P1 = player1();
  R(0, 0, VW, 16, "rgba(10,6,24,0.7)");
  const accent = MACHINE_FX[W.id][0];
  const tag = pluie ? pluieTag() : rush ? `Boss rush  ${Math.min(rush.i + 1, RUSH_TOTAL)}/${RUSH_TOTAL}` : lvl.bossSpawn ? `${W.name}  BOSS` : `${W.name}  ${camp.ri + 1}/${W.rooms.length - 1}`;
  text(tag, 6, 8, 9, accent);
  ctx.font = `700 9px ${FONT}`; const nw = ctx.measureText(tag).width;
  text(R0.name, 14 + nw, 8, 9, "#e8dcff");
  const nw2 = ctx.measureText(R0.name).width;
  text(fmtTime(rush ? rush.t : runTime), Math.max(VW / 2 + 40, 14 + nw + nw2 + 30), 8, 9, C.ui, "center");
  let hx = VW - (TOUCH && !PAD ? 52 : 8);
  if (d.id === "doom") { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 8); text("☠ DOOM", hx, 8, 9, d.color, "right", d.color); ctx.globalAlpha = 1; }
  else {
    const pw = powerOf(P1.C);
    for (let i = d.hp - 1; i >= 0; i--) { hx -= 10; drawHeartIcon(hx + 4, 8, i < P1.hp); }
    hx -= 8;
    if (pw) {
      const cost = pw.burst || 0, ready = !cost || P1.gauge >= cost;
      R(hx - 44, 5, 44, 6, "#2a1a44"); R(hx - 44, 5, Math.round(44 * P1.gauge), 6, P1.powerOn ? "#ffffff" : ready ? pw.color : hexA(pw.color, 0.45));
      if (cost) for (let k = cost; k < 1; k += cost) R(hx - 44 + Math.round(44 * k), 5, 1, 6, "#0e0a1a");
      text(pw.label, hx - 48, 8, 7, "#b9a6e0", "right");
    }
  }
  const foes = enemies.filter(e => e.alive && e.type === "foe").length;
  if (foes && !lvl.bossSpawn && !pluie) text(`Ennemis : ${foes}`, 6, VH - 8, 8, "#b9a6e0");
  else if (lvl.exits.some(x => x.foeLock)) text("Sortie ouverte !", 6, VH - 8, 8, "#7dffb0");
  // chaussettes du monde (icône pleine si celle de la salle est trouvée)
  if (!chal && !pluie && AJOUTS.socks[R0.id]) {
    const got = !!SAVE.socks[R0.id], sx = 92;
    drawSock(sx, VH - 9, got ? { s: 0.55 } : { ghost: true, alpha: 0.6, s: 0.55 });
    text(`${socksInWorld(W.id)}/${socksWorldTotal(W.id)}`, sx + 9, VH - 8, 8, got ? "#7dffb0" : "#b9a6e0");
  }
  if (chal) drawChalHUD();
  if (specialOf(C) && specialOf(C).button && (!TOUCH || PAD)) { const ready = P1.dashCd <= 0; text(ready ? "Dash prêt" : "Dash…", VW - 6, VH - 8, 8, ready ? C.color : "#5a4a80", "right"); }
  const bs = enemies.find(e => e.type === "bigboss" && (e.alive || e.dying));
  if (bs && bs.alive) {
    if (bs.st === "intro") {
      ctx.globalAlpha = Math.min(1, bs.t * 2);
      R(0, VH / 2 - 30, VW, 48, "rgba(10,6,24,0.75)");
      text("BOSS", VW / 2, VH / 2 - 16, 11, "#ff3b5c", "center", "#ff3b5c");
      text(bs.name, VW / 2, VH / 2 + 4, 20, bs.B.color, "center", bs.B.color);
      ctx.globalAlpha = 1;
    } else {
      const bw = 180, bx = VW / 2 - bw / 2 + 10;
      const pi = Object.keys(BIG).indexOf(bs.id);
      ctx.save(); ctx.beginPath(); ctx.rect(bx - 24, 18, 20, 20); ctx.clip(); drawFrame("portraits_boss", pi, bx - 14, 42, 1, 1, 0.5); ctx.restore();
      text(bs.name, bx + bw / 2, 24, 8, bs.B.color, "center");
      R(bx - 1, 29, bw + 2, 7, "#0e0a1a"); R(bx, 30, bw, 5, "#3a1a2a");
      const f = bs.hp / bs.maxHp;
      R(bx, 30, Math.round(bw * f), 5, bs.phase >= 3 ? "#ff3b5c" : bs.phase === 2 ? "#ffb43c" : bs.B.color); R(bx, 30, Math.round(bw * f), 1, "#ffffff88");
      for (const t of bs.th) R(bx + Math.round(bw * t), 29, 1, 7, "#e8dcff");
      const badge = ATL.hud.anims["P" + Math.min(3, bs.phase)];
      if (badge) drawFrame("hud", badge[0], bx + bw + 12, 32, 1, 1, 0.8);
    }
  }
  if (camp.ri === 0 && hintT < 2.6 && !P1.dead && !(arrival && !arrival.done)) {
    ctx.globalAlpha = Math.min(1, (2.6 - hintT) / 0.6, hintT / 0.3);
    R(0, VH / 2 - 34, VW, 52, "rgba(10,6,24,0.7)");
    text(`Monde ${camp.wi + 1}`, VW / 2, VH / 2 - 20, 10, "#e8dcff", "center");
    text(W.name, VW / 2, VH / 2, 22, accent, "center", accent);
    ctx.globalAlpha = 1;
  }
  const lines = campHints();
  if (lines.length && hintT < 7 && !(bs && bs.alive && bs.st === "intro")) {
    const a = Math.min(1, (7 - hintT) / 1.2), hy = bs ? 22 : 0;
    ctx.globalAlpha = a; ctx.save(); ctx.translate(0, hy);
    R(VW / 2 - 150, 22, 300, lines.length > 1 ? 30 : 18, "rgba(10,6,24,0.75)");
    text(lines[0], VW / 2, 31, 8, "#ffffff", "center");
    if (lines[1]) text(lines[1], VW / 2, 43, 8, accent, "center");
    ctx.restore(); ctx.globalAlpha = 1;
  }
  if (msg && msg.t > 0) { ctx.globalAlpha = Math.min(1, msg.t); text(msg.text, VW / 2, 66, 11, "#7dffb0", "center", "#7dffb0"); ctx.globalAlpha = 1; }
  // résultat du monde pendant le départ de la machine
  if (mach && (mach.st === "departing" || mach.st === "loading") && best !== undefined) {
    const k = Math.min(1, mach.t * 3);
    ctx.globalAlpha = k;
    text(`${W.name} : terminé !`, VW / 2, 110, 16, "#ffffff", "center", accent);
    if (camp.fromStart) text(`Temps : ${fmtTime(runTime)}    Chutes : ${deaths}`, VW / 2, 130, 9, "#e8dcff", "center");
    if (best && best.isNew) text("Nouveau record !", VW / 2, 146, 9, "#fccc28", "center");
    if (mach.st === "departing" && mach.t > 0.2) text(say("Entrée : passer", "", "{A} : passer"), VW / 2, 166, 7, "#b9a6e0", "center");
    ctx.globalAlpha = 1;
  }
  if (campFade > 0) { ctx.globalAlpha = Math.min(1, campFade); R(0, 0, VW, VH, "#0d0820"); ctx.globalAlpha = 1; }
  if (roomLost()) {
    R(0, VH / 2 - 22, VW, 44, "rgba(10,6,24,0.75)");
    text("Raté ! On recommence…", VW / 2, VH / 2 - 4, 16, "#ff4f8a", "center", "#ff4f8a");
    text(df().id === "doom" && doomReset ? (camp.ckpt ? "Retour au drapeau" : "Retour au début du monde") : "La salle redémarre", VW / 2, VH / 2 + 12, 8, "#b9a6e0", "center");
  }
}

// Le décor de l'arène réagit au combat à partir de P2 (lumières, alarme, ombres, braises, pluie, cristaux) ; léger, jamais dangereux
function drawArenaFx() {
  const b = enemies.find(e => e.type === "bigboss" && e.alive && !e.dying); if (!b || b.phase < 2 || b.st === "intro") return;
  const kind = ARENA_FX[CWORLDS[camp.wi].id], k = b.phase >= 3 ? 1 : 0.6;
  switch (kind) {
    case "lumieres": if (Math.floor(time * 7) % 5 === 0) { ctx.globalAlpha = 0.12 * k; R(0, 0, VW, VH, "#000000"); } ctx.globalAlpha = 0.5 * k; for (let i = 0; i < 4; i++) if (Math.random() < 0.3) R(Math.random() * VW, 18 + Math.random() * 10, 2, 2, "#fff3a0"); break;
    case "alarme": ctx.globalAlpha = (0.05 + 0.05 * Math.sin(time * 6)) * k; R(0, 0, VW, VH, "#ff2020"); ctx.globalAlpha = 0.6 * k; R(Math.round(VW / 2 + Math.sin(time * 4) * 200), 16, 6, 3, "#ff3b3b"); break;
    case "ombres": { const g = ctx.createRadialGradient(VW / 2, VH / 2, 120, VW / 2, VH / 2, 300); g.addColorStop(0, "rgba(20,0,40,0)"); g.addColorStop(1, `rgba(20,0,40,${0.35 * k})`); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); break; }
    case "braises": ctx.globalAlpha = 0.07 * k; R(0, 0, VW, VH, "#ff6a1a"); ctx.globalAlpha = 0.8; for (let i = 0; i < 10 * k; i++) { const x = (i * 97 + time * 30) % VW, y = VH - ((time * 40 + i * 37) % VH); R(Math.round(x), Math.round(y), 1, 2, "#ffb43c"); } break;
    case "pluie": ctx.globalAlpha = 0.25 * k; for (let i = 0; i < 30 * k; i++) { const x = (i * 53 + time * 120) % VW, y = (i * 29 + time * 400) % VH; R(Math.round(x), Math.round(y), 1, 5, "#bfe8ff"); } break;
    case "cristaux": ctx.globalAlpha = (0.06 + 0.06 * Math.sin(time * 3)) * k; R(0, 0, VW, VH, "#ff4fd8"); break;
  }
  ctx.globalAlpha = 1;
}

/* ---------------- Nouvelle campagne : fin ---------------- */
// « Retour à la maison » : la machine réparée ramène le héros ; les chaussettes volent comme des confettis.
let winT = 0;
function drawCampWin(rdt) {
  winT += rdt;
  const C = ch(), art = ATL.souvenir_fin && atlasImg("souvenir_fin");
  if (art) {
    // la scène de fin fournie : ses trois vues en boucle 1 → 2 → 3 → 2 (2,4 s chacune, fondu de 1,2 s)
    const order = [0, 1, 2, 1], step = Math.floor(winT / 3.6), into = winT - step * 3.6;
    const cur = order[step % 4], prev = order[(step + 3) % 4], s = VW / ATL.souvenir_fin.cw;
    ctx.imageSmoothingEnabled = true;
    if (into < 1.2 && step > 0 && !reducedMotion.matches) drawFrame("souvenir_fin", prev, VW / 2, VH, 1, 1, s);
    drawFrame("souvenir_fin", reducedMotion.matches ? 0 : cur, VW / 2, VH, 1, step > 0 && !reducedMotion.matches ? Math.min(1, into / 1.2) : 1, s);
    ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
    R(0, 0, VW, 66, "rgba(13,8,32,0.55)");
  } else {
    drawHub();
    const dawn = ctx.createLinearGradient(0, 0, 0, VH); dawn.addColorStop(0, "rgba(255,180,90,0.25)"); dawn.addColorStop(1, "rgba(255,120,200,0.1)");
    ctx.fillStyle = dawn; ctx.fillRect(0, 0, VW, VH);
    R(0, 0, VW, 74, "rgba(13,8,32,0.6)");
  }
  text("Retour à la maison", VW / 2, 26, 22, C.ui, "center", C.ui);
  text(`${C.name} a réparé la machine et rentre enfin chez lui !`, VW / 2, 50, 9, "#e8dcff", "center");
  // chaussettes propres en confettis (la scène fournie a déjà les siennes : on en garde quelques-unes)
  for (let i = 0; i < (art ? 8 : 24); i++) { const k = (winT * 0.4 + i * 0.137) % 1, x = (i * 53 + Math.sin(winT + i) * 20) % VW; if (winT > 1) drawSock(x, -10 + k * 250, { t: i }); }
  if (!art && winT > 1.0) { const k = Math.min(1, (winT - 1.0) / 0.6); drawChar(C, k < 1 ? 18 : Math.floor(time * 5) % 4, 240 - 50 * k, HUB_FLOOR, -1, 1, k); }
  if (art) R(0, VH - 30, VW, 30, "rgba(13,8,32,0.6)");
  if (winT > 2.5) text(`Chaussettes : ${socksCount()}/${socksTotal()}    Cartes : ${CARDS.filter(c => has("card:" + c.id)).length}/${CARDS.length}`, VW / 2, art ? VH - 21 : 92, 9, "#7dffb0", "center");
  text(say("Entrée ou clic pour revenir à la laverie", "Touche l'écran pour revenir à la laverie", "{A} pour revenir à la laverie"), VW / 2, art ? VH - 9 : 182, art ? 8 : 9, "#ffffff", "center");
  if (winT > 1.5 && hit("Enter", "Space", "Mouse0", "Escape", "GA", "GB", "GStart")) enterHub({ msg: "La laverie reste ouverte : il reste des chaussettes à retrouver !" });
}
