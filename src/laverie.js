/* ---------------- Laverie : la scène centrale ---------------- */
// Zone sûre où le héros se promène entre deux mondes. Chaque poste s'utilise avec Haut (▲ en tactile, {JUMP} à la manette)
// quand on est devant, ou d'un clic / d'un toucher dessus. Les dessins sont provisoires (code) tant que les images
// de assets/laverie/ n'existent pas (voir docs/prompt_sprites_chatgpt.md).
// États : "hub" (on se promène), "hubmenu" (menu Échap), plus les écrans de ecrans.js et defis.js (SCREENS).
const SCREENS = {};
const HUB_FLOOR = 240;
let hub = { lvl: null, msg: null, dlg: null, near: null, t: 0, arrive: null, queue: [], machShake: 0 };
// Postes : x = centre au sol. need : condition pour que le poste s'allume (sinon « bientôt »), with lockText.
const STATIONS = [
  { id: "armoire", x: 28, w: 34, h: 58, label: "Vestiaire", open: () => openWardrobe() },
  { id: "album", x: 72, w: 30, h: 36, label: "Collections", open: () => openAlbum() },
  { id: "jukebox", x: 110, w: 30, h: 48, label: "Jukebox", open: () => openJukebox() },
  { id: "souvenirs", x: 186, w: 28, h: 30, label: "Souvenirs", need: { memories: 1 }, lockText: "Ramène une pièce de la machine pour réveiller ses souvenirs", open: () => openMemories() },
  { id: "machine", x: 240, w: 56, h: 64, label: "Machine temporelle", open: () => hubToMachine() },
  { id: "defis", x: 338, w: 40, h: 50, label: "Programmes de lavage", need: { world: 1 }, lockText: "Termine la centrale pour allumer cette machine", open: () => openChallenges() },
  { id: "deco", x: 420, w: 30, h: 40, label: "Décoration", open: () => openDeco() },
  { id: "bulle", x: 460, w: 22, h: 38, label: "Mme Bulle", npc: "bulle" },
];
const stationOn = s => !s.need || testCond(s.need);
// Clients présents : ceux dont la quête est apparue
const hubNpcs = () => QUESTS.filter(q => testCond(q.appear)).map(q => ({ id: q.npc, x: q.x, w: 20, h: 38, label: NPCS[q.npc].name, npc: q.npc, quest: q }));
function hubThings() { return [...STATIONS, ...hubNpcs()]; }

/* ---- Entrée dans la laverie ---- */
// opts.arrive : retour par la machine (après un boss : pièce réparée, souvenir) ; opts.msg : message affiché en arrivant
function enterHub(opts = {}) {
  mode = "camp"; chal = null;
  hub.lvl = { json: true, hub: true, solids: [{ x: -40, y: HUB_FLOOR, w: VW + 80, h: 40 }], plats: [], blocks: [], hazards: [], dest: [], items: [],
    exits: [], decor: [], covers: [], gold: [], qitems: [], sock: null, start: { x: opts.x ?? 214, y: HUB_FLOOR - 32 }, lastSafe: null, W: CWORLDS[0], R: { id: "laverie", bg: "" }, leaving: false };
  lvl = hub.lvl; mach = null; arrival = null; campTrans = null; campFade = 0;
  players = [makePlayer(ch(), K, 0)]; players[0].inv = 0;
  enemies = []; lasers = []; parts = []; pickups = []; ghosts = []; fxs = [];
  setTimeFx(false, false);
  hub.t = 0; hub.dlg = null; hub.msg = opts.msg ? { text: opts.msg, t: 5 } : null;
  hub.arrive = opts.arrive ? { t: 0 } : null;
  if (hub.arrive) { players[0].hidden = true; players[0].x = 230; }
  state = "hub"; voice.stop();
  // à faire en arrivant : prologue, réparation d'une pièce, souvenir, fin de la campagne
  hub.queue = [];
  if (!SAVE.flags.prologue) hub.queue.push(() => startDialog(STORY.prologue, () => { SAVE.flags.prologue = 1; emit("met", { npc: "bulle" }); hub.msg = { text: say("Approche-toi de la machine et appuie sur Haut", "Approche-toi de la machine et appuie sur ▲", "Approche-toi de la machine et appuie sur {JUMP}"), t: 6 }; }, { prologue: true }));
  for (const W of CWORLDS.slice(0, SAVE.camp.done)) if (!SAVE.repaired[W.id]) {
    hub.queue.push(() => { audio.sfx("repair"); hub.repairFx = { wid: W.id, t: 0 }; startDialog(STORY.repair[W.id], () => { SAVE.repaired[W.id] = 1; saveGame(); }); });
    const M = MEMORIES.find(m => m.world === W.id);
    if (M) hub.queue.push(() => { if (has("mem:" + M.id) && !SAVE.memSeen[M.id]) openMemory(M.id, true); });
  }
  if (SAVE.camp.done >= CWORLDS.length && !SAVE.flags.ending) hub.queue.push(() => startDialog(STORY.ending, () => { startEnding(); }));
}
function hubToMachine() {
  audio.sfx("machine"); hub.machShake = 0.5;
  openWorlds();
}

/* ---- Dialogues ---- */
// lines : [[qui, texte]…]. Avancer : Entrée, Espace, clic, toucher, {A}. Passer : Échap, {B}. La voix lit chaque réplique.
function startDialog(lines, onEnd, o = {}) {
  hub.dlg = { lines, i: 0, t: 0, onEnd, o };
  speakLine();
}
const lineWho = l => l[0] === "hero" ? ch().name : l[0] === "machine" ? "La machine" : NPCS[l[0]].name;
const lineText = l => l[1];
function speakLine() { const d = hub.dlg; if (d && OPT.voice) voice.say(lineText(d.lines[d.i]), true); }
function endDialog() { const d = hub.dlg; hub.dlg = null; hub.cool = 0.3; voice.stop(); if (d && d.onEnd) d.onEnd(); }
function updateDialog(rdt) {
  const d = hub.dlg; if (!d) return false;
  const L = d.lines[d.i], full = lineText(L).length;
  const before = Math.floor(d.t * 40); d.t += rdt; const now = Math.floor(d.t * 40);
  if (now > before && now <= full && now % 3 === 0 && L[0] !== "hero") audio.sfx(L[0] === "machine" ? "dial" : NPCS[L[0]].talk);
  if (d.o.prologue && d.i === 2 && d.t < 0.05) { hub.machShake = 1.5; audio.sfx("spin"); }
  if (hit("Escape", "GB")) { audio.sfx("back"); endDialog(); return true; }
  if (hit("Enter", "Space", "NumpadEnter", "Mouse0", "GA", "GStart", "TJump", "TAtk", ...K.attack)) {
    if (d.t * 40 < full) d.t = full / 40;
    else if (d.i + 1 < d.lines.length) { d.i++; d.t = 0; audio.sfx("select"); speakLine(); }
    else { audio.sfx("select"); endDialog(); }
  }
  return true;
}
// Retour à la ligne pour un texte dans une largeur donnée (police du jeu)
function wrapText(s, w, size) {
  ctx.font = `700 ${size}px ${FONT}`;
  const out = []; let cur = "";
  for (const word of s.split(" ")) { const t = cur ? cur + " " + word : word; if (ctx.measureText(t).width > w && cur) { out.push(cur); cur = word; } else cur = t; }
  if (cur) out.push(cur); return out;
}
function drawDialog() {
  const d = hub.dlg; if (!d) return;
  const L = d.lines[d.i], who = L[0], s = lineText(L).slice(0, Math.floor(d.t * 40));
  const y = VH - 74;
  R(8, y, VW - 16, 66, "rgba(10,6,24,0.94)");
  const col = who === "hero" ? ch().ui : who === "machine" ? "#7dffb0" : NPCS[who].color;
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(8.5, y + 0.5, VW - 17, 65);
  R(14, y + 6, 52, 54, "rgba(30,20,56,0.9)");
  ctx.save(); ctx.beginPath(); ctx.rect(14, y + 6, 52, 54); ctx.clip();
  if (who === "hero") drawFrame("portraits", ATL.portraits.anims[ch().id][0], 40, y + 58, 1, 1, 1.2);
  else if (who === "machine") drawMachineIcon(40, y + 33, 1.6);
  else drawNpcPortrait(who, 40, y + 33, 1.25, Math.floor(d.t * 10) % 2 && d.t * 40 < lineText(L).length);
  ctx.restore();
  text(lineWho(L), 74, y + 12, 9, col);
  wrapText(s, VW - 100, 9).forEach((l, i) => text(l, 74, y + 28 + i * 13, 9, "#ffffff"));
  const done = d.t * 40 >= lineText(L).length;
  if (done && Math.floor(time * 3) % 2) text("▼", VW - 20, y + 56, 8, col, "center");
  text(say("Entrée : suite   Échap : passer", "Touche : suite", "{A} : suite   {B} : passer"), VW - 14, y - 6, 7, "#b9a6e0", "right");
}

/* ---- Mise à jour ---- */
function hubInteract(it) {
  const p = players[0];
  if (it.npc) { talkTo(it); return; }
  if (!stationOn(it)) { audio.sfx("nope"); hub.msg = { text: it.lockText || "Pas encore…", t: 2.5 }; return; }
  audio.sfx("start"); p.vx = 0;
  it.open();
}
function talkTo(it) {
  const q = it.quest, id = it.npc;
  if (!q) {   // Mme Bulle : une phrase selon l'avancée, plus un conseil
    const lines = [...(STORY.bulle.filter(b => testCond(b.cond)).pop() || STORY.bulle[0]).lines];
    const waiting = QUESTS.find(q2 => testCond(q2.appear) && !SAVE.quests[q2.id]);
    if (waiting) lines.push(["bulle", `${NPCS[waiting.npc].name} a besoin d'aide. Va lui parler !`]);
    startDialog(lines, () => emit("met", { npc: "bulle" })); return;
  }
  const st = SAVE.quests[q.id];
  if (!st) startDialog(q.intro, () => {
    SAVE.quests[q.id] = { st: "active", items: {} }; emit("met", { npc: id });
    toast("Nouvelle quête", q.goal.text, "quest_start", "#ff8ab0"); checkUnlocks(false);
  });
  else if (st.st === "active") {
    const g = q.goal, n = g.items ? g.items.filter(i => st.items && st.items[i]).length : 0;
    startDialog([[id, g.items && g.items.length > 1 ? `${g.text}. Tu en as ${n} sur ${g.items.length}.` : g.text + "."]]);
  } else if (st.st === "ready") startDialog(q.outro, () => {
    st.st = "done"; for (const k of q.reward) grant(k); audio.sfx("quest_done"); checkUnlocks(false);
  });
  else startDialog(q.after.filter(a => testCond(a.cond)).pop().lines);
}
function updateHub(rdt) {
  hub.t += rdt; if (hub.msg && hub.msg.t > 0) hub.msg.t -= rdt;
  hub.machShake = Math.max(0, hub.machShake - rdt);
  if (hub.repairFx) { hub.repairFx.t += rdt; if (hub.repairFx.t > 2.5) hub.repairFx = null; }
  const p = players[0];
  if (hub.arrive) {
    const a = hub.arrive; a.t += rdt;
    if (a.t > 0.9 && p.hidden) { p.hidden = false; p.inv = 0.4; p.vy = -200; p.vx = -60; addFx("fx_teleport", p.x + 5, p.y + p.h); burst(240, 200, 24, ["#7dffb0", "#ffffff", "#c86eff"], 160, 0.6, 100, 1); audio.sfx("arrive"); }
    if (a.t > 1.4) hub.arrive = null;
  }
  if (updateDialog(rdt)) { updateParts(rdt); updateFx(rdt); return; }
  if (!hub.arrive && hub.queue.length) { hub.queue.shift()(); if (state !== "hub") return; }
  if (hit("Escape", "KeyP", "GStart", "TPause")) { openHubMenu(); return; }
  if (hit("KeyO", "GY")) { openOptions("hub"); return; }
  // le poste le plus proche devant lequel on se tient
  const things = hubThings();
  hub.near = null; let bd = 18;
  for (const it of things) { const d = Math.abs(p.x + 5 - it.x); if (d < Math.max(bd, it.w / 2) && p.onGround && !p.hidden) { bd = d; hub.near = it; } }
  hub.cool = Math.max(0, (hub.cool || 0) - rdt);   // juste après un dialogue, Entrée ne relance pas un poste
  if (hub.near && hub.cool <= 0 && (hit(...K.jump) || hit("Enter", "NumpadEnter"))) { for (const k of [...K.jump, "Enter", "NumpadEnter"]) delete pressed[k]; p.jumpBuf = 0; hubInteract(hub.near); return; }
  // clic ou toucher sur un poste ou un client
  if (hit("Mouse0")) for (const it of things) if (inside({ x: it.x - it.w / 2, y: HUB_FLOOR - it.h, w: it.w, h: it.h })) { delete pressed.Mouse0; hubInteract(it); return; }
  if (!hub.arrive) updatePlayer(p, rdt);
  updateParts(rdt); updateFx(rdt);
}
function openHubMenu() { state = "hubmenu"; hubMenuSel = 0; audio.sfx("pause"); }
let hubMenuSel = 0;
const HUB_MENU = [["Reprendre", () => { state = "hub"; }], ["Options", () => openOptions("hub")], ["Changer de héros", () => openChars("hub")], ["Écran titre", () => goMenu()]];
const hubMenuRect = i => ({ x: 170, y: 92 + i * 28, w: 140, h: 22 });
SCREENS.hubmenu = {
  update() {
    const n = HUB_MENU.length;
    if (hit("Escape", "KeyP", "GStart", "GB", "TPause")) { state = "hub"; audio.sfx("back"); return; }
    if (hit(...K.up)) { hubMenuSel = (hubMenuSel + n - 1) % n; audio.sfx("select"); }
    if (hit(...K.down)) { hubMenuSel = (hubMenuSel + 1) % n; audio.sfx("select"); }
    if (hit(...K.ok)) { audio.sfx("select"); HUB_MENU[hubMenuSel][1](); return; }
    if (hit("Mouse0")) HUB_MENU.forEach(([, f], i) => { if (state === "hubmenu" && inside(hubMenuRect(i))) { audio.sfx("select"); f(); } });
  },
  draw() {
    drawHub(); R(0, 0, VW, VH, "rgba(10,6,24,0.7)");
    text("Laverie", VW / 2, 66, 22, ch().ui, "center", ch().ui);
    HUB_MENU.forEach(([label], i) => { const r = hubMenuRect(i); drawButton(r, label, i === hubMenuSel || (!PAD && !TOUCH && inside(r)), i ? "#e8dcff" : ch().ui); });
  },
};
// Bouton générique des écrans de la laverie
function drawButton(r, label, hov, col = "#e8dcff", size = 9) {
  R(r.x, r.y, r.w, r.h, hov ? "#ffffff" : "rgba(20,12,40,0.92)");
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  text(label, r.x + r.w / 2, r.y + r.h / 2 + 1, size, hov ? "#120828" : col, "center");
}
SCREENS.hub = { update: updateHub, draw: () => { drawHub(); drawHubHUD(); drawDialog(); } };

/* ---- Dessin de la laverie (provisoire) ---- */
const hubDeco = () => SAVE.cos.hub;
const decoOf = slot => DECOR_BY_ID[hubDeco()[slot]] || DECOR.find(d => d.slot === slot);
const showOn = k => hubDeco().show[k] !== false;
let hubBg = null, hubBgKey = "";
function hubBgCanvas() {
  const D = hubDeco(), img = hasAtlas("laverie_fond"), key = [D.tile, D.light, D.sign, SAVE.camp.done, img].join("|");
  if (hubBg && key === hubBgKey) return hubBg;
  hubBgKey = key;
  const [c, x] = mkCanvas(VW, VH);
  const F = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const L = decoOf("light").color;
  if (img) x.drawImage(atlasImg("laverie_fond"), 0, 0, VW, VH);   // fond fourni (laverie/laverie_fond.png)
  else {
  // mur
  F("#1c1430", 0, 0, VW, HUB_FLOOR);
  for (let y = 60; y < 200; y += 10) for (let bx = (y / 10 % 2) * 10; bx < VW; bx += 20) F("#221a3a", bx, y, 19, 9);
  F("#2a2046", 0, 196, VW, 44); for (let bx = 0; bx < VW; bx += 24) F("#241c3e", bx, 196, 1, 44); F("#3a2c5c", 0, 194, VW, 3);
  F("#140e24", 0, 0, VW, 18);
  // grande vitrine sur la rue, la nuit
  const sky = x.createLinearGradient(0, 56, 0, 150); sky.addColorStop(0, "#0c0820"); sky.addColorStop(1, "#3a1a4a");
  x.fillStyle = sky; x.fillRect(140, 58, 200, 92);
  seed = 5; for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(255,240,255,${0.3 + rnd() * 0.5})`; x.fillRect(140 + Math.floor(rnd() * 200), 60 + Math.floor(rnd() * 40), 1, 1); }
  let bx = 140; while (bx < 340) { const w = 12 + Math.floor(rnd() * 22), h = 20 + Math.floor(rnd() * 40); F("#160c28", bx, 150 - h, w, h); for (let wy = 150 - h + 4; wy < 148; wy += 6) for (let wx = bx + 2; wx < bx + w - 2; wx += 5) if (rnd() < 0.3) F(["#5ef0ff55", "#ff4fd855", "#fccc2855"][Math.floor(rnd() * 3)], wx, wy, 2, 2); bx += w + 1; }
  F("#0e0a1a", 136, 54, 208, 4); F("#0e0a1a", 136, 150, 208, 4); F("#0e0a1a", 136, 54, 4, 100); F("#0e0a1a", 340, 54, 4, 100); F("#0e0a1a", 238, 54, 4, 100);
  x.fillStyle = "rgba(255,255,255,0.06)"; x.beginPath(); x.moveTo(150, 60); x.lineTo(180, 60); x.lineTo(150, 110); x.fill();
  }
  // néons du plafond, couleur de l'éclairage choisi
  for (const lx of [60, 240, 420]) { F(`rgb(${L})`, lx - 22, 18, 44, 3); cone(x, lx - 22, lx + 22, 21, 40, 200, L, 0.07); glow(x, lx, 20, 40, L, 0.25); }
  // sol en carrelage
  const [a, b2] = decoOf("tile").colors, tid = hubDeco().tile;
  for (let ty = HUB_FLOOR; ty < VH; ty += 8) for (let tx = 0; tx < VW; tx += 8) {
    const k = (tx / 8 + ty / 8) % 2;
    if (tid === "tile_losanges") { F(k ? a : b2, tx, ty, 8, 8); F(k ? b2 : a, tx + 3, ty + 3, 2, 2); }
    else if (tid === "tile_neon") { F(a, tx, ty, 8, 8); F(b2, tx, ty, 8, 1); F(b2, tx, ty, 1, 8); }
    else if (tid === "tile_bleu") { F(k ? a : b2, tx, ty, 8, 8); F("#ffffff22", tx, ty, 8, 1); }
    else F(k ? a : b2, tx, ty, 8, 8);
  }
  F("#0e0a1a", 0, HUB_FLOOR, VW, 2); x.fillStyle = "rgba(10,6,24,0.45)"; x.fillRect(0, HUB_FLOOR + 2, VW, VH - HUB_FLOOR);
  // le décor reste plus sombre que les éléments avec lesquels on joue
  F("rgba(6,3,16,0.18)", 0, 0, VW, HUB_FLOOR);
  hubBg = c; return c;
}
function drawSign() {
  const col = decoOf("sign").color, flick = Math.floor(time * 8) % 37 === 0;
  ctx.globalAlpha = flick ? 0.5 : 1;
  if (hasAtlas("enseigne")) { drawFrame("enseigne", flick ? 1 : 0, VW / 2, 34, 1, 1, 1.4, null); ctx.globalAlpha = 1; text("LAVERIE LUNELIO", VW / 2, 35, 11, col, "center", col); }
  else neon(ctx, "LAVERIE LUNELIO", VW / 2, 34, col, 12);
  ctx.globalAlpha = 1;
  drawSock(VW / 2 - 66, 34, {}); drawSock(VW / 2 + 66, 34, {});
}
function drawHub() {
  ctx.drawImage(hubBgCanvas(), 0, 0);
  drawSign();
  drawShowcase(false);
  for (const s of STATIONS) drawStation(s);
  for (const n of hubNpcs()) drawNpc(n.npc, n.x, HUB_FLOOR, n.x > players[0].x ? -1 : 1, hub.dlg && hub.dlg.lines[hub.dlg.i][0] === n.npc, n.quest);
  drawShowcase(true);
  drawFxList(true);
  drawGhosts(); for (const p of players) drawCampPlayer(p);
  drawFxList(false);
  for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(Math.round(q.x), Math.round(q.y), q.size, q.size, q.color); }
  ctx.globalAlpha = 1;
  // invite au-dessus du poste le plus proche
  const n = hub.near;
  if (n && !hub.dlg && state === "hub") drawPrompt(n.x, HUB_FLOOR - (n.h || 40) - 12, stationOn(n) || n.npc ? n.label : n.label + " (bientôt)");
}
// Éléments qui reflètent les progrès : affiches, vitrine, présentoir, étendoir, coin détente
function drawShowcase(front) {
  const items = hubDeco().items;
  if (!front) {
    // étendoir : une corde au mur avec les chaussettes trouvées
    if (showOn("etendoir")) {
      const n = socksCount(), y0 = 64;
      ctx.strokeStyle = "#8a80a8"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, y0); ctx.quadraticCurveTo(70, y0 + 8, 124, y0); ctx.stroke();
      R(18, y0 - 2, 3, 4, "#5a4a80"); R(123, y0 - 2, 3, 4, "#5a4a80");
      const shown = Math.min(n, 13);
      for (let i = 0; i < shown; i++) { const sx = 26 + i * 7.5, sy = y0 + 2 + Math.sin(i / 12 * Math.PI) * 4 + 5; drawSock(sx, sy + Math.sin(time * 2 + i) * 0.5, { t: i }); R(Math.round(sx - 1), Math.round(sy - 7), 2, 2, ["#ff4fd8", "#5ef0ff", "#fccc28"][i % 3]); }
      if (n > shown) text(`+${n - shown}`, 112, y0 + 16, 7, "#7dffb0", "center");
      if (!n) text("Étendoir vide", 72, y0 + 10, 6, "#6a5a88", "center");
    }
    // affiches des boss vaincus
    if (showOn("affiches")) CWORLDS.forEach((W, i) => {
      const x = 356 + (i % 3) * 22, y = 58 + Math.floor(i / 3) * 30, ok = SAVE.seen.boss[W.boss];
      R(x, y, 18, 24, "#0e0a1a");
      if (ok && hasAtlas("affiches_boss")) drawFrame("affiches_boss", i, x + 9, y + 24, 1, 1, 0.75);
      else if (ok) { R(x + 1, y + 1, 16, 22, BIG[W.boss].color + "55"); ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, 16, 22); ctx.clip(); drawFrame("portraits_boss", Object.keys(BIG).indexOf(W.boss), x + 9, y + 28, 1, 1, 0.55); ctx.restore(); R(x + 7, y - 1, 4, 2, "#e8e0c8"); }
      else { R(x + 1, y + 1, 16, 22, "#2a2244"); text("?", x + 9, y + 12, 8, "#4a3a68", "center"); }
    });
    // présentoir à badges (au mur, au-dessus de la décoration)
    if (showOn("presentoir")) {
      R(426, 58, 48, 36, "#0e0a1a"); R(427, 59, 46, 34, "#8a5a3a"); R(429, 61, 42, 30, "#c89a6a");
      BADGES.filter(b => has("badge:" + b.id)).slice(0, 15).forEach((b, i) => drawBadgeIcon(b, 434 + (i % 5) * 8, 67 + Math.floor(i / 5) * 9, 0.55));
    }
    // coin détente
    // vitrine à trophées (accrochée au mur, au-dessus des clients)
    if (showOn("vitrine")) {
      const x = 362, y = 122;
      R(x, y, 46, 54, "#0e0a1a"); R(x + 1, y + 1, 44, 52, "rgba(160,220,255,0.12)"); R(x + 1, y + 26, 44, 2, "#5a4a80"); R(x + 1, y + 44, 44, 9, "#3a2a5c");
      CWORLDS.forEach((W, i) => { if (!SAVE.seen.boss[W.boss]) return; const tx = x + 8 + (i % 3) * 15, ty = y + (i < 3 ? 24 : 42); if (hasAtlas("trophees")) { drawFrame("trophees", i, tx, ty, 1, 1, 0.8); return; } R(tx - 3, ty - 2, 7, 2, "#c8a020"); R(tx - 2, ty - 9, 5, 7, "#ffd23c"); R(tx - 4, ty - 10, 9, 2, "#ffd23c"); R(tx - 1, ty - 7, 1, 3, BIG[W.boss].color); });
      ctx.globalAlpha = 0.15; R(x + 4, y + 3, 3, 46, "#ffffff"); ctx.globalAlpha = 1;
    }
    if (items.item_plante) { R(2, 222, 10, 18, "#8a4a2a"); R(0, 204, 4, 18, "#2fa85a"); R(5, 198, 4, 24, "#3fd070"); R(9, 206, 4, 16, "#2fa85a"); }
    if (items.item_canape) { R(150, 216, 50, 24, "#0e0a1a"); R(152, 218, 46, 12, "#6a3a8a"); R(150, 226, 50, 10, "#5a2a7a"); R(152, 236, 4, 4, "#2a1a3a"); R(194, 236, 4, 4, "#2a1a3a"); }
    if (items.item_table) { R(262, 230, 26, 3, "#8a5a3a"); R(264, 233, 2, 7, "#5a3a2a"); R(284, 233, 2, 7, "#5a3a2a"); R(266, 226, 8, 4, "#5ef0ff"); }
    if (items.item_distributeur) { R(364, 192, 22, 48, "#0e0a1a"); R(365, 193, 20, 46, "#c8302a"); R(368, 197, 14, 22, "#ffd0a0"); for (let i = 0; i < 3; i++) R(370 + i * 4, 200, 2, 16, ["#ff8a3c", "#7dffb0", "#ff4fd8"][i]); R(368, 226, 14, 4, "#0e0a1a"); }
    if (items.item_panier) { R(126, 228, 22, 12, "#0e0a1a"); R(127, 229, 20, 10, "#c89a5a"); R(129, 225, 6, 5, "#5ef0ff"); R(137, 224, 7, 6, "#ff8ab0"); }
    if (items.item_drapeau) { R(150, 70, 1, 40, "#8a8070"); R(151, 72, 24, 16, "#0e0a1a"); R(152, 73, 22, 14, "#1a1a24"); drawSock(163, 80, {}); }
    if (items.item_affiche_bobine) { R(98, 92, 24, 30, "#0e0a1a"); R(99, 93, 22, 28, "#ff8a3c"); drawNpc("bobine", 110, 120, 1, false, null, 0.6); }
    if (items.item_lanterne) { R(30, 96, 1, 14, "#3a2a2a"); R(25, 110, 12, 16, "#0e0a1a"); R(26, 111, 10, 14, "#c8302a"); glow(ctx, 31, 118, 18, "255,120,80", 0.35 + 0.1 * Math.sin(time * 3)); }
  } else {
  }
}
function drawStation(s) {
  const on = stationOn(s), x = s.x, by = HUB_FLOOR, near = hub.near === s;
  ctx.save(); if (!on) ctx.globalAlpha = 0.45;
  const A = { armoire: "armoire", album: "album_lutrin", jukebox: "jukebox", defis: "machine_defis" }[s.id];
  if (A && hasAtlas(A)) {
    const an = s.id === "jukebox" ? (SAVE.jukebox ? "musique" : "repos") : s.id === "defis" ? (on ? "marche" : "repos") : near ? "ouverture" : (s.id === "armoire" ? "fermee" : "ferme");
    drawFrame(A, animFrame(A, an, time, 6, an !== "ouverture"), x, by);
    ctx.restore(); if (near && on) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 6); R(x - s.w / 2, by - 1, s.w, 2, "#7dffb0"); ctx.globalAlpha = 1; }
    return;
  }
  switch (s.id) {
    case "armoire": {
      R(x - 17, by - 58, 34, 58, "#0e0a1a"); R(x - 16, by - 57, 32, 56, "#4a6aa8"); R(x - 16, by - 57, 32, 3, "#6a8ac8");
      R(x - 1, by - 54, 2, 52, "#2a3a6a"); for (const dx of [-12, 4]) for (let i = 0; i < 3; i++) R(x + dx, by - 50 + i * 3, 8, 1, "#2a3a6a");
      R(x - 4, by - 30, 2, 5, "#fccc28"); R(x + 2, by - 30, 2, 5, "#fccc28");
      // autocollants soleil et lune
      R(x - 12, by - 22, 5, 5, "#ffb43c"); R(x + 7, by - 22, 5, 5, "#de6eff"); R(x + 9, by - 22, 3, 3, "#4a6aa8");
      break;
    }
    case "album": {
      R(x - 3, by - 22, 6, 22, "#0e0a1a"); R(x - 2, by - 22, 4, 22, "#8a5a3a"); R(x - 10, by - 2, 20, 2, "#5a3a2a");
      R(x - 14, by - 32, 28, 12, "#0e0a1a"); R(x - 13, by - 31, 12, 10, "#f4f0ff"); R(x + 1, by - 31, 12, 10, "#e8e0ff"); R(x - 1, by - 32, 2, 12, "#c8302a");
      for (let i = 0; i < 3; i++) { R(x - 11, by - 29 + i * 3, 8, 1, "#8a80a8"); R(x + 3, by - 29 + i * 3, 8, 1, "#8a80a8"); }
      if (on) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 3); R(x - 9, by - 36, 2, 2, "#fccc28"); ctx.globalAlpha = 1; }
      break;
    }
    case "jukebox": {
      const playing = !!SAVE.jukebox;
      R(x - 15, by - 48, 30, 48, "#0e0a1a"); R(x - 14, by - 47, 28, 46, "#8a2a6a");
      ctx.fillStyle = "#c8408a"; ctx.beginPath(); ctx.arc(x, by - 34, 13, Math.PI, 0); ctx.fill();
      for (let i = 0; i < 5; i++) R(x - 12 + i * 5, by - 34 + Math.sin(time * 4 + i) * (playing ? 2 : 0.5), 3, 18, ["#ff4fd8", "#fccc28", "#5ef0ff", "#7dffb0", "#ff8a3c"][(i + Math.floor(time * (playing ? 4 : 1))) % 5]);
      // petit hublot de machine à laver à la place des disques
      R(x - 6, by - 14, 12, 10, "#0e0a1a"); R(x - 5, by - 13, 10, 8, "#5ef0ff"); R(x - 3 + Math.round(Math.sin(time * 6) * 2), by - 11, 3, 3, "#ffffff");
      if (playing) for (let i = 0; i < 2; i++) { const k = (time * 0.7 + i * 0.5) % 1; ctx.globalAlpha = 1 - k; text("♪", x - 6 + i * 12, by - 50 - k * 16, 8, "#fccc28", "center"); ctx.globalAlpha = 1; }
      break;
    }
    case "souvenirs": {
      // cadre photo au mur et petit coffre au sol
      R(x - 14, by - 92, 28, 22, "#0e0a1a"); R(x - 13, by - 91, 26, 20, "#c89a5a"); R(x - 11, by - 89, 22, 16, "#2a1a3a");
      if (on) { R(x - 5, by - 85, 6, 6, "#f0c8a0"); R(x - 6, by - 87, 8, 3, "#ffffff"); R(x - 4, by - 79, 4, 4, "#4a6aa8"); drawMachineIcon(x + 6, by - 81, 0.35); }
      R(x - 12, by - 18, 24, 18, "#0e0a1a"); R(x - 11, by - 17, 22, 16, "#7a4a24"); R(x - 11, by - 12, 22, 2, "#c89a5a"); R(x - 2, by - 13, 4, 4, "#fccc28");
      if (on && memoriesCount() > Object.keys(SAVE.memSeen).length) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 6); R(x - 1, by - 24, 2, 4, "#ff8ab0"); ctx.globalAlpha = 1; }
      break;
    }
    case "machine": drawHubMachine(x, by); break;
    case "defis": {
      const sh = on ? Math.round(Math.sin(time * 30) * 0.6) : 0;
      R(x - 20 + sh, by - 50, 40, 50, "#0e0a1a"); R(x - 19 + sh, by - 49, 38, 48, "#d8dce8"); R(x - 19 + sh, by - 49, 38, 10, "#a8b0c8");
      // cadran à cinq programmes
      CHALLENGES.forEach((c, i) => { const P = PROGRAMS[c.prog]; R(x - 16 + i * 7 + sh, by - 46, 5, 4, (SAVE.chal[c.id] || {}).done ? "#7dffb0" : on ? P.color : "#6a6a7a"); });
      R(x - 13 + sh, by - 34, 26, 26, "#0e0a1a"); R(x - 11 + sh, by - 32, 22, 22, on ? "#2a6aa8" : "#3a3a4a");
      if (on) for (let i = 0; i < 4; i++) { const a = time * 5 + i * 1.6; R(Math.round(x + sh + Math.cos(a) * 6 - 1), Math.round(by - 21 + Math.sin(a) * 6 - 1), 3, 3, ["#ffffff", "#5ef0ff", "#ff8ab0", "#fccc28"][i]); }
      break;
    }
    case "deco": {
      // pot de peinture et rouleau : on décore !
      R(x - 9, by - 16, 18, 16, "#0e0a1a"); R(x - 8, by - 15, 16, 14, "#c8d0dc"); R(x - 8, by - 15, 16, 4, decoOf("sign").color);
      R(x + 6, by - 36, 2, 22, "#8a5a3a"); R(x - 2, by - 40, 16, 6, "#0e0a1a"); R(x - 1, by - 39, 14, 4, decoOf("sign").color);
      break;
    }
    case "bulle": {
      R(x - 22, by - 24, 30, 24, "#0e0a1a"); R(x - 21, by - 23, 28, 22, "#7a4a24"); R(x - 22, by - 26, 32, 3, "#c89a5a");
      drawNpc("bulle", x + 6, by - 2, -1, hub.dlg && hub.dlg.lines[hub.dlg.i][0] === "bulle", null);
      break;
    }
  }
  ctx.restore();
  if (near && on) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 6); R(x - s.w / 2, by - 1, s.w, 2, "#7dffb0"); ctx.globalAlpha = 1; }
}
// Machine temporelle de la laverie : l'atlas du pack (couleurs au choix), avec les voyants des pièces déjà réparées
function drawHubMachine(x, by) {
  const n = SAVE.camp.done, sh = hub.machShake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
  const st = hub.arrive && hub.arrive.t < 1.1 ? "activating" : "idle";
  if (st === "idle" && hasAtlas("machine_reparations")) drawFrame("machine_reparations", Math.min(n, 6), x + sh, by, 1, 1, 1, SAVE.cos.machine && has("cos:" + SAVE.cos.machine) ? SAVE.cos.machine : null);
  else drawMachineSkin(x + sh, by, st, hub.arrive ? hub.arrive.t : time);
  // six voyants : les pièces récupérées
  CWORLDS.forEach((W, i) => {
    const lx = x - 15 + i * 6 + sh, ly = by - 70, ok = i < n, P = PIECES[W.id];
    R(lx - 1, ly - 1, 5, 5, "#0e0a1a"); R(lx, ly, 3, 3, ok ? P.color : "#3a3450");
    if (ok) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 4 + i); R(lx - 2, ly - 2, 7, 7, P.color); ctx.globalAlpha = 1; }
  });
  // tant qu'elle n'est pas réparée : un peu de fumée
  if (n < CWORLDS.length && Math.random() < 0.05) parts.push({ x: x + 20 + Math.random() * 6, y: by - 60, vx: (Math.random() - 0.5) * 10, vy: -20, life: 1, max: 1, color: "#8a80a8", size: 2, grav: -10 });
  if (hub.repairFx) { const k = hub.repairFx.t; if (Math.random() < 0.5) burst(x + (Math.random() - 0.5) * 50, by - Math.random() * 60, 2, [PIECES[hub.repairFx.wid].color, "#ffffff"], 90, 0.5, 0, 1); ctx.globalAlpha = Math.max(0, 0.4 - k * 0.15); R(x - 40, by - 72, 80, 72, PIECES[hub.repairFx.wid].color); ctx.globalAlpha = 1; }
}
// Petite machine dessinée (icône) : x, y = centre
function drawMachineIcon(x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  R(-10, -11, 20, 22, "#0e0a1a"); R(-9, -10, 18, 20, "#d8dce8"); R(-9, -10, 18, 4, "#a8b0c8");
  ctx.fillStyle = "#0e0a1a"; ctx.beginPath(); ctx.arc(0, 2, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5ef0ff"; ctx.beginPath(); ctx.arc(0, 2, 5, 0, Math.PI * 2); ctx.fill();
  R(-6, -9, 2, 2, "#ff4fd8"); R(-2, -9, 2, 2, "#7dffb0");
  ctx.restore();
}

/* ---- Personnages non jouables (provisoires) ---- */
// Dessin simple d'environ 36 px, regard vers la droite (face < 0 : retourné). talk : bouche qui bouge.
function drawNpc(id, x, by, face = 1, talk = false, quest = null, alpha = 1) {
  const N = NPCS[id], bob = Math.round(Math.sin(time * 2.5 + x) * 0.6), O = "#0e0a1a";
  if (hasAtlas("pnj_" + id)) {
    const st = quest && SAVE.quests[quest.id], an = talk ? "parle" : st && st.st === "ready" ? "content" : "repos";
    drawFrame("pnj_" + id, animFrame("pnj_" + id, an, time, an === "parle" ? 8 : 5), x, by, face, alpha);
    drawNpcBubble(x, by, quest); return;
  }
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(x), by + bob); if (face < 0) ctx.scale(-1, 1);
  if (N.robot) {
    R(-6, -6, 4, 6, O); R(2, -6, 4, 6, O); R(-5, -6, 2, 5, "#8a92a8"); R(3, -6, 2, 5, "#8a92a8");
    R(-9, -24, 18, 19, O); R(-8, -23, 16, 17, N.skin); R(-7, -18, 14, 9, N.cloth); R(-3, -15, 6, 5, "#5ef0ff"); R(-2, -14, 2, 2, "#ffffff");
    R(-7, -34, 14, 11, O); R(-6, -33, 12, 9, "#a8b0c8"); R(-4, -31, 8, 4, "#0a2a3a"); R(-3, -30, 2, 2, N.hair); R(1, -30, 2, 2, N.hair);
    if (talk) R(-2, -26, 4, 1, N.hair);
    R(0, -38, 1, 5, O); R(-1, -40, 3, 3, Math.floor(time * 4) % 2 ? "#fccc28" : "#ff8a3c");
  } else {
    R(-5, -9, 4, 9, O); R(1, -9, 4, 9, O); R(-4, -9, 2, 8, "#2a2348"); R(2, -9, 2, 8, "#2a2348");
    if (id === "capitaine") { R(1, -3, 4, 3, "#ffffff"); R(1, -2, 4, 1, "#d02a2a"); }
    R(-8, -25, 16, 17, O); R(-7, -24, 14, 15, N.cloth); R(-7, -14, 14, 2, N.accent);
    if (id === "bulle") { R(-6, -20, 12, 10, "#bfefff"); R(2, -18, 4, 4, "#7dd8ff"); }
    if (id === "kage") { R(-7, -16, 14, 2, Math.floor(time * 2) % 2 ? N.cloth : "#3a1a5a"); }
    R(-6, -36, 12, 12, O); R(-5, -35, 10, 10, N.skin);
    R(1, -32, 2, 2, O); if (talk && Math.floor(time * 10) % 2) R(1, -28, 3, 2, "#8a2a2a"); else R(1, -28, 3, 1, "#8a2a2a");
    if (id === "bulle") { R(-6, -38, 11, 5, N.hair); for (let i = 0; i < 3; i++) R(-6 + i * 4, -40, 3, 3, ["#ff8ab0", "#5ef0ff", "#fccc28"][i]); R(0, -33, 5, 3, O); R(1, -32, 3, 1, "#bfefff"); }
    else if (id === "capitaine") { R(-9, -41, 18, 4, O); R(-7, -44, 14, 4, "#2a1a24"); drawSock(0, -42, {}); R(-6, -28, 10, 6, N.hair); R(-5, -22, 8, 3, N.hair); if (Math.floor(time * 3) % 3 === 0) R(-2, -19, 1, 2, "#5ef0ff"); }
    else if (id === "kage") { R(-6, -37, 12, 4, N.hair); R(-5, -30, 10, 4, "#2a1a3a"); R(-7, -36, 2, 8, N.hair); }
    else if (id === "firmin") { R(-6, -37, 11, 3, N.hair); R(-1, -29, 6, 2, "#ffffff"); R(-6, -38, 11, 2, "#fccc28"); }
  }
  ctx.restore();
  drawNpcBubble(x, by, quest);
}
// bulle au-dessus d'un client : quête à prendre (!), en cours (…), à rendre (✓)
function drawNpcBubble(x, by, quest) {
  if (quest) {
    const st = SAVE.quests[quest.id], sy = by - 52 + Math.sin(time * 4) * 2;
    const [sym, col] = !st ? ["!", "#fccc28"] : st.st === "ready" ? ["✓", "#7dffb0"] : st.st === "active" ? ["…", "#9fe8ff"] : [null];
    const fr = { "!": "quete", "…": "parler", "✓": "fini" }[sym];
    if (sym && hasAtlas("bulles_pnj")) drawFrame("bulles_pnj", animFrame("bulles_pnj", fr, time, 3), x, sy);
    else if (sym) { R(Math.round(x - 6), Math.round(sy - 6), 12, 11, "#0e0a1a"); R(Math.round(x - 5), Math.round(sy - 5), 10, 9, col); text(sym, x, sy, 8, "#120828", "center"); }
  }
}
function drawNpcPortrait(id, cx, cy, s = 1, talk = false) {
  const A = ATL["portrait_" + id];
  if (A && atlasImg("portrait_" + id)) { drawFrame("portrait_" + id, 0, cx, cy + 20 * s, 1, 1, s); return; }
  ctx.save(); ctx.translate(cx, cy + 40 * s * 0.55); ctx.scale(s * 1.4, s * 1.4); drawNpc(id, 0, 0, 1, talk, null); ctx.restore();
}

/* ---- Interface de la laverie ---- */
function drawHubHUD() {
  R(0, 0, VW, 16, "rgba(10,6,24,0.7)");
  text("Laverie", 6, 8, 9, "#7dd8ff");
  drawSock(62, 8, {}); text(`${socksCount()}/${socksTotal()}`, 70, 8, 8, "#7dffb0");
  const cards = CARDS.filter(c => has("card:" + c.id)).length;
  text(`Cartes ${cards}/${CARDS.length}`, 112, 8, 8, "#e8dcff");
  text(`Badges ${BADGES.filter(b => has("badge:" + b.id)).length}/${BADGES.length}`, 180, 8, 8, "#fccc28");
  text(`Pièces ${SAVE.camp.done}/6`, 252, 8, 8, "#ff8ab0");
  text(`${ch().name}  ·  ${df().label}`, VW - 6, 8, 8, ch().ui, "right");
  if (hub.msg && hub.msg.t > 0) { ctx.globalAlpha = Math.min(1, hub.msg.t); R(VW / 2 - 170, 162, 340, 16, "rgba(10,6,24,0.8)"); text(hub.msg.text, VW / 2, 170, 8, "#7dffb0", "center"); ctx.globalAlpha = 1; }
  if (!hub.dlg) text(say("← → : marcher   Haut devant un objet : l'utiliser   Échap : menu", "Croix : marcher   ▲ devant un objet (ou touche-le)", "Croix : marcher   {JUMP} devant un objet   {START} : menu"), VW / 2, VH - 7, 7, "#b9a6e0", "center");
}

/* ---- Fin de la campagne : « Retour à la maison » ---- */
function startEnding() { SAVE.flags.ending = 1; saveGame(); state = "campwin"; winT = 0; voice.say(`Programme Retour à la maison ! ${ch().name} rentre chez lui. Bravo !`, true); }

/* ---- Musique et ambiance des écrans de la laverie ---- */
const HUB_STATES = ["hub", "hubmenu", "album", "wardrobe", "deco", "jukebox", "memories", "chalsel"];
// Piste choisie au jukebox (si elle est débloquée et présente), sinon la musique de la laverie, sinon celle du héros
function hubMusic() {
  const T = SAVE.jukebox && TRACK_BY_ID[SAVE.jukebox];
  if (T && has("track:" + T.id) && trackAvailable(T)) return T.base;
  const P = audio.playlists;
  if (SAVE.camp.done >= CWORLDS.length && (P.laverie_nuit || []).length) return P.laverie_nuit[0];
  if ((P.laverie || []).length) return P.laverie[0];
  return charMusic(ch());
}
function screenMusic() {
  if (HUB_STATES.includes(state) || ((state === "options" || state === "keys") && optFrom === "hub") || (state === "chars" && charsFrom === "hub" && false)) return hubMusic();
  if (state === "memview") { const P = audio.playlists.souvenir || []; return P.length ? P[0] : hubMusic(); }
  if (state === "campwin") { const P = audio.playlists.fin || []; return P.length ? P[0] : charMusic(ch()); }
  if (state === "worlds" && mode === "camp") return hubMusic();
  return undefined;
}
function hubAmbience() { audio.setAmbience(HUB_STATES.includes(state) && hasSound("sfx/laverie/ambiance") ? "sfx/laverie/ambiance" : null); }

/* ---------------- Cosmétiques : rendu ---------------- */
// Les cosmétiques changent l'apparence seulement. Couleurs : la planche est recolorée une fois (teinte, saturation,
// luminosité ; « doré » : dégradé or), en gardant les contours sombres ; le résultat est gardé en cache.
const cosCache = {};
function recolor(img, C) {
  if (!img.cosKey) img.cosKey = "i" + Object.keys(cosCache).length + Math.random().toString(36).slice(2, 6);
  const key = img.cosKey + "|" + C.id; if (cosCache[key] !== undefined) return cosCache[key];
  let out = img;
  try {
    const [c, x] = mkCanvas(img.width, img.height); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] < 8) continue;
      let r = a[i] / 255, g = a[i + 1] / 255, b = a[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
      if (mx < 0.16) continue;   // contour sombre gardé
      let h = 0, s = 0; const dd = mx - mn;
      if (dd > 1e-6) { s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60; }
      let L2 = l;
      if (C.gold) { h = 42 + (l - 0.5) * 20; s = 0.85; L2 = 0.25 + l * 0.7; }
      else { if (s < 0.12) { a[i + 3] = a[i + 3]; continue; } h = (h + (C.hue || 0) + 360) % 360; s = Math.min(1, s * (C.sat || 1)); L2 = Math.min(1, Math.max(0, l + (C.light || 0))); }
      const q = L2 < 0.5 ? L2 * (1 + s) : L2 + s - L2 * s, p = 2 * L2 - q, hk = h / 360;
      const t2 = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
      a[i] = t2(hk + 1 / 3) * 255; a[i + 1] = t2(hk) * 255; a[i + 2] = t2(hk - 1 / 3) * 255;
    }
    x.putImageData(d, 0, 0); out = c;
  } catch (e) { out = img; }   // image d'une autre origine (fichier ouvert sans serveur) : couleurs d'origine
  return cosCache[key] = out;
}
function atlasImgCos(aid, cosId) { const img = atlasImg(aid), C = COS_BY_ID[cosId]; return img && C ? recolor(img, C) : img; }
const charCos = C => SAVE.cos.char[C.id] || {};
const cosOn = (C, slot) => { const id = charCos(C)[slot]; return id && has("cos:" + id) ? id : null; };
// Haut de la tête dans une image de planche (premier rang opaque), mesuré une fois
const headCache = {};
function headOf(aid, frame) {
  const k = aid + ":" + frame; if (headCache[k]) return headCache[k];
  const A = ATL[aid], img = atlasImg(aid); if (!A || !img) return { dx: 0, dy: -38 };
  let res = { dx: 0, dy: -(A.ay - 6) };
  try {
    const [c, x] = mkCanvas(A.cw, A.ch); x.drawImage(img, (frame % A.cols) * A.cw, Math.floor(frame / A.cols) * A.ch, A.cw, A.ch, 0, 0, A.cw, A.ch);
    const d = x.getImageData(0, 0, A.cw, A.ch).data;
    outer: for (let y = 0; y < A.ch; y++) { const xs = []; for (let xx = 0; xx < A.cw; xx++) if (d[(y * A.cw + xx) * 4 + 3] > 100) xs.push(xx);
      if (xs.length >= 3) { const cx = (xs[0] + xs[xs.length - 1]) / 2; res = { dx: cx - A.ax, dy: y - A.ay }; break outer; } }
  } catch (e) {}
  return headCache[k] = res;
}
// Accessoire de tête (provisoire, dessiné par le code) : hx, hy = haut de la tête, face = sens
const ACC_ORDER = COSMETICS.filter(c => c.slot === "acc").map(c => c.id);   // même ordre que cosmetiques/accessoires.png
function drawAccessory(id, hx, hy, face, s = 1, alpha = 1) {
  if (hasAtlas("accessoires")) { drawFrame("accessoires", ACC_ORDER.indexOf(id), hx, hy + 8 * s, face, alpha, s); return; }
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(hx), Math.round(hy + 3 * s)); ctx.scale(face * s, s);   // un peu enfoncé dans les cheveux
  const O = "#0e0a1a";
  switch (id) {
    case "acc_chapeau_pirate": R(-9, -3, 18, 3, O); R(-8, -2, 16, 1, "#2a1a24"); R(-6, -8, 12, 6, O); R(-5, -7, 10, 5, "#2a1a24"); R(-1, -6, 3, 3, "#ffffff"); break;
    case "acc_bandana": R(-6, -2, 12, 4, O); R(-5, -1, 10, 2, "#d02a2a"); R(-8, 0, 3, 4, "#d02a2a"); R(-1, -1, 1, 1, "#ffffff"); R(3, 0, 1, 1, "#ffffff"); break;
    case "acc_echarpe": { const w = Math.sin(time * 8) * 2; R(-5, 9, 10, 3, "#4a2a7a"); R(-9, 10 + w * 0.3, 5, 2, "#c86eff"); R(-12, 11 + w * 0.6, 4, 2, "#4a2a7a"); break; }
    case "acc_couronne_slime": R(-5, -4, 10, 4, O); R(-4, -3, 8, 3, "#5ef0ff"); R(-4, -6, 2, 3, "#5ef0ff"); R(-1, -7, 2, 4, "#5ef0ff"); R(2, -6, 2, 3, "#5ef0ff"); R(-1, -5, 1, 1, "#ffffff"); break;
    case "acc_lunettes": R(-3, 5, 10, 3, O); R(-2, 5, 3, 2, "#ff4fd8"); R(3, 5, 3, 2, "#5ef0ff"); break;
    case "acc_bonnet": R(-6, -5, 12, 6, O); R(-5, -4, 10, 5, "#3a8aff"); R(-5, -1, 10, 1, "#ffffff"); R(-2, -8, 4, 3, "#ffffff"); break;
    case "acc_casque": R(-7, -4, 14, 5, O); R(-6, -3, 12, 4, "#fccc28"); R(5, -1, 4, 2, "#fccc28"); R(-1, -4, 2, 1, "#ffffff"); break;
    case "acc_bigoudis": for (let i = 0; i < 3; i++) { R(-6 + i * 4, -3, 4, 4, O); R(-5 + i * 4, -2, 2, 2, ["#ff8ab0", "#5ef0ff", "#fccc28"][i]); } break;
    case "acc_oreilles": R(-6, -6, 4, 7, O); R(-5, -5, 2, 5, "#ff4fd8"); R(2, -6, 4, 7, O); R(3, -5, 2, 5, "#ff4fd8"); break;
    case "acc_fleurs": for (let i = 0; i < 4; i++) { R(-6 + i * 4, -2, 3, 3, ["#ff8ab0", "#fccc28", "#ffffff", "#c86eff"][i]); R(-5 + i * 4, -1, 1, 1, "#fccc28"); } break;
    case "acc_helice": { R(-5, -3, 10, 4, O); R(-4, -2, 8, 3, "#ff3b5c"); R(-1, -6, 2, 3, O); const k = Math.sin(time * 30) * 6; R(Math.round(-Math.abs(k)), -7, Math.round(Math.abs(k) * 2) + 1, 1, "#fccc28"); break; }
    case "acc_bulle": ctx.globalAlpha = alpha * 0.35; ctx.strokeStyle = "#bff4ff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 9, 13, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = alpha * 0.6; R(-7, 0, 2, 2, "#ffffff"); break;
  }
  ctx.restore();
}
// Dessin d'un héros avec ses cosmétiques (couleurs, accessoire, variante brillante)
function drawCharCos(C, frame, x, y, face = 1, scale = 1, alpha = 1, opts = {}) {
  const aid = charAtlas(C), pal = opts.pal !== undefined ? opts.pal : cosOn(C, "pal"), acc = opts.acc !== undefined ? opts.acc : cosOn(C, "acc");
  drawFrame(aid, frame, x, y, face, alpha, scale, pal);
  if (acc) { const h = headOf(aid, frame); drawAccessory(acc, x + face * h.dx * scale, y + h.dy * scale, face, scale, alpha); }
  if (pal && COS_BY_ID[pal].shiny && Math.floor(time * 3 + x) % 4 === 0) { const h = headOf(aid, frame); R(Math.round(x + (Math.sin(time * 7) * 8) * scale), Math.round(y + (h.dy + 10 + Math.cos(time * 5) * 8) * scale), 2, 2, "#ffffff"); }
}
// Couleur du sabre et des effets du joueur (cosmétique « fx », sinon la couleur du héros)
function fxCol(p, alt) {
  const id = cosOn(p.C, "fx"); if (!id) return p.C.color;
  const F = COS_BY_ID[id]; if (F.rainbow) return `hsl(${Math.floor(time * 360) % 360},100%,65%)`;
  return alt ? F.color2 : F.color;
}
// Traînée du sabre (seulement avec un cosmétique d'effet)
function drawSlash(p) {
  if (!cosOn(p.C, "fx") || p.atkT < 0 || p.atkT > 0.2) return;
  const k = p.atkT / 0.2, cx = p.x + 5 + p.face * 8, cy = p.y + 14, r = p.C.atkW * 0.8;
  ctx.save(); ctx.globalAlpha = 0.75 * (1 - k); ctx.strokeStyle = fxCol(p); ctx.lineWidth = 3;
  ctx.beginPath(); const a0 = p.face > 0 ? -1.3 : Math.PI + 1.3, a1 = p.face > 0 ? -1.3 + 2.6 * Math.min(1, k * 2) : Math.PI + 1.3 - 2.6 * Math.min(1, k * 2);
  ctx.arc(cx, cy, r, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
  ctx.strokeStyle = fxCol(p, true); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
}
// Machine temporelle avec la couleur choisie dans la décoration
function drawMachineSkin(x, y, st, t) {
  const skin = SAVE.cos.machine && has("cos:" + SAVE.cos.machine) ? SAVE.cos.machine : null;
  let fr;
  if (st === "activating") fr = animFrame("machine", "activate", t, 5 / 0.9, false);
  else if (st === "ready" || st === "entering") fr = ATL.machine.anims.activate[0] + 4;
  else if (st === "departing" || st === "loading") fr = animFrame("machine", "depart", t, 5 / 0.8, false);
  else fr = animFrame("machine", "idle", t, 4);
  const jx = st === "departing" ? Math.round((Math.random() - 0.5) * 2) : 0;
  drawFrame("machine", fr, x + jx, y, 1, 1, 1, skin);
}
