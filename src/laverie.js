/* ---------------- Laverie : la scène centrale ---------------- */
// Zone sûre où le héros se promène entre deux mondes. Chaque poste s'utilise avec Haut (▲ en tactile, {JUMP} à la manette)
// quand on est devant, ou d'un clic / d'un toucher dessus. Les dessins sont provisoires (code) tant que les images
// de assets/laverie/ n'existent pas (voir docs/prompt_sprites_chatgpt.md).
// États : "hub" (on se promène), "hubmenu" (menu Échap), plus les écrans de ecrans.js et defis.js (SCREENS).
const SCREENS = {};
const HUB_FLOOR = 240;   // sol de la scène de fin (drawCampWin)
// Pièces de la laverie : décor (atlas préparé par preparer_laverie.py, sinon dessin provisoire), largeur, hauteur du sol (pieds),
// plateformes traversables [x, y, largeur] et portes (x, pièce d'arrivée, image : 0 trophées, 1 chaussettes, 2 retour à la laverie).
// En passant une porte, on arrive devant la porte qui ramène d'où l'on vient.
const HUB_ROOMS = {
  salle: { name: "Laverie", bg: "laverie_salle", w: 816, floor: 236,
    plats: [[598, 213, 46], [652, 158, 98], [712, 101, 88]],   // banc, machines empilées, étagère du jukebox
    doors: [{ x: 36, to: "trophees", img: 0, label: "Salle des trophées" }, { x: 779, to: "chaussettes", img: 1, label: "Salle des chaussettes" }] },
  chaussettes: { name: "Salle des chaussettes", bg: "laverie_chaussettes", w: 680, floor: 224, plats: [],
    doors: [{ x: 30, to: "salle", img: 2, label: "Retour à la laverie" }] },
  trophees: { name: "Salle des trophées", bg: "laverie_trophees", w: 680, floor: 229, plats: [],
    doors: [{ x: 640, to: "salle", img: 2, label: "Retour à la laverie" }] },
};
let hub = { lvl: null, room: "salle", cam: 0, msg: null, dlg: null, near: null, t: 0, arrive: null, queue: [], machShake: 0, trans: null, visits: 0 };
const hubRoom = () => HUB_ROOMS[hub.room];
const hubArt = () => hasAtlas(hubRoom().bg);
// Postes : pièce, x = centre, fy = hauteur des pieds pour s'en servir (sol par défaut), art : déjà dessiné dans le décor.
// need : condition pour que le poste s'allume (sinon « bientôt », avec lockText).
const PEDESTALS = [163, 234, 306, 378, 452, 533];
const STATIONS = [
  { id: "armoire", room: "salle", x: 100, w: 34, h: 58, label: "Vestiaire", open: () => openWardrobe() },
  { id: "album", room: "salle", x: 268, w: 30, h: 36, label: "Collections", open: () => openAlbum() },
  { id: "machine", room: "salle", x: 408, w: 56, h: 64, label: "Machine temporelle", open: () => hubToMachine() },
  { id: "deco", room: "salle", x: 562, w: 40, h: 54, label: "Décoration", open: () => openDeco() },
  { id: "bulle", room: "salle", x: 618, w: 22, h: 38, label: "Mme Bulle", npc: "bulle" },
  { id: "jukebox", room: "salle", x: 770, fy: 101, w: 44, h: 56, art: true, label: "Jukebox", open: () => openJukebox() },
  { id: "defis", room: "chaussettes", x: 139, w: 96, h: 120, art: true, label: "Programmes de lavage", need: { world: 1 }, lockText: "Termine la centrale pour allumer ces machines", open: () => openChallenges() },
  { id: "ratelier", room: "chaussettes", x: 540, w: 44, h: 56, label: "Râtelier d'armes", open: () => openArmory() },
  { id: "carnet", room: "chaussettes", x: 615, w: 56, h: 70, label: "Livre des secrets", open: () => { ALB.tab = 5; ALB.sel = 0; openAlbum(); } },
  { id: "tas", room: "chaussettes", x: 340, w: 110, h: 100, label: "Tas de chaussettes", open: () => { ALB.tab = 2; openAlbum(); } },
  { id: "souvenirs", room: "trophees", x: 45, w: 50, h: 100, art: true, label: "Portail des souvenirs", need: { memories: 1 }, lockText: "Ramène une pièce de la machine pour réveiller ses souvenirs", open: () => openMemories() },
  ...PEDESTALS.map((x, i) => ({ id: "vitrine" + i, room: "trophees", x, w: 40, h: 90, art: true, world: i, label: CWORLDS[i].name,
    open: () => { ALB.tab = 0; ALB.cat = 3; ALB.world = WORLD_FILTERS.findIndex(f => f[0] === CWORLDS[i].id); ALB.page = 0; ALB.sel = 0; openAlbum(); } })),
  { id: "etagere", room: "trophees", x: 107, w: 64, h: 100, label: "Étagère à trésors", open: () => { ALB.tab = 3; ALB.sel = 0; openAlbum(); } },
  { id: "presentoir", room: "trophees", x: 592, w: 34, h: 100, label: "Présentoir à badges", open: () => { ALB.tab = 1; openAlbum(); } },
];
const STATION_OPEN_SFX = { deco: "deco_book" };
const stationOn = s => !s.need || testCond(s.need);
// Clients présents : ceux dont la quête est apparue (dans la grande salle)
const hubNpcs = () => QUESTS.filter(q => testCond(q.appear)).map(q => ({ id: q.npc, room: q.room || "salle", x: q.x, w: 20, h: 38, label: NPCS[q.npc].name, npc: q.npc, quest: q }));
const hubDoors = () => hubRoom().doors.map(d => ({ ...d, id: "porte_" + d.to, room: hub.room, w: 30, h: 56, door: true }));
function hubThings() { return [...STATIONS, ...hubNpcs(), ...hubDoors()].filter(t => t.room === hub.room); }
const thingFloor = t => t.fy ?? hubRoom().floor;

/* ---- Entrée dans la laverie ---- */
// opts.room : pièce (grande salle par défaut) ; opts.x : position ; opts.arrive : retour par la machine (après un boss :
// pièce réparée, souvenir) ; opts.msg : message affiché en arrivant
function hubSetRoom(id, x) {
  hub.room = id; const H = HUB_ROOMS[id];
  hub.lvl = { json: true, hub: true, width: H.w, solids: [{ x: -40, y: H.floor, w: H.w + 80, h: 40 }], plats: H.plats.map(([x0, y, w]) => ({ x: x0, y, w, h: 8 })),
    blocks: [], hazards: [], dest: [], items: [], exits: [], decor: [], covers: [], gold: [], qitems: [], sock: null,
    start: { x: clamp(x, 4, H.w - 14), y: H.floor - 32 }, lastSafe: null, W: CWORLDS[0], R: { id: "laverie", bg: "" }, leaving: false };
  lvl = hub.lvl;
  const want = makePlayers();   // à deux : le copain arrive à côté
  if (players.length === want.length && players.every((p, i) => p.C === want[i].C)) for (const p of players) { p.x = clamp(lvl.start.x + p.idx * 14, 4, H.w - 14); p.y = lvl.start.y; p.vx = p.vy = 0; if (p.dead) coopRevive(p, true); }
  else players = want;
  for (const p of players) p.inv = 0;
  hub.cam = clamp(coopCamX() - VW / 2, 0, H.w - VW);
}
function enterHub(opts = {}) {
  mode = "camp"; chal = null; rush = null; pluie = null; players = [];
  hubSetRoom(opts.room || "salle", opts.x ?? 380);
  mach = null; arrival = null; campTrans = null; campFade = 0; hub.trans = null;
  enemies = []; lasers = []; parts = []; pickups = []; ghosts = []; fxs = [];
  setTimeFx(false, false);
  hub.t = 0; hub.dlg = null; hub.visits++; hub.msg = opts.msg ? { text: opts.msg, t: 5 } : null;
  hub.arrive = opts.arrive ? { t: 0 } : null;
  if (hub.arrive) { hubSetRoom("salle", 398); for (const p of players) p.hidden = true; }
  state = "hub"; voice.stop();
  if (curProfil()) syncPull();   // progrès faits sur un autre appareil (profils.js)
  // à faire en arrivant : prologue, réparation d'une pièce, souvenir, fin de la campagne
  hub.queue = [];
  if (!SAVE.flags.prologue) hub.queue.push(() => startDialog(STORY.prologue, () => { SAVE.flags.prologue = 1; emit("met", { npc: "bulle" }); hub.msg = { text: say("Approche-toi de la machine et appuie sur Haut", "Approche-toi de la machine et appuie sur ▲", "Approche-toi de la machine et appuie sur {JUMP}"), t: 6 }; }, { prologue: true }));
  for (const W of CWORLDS.slice(0, SAVE.camp.done)) if (!SAVE.repaired[W.id]) {
    hub.queue.push(() => { if (hub.room !== "salle") hubSetRoom("salle", 380); audio.sfx("repair"); hub.repairFx = { wid: W.id, t: 0 }; startDialog(STORY.repair[W.id], () => { SAVE.repaired[W.id] = 1; saveGame(); }); });
    const M = MEMORIES.find(m => m.world === W.id);
    if (M) hub.queue.push(() => { if (has("mem:" + M.id) && !SAVE.memSeen[M.id]) openMemory(M.id, true); });
  }
  if (SAVE.camp.done >= CWORLDS.length && !SAVE.flags.ending) hub.queue.push(() => { if (ATL.souvenir_fin) getImg(ATL.souvenir_fin.src); startDialog(STORY.ending, () => { startEnding(); }); });   // la scène de fin se charge pendant le dialogue
  // après les 6 mondes, une cloche sonne au loin à chaque retour, tant que l'église n'est pas vaincue (eglise.js)
  if (egliseOpen() && !SAVE.flags.egliseWon) hub.queue.push(() => {
    audio.sfx("eg_cloche"); hub.msg = { text: "Une cloche sonne au loin… La machine peut t'emmener à l'église.", t: 6 };
    if (!SAVE.flags.egliseBell) startDialog(EG_DLG.cloche, () => { SAVE.flags.egliseBell = 1; saveGame(); });   // la première fois, Mme Bulle en parle
  });
}
function hubToMachine() {
  audio.sfx("machine"); hub.machShake = 0.5;
  openWorlds();
}
// Porte : fondu, autre pièce, fondu
function hubGo(door) {
  hub.trans = { t: 0, door, done: false }; audio.sfx("door"); players[0].vx = 0;
}
function updateHubTrans(rdt) {
  const T0 = hub.trans; if (!T0) return false;
  T0.t += rdt;
  if (T0.t >= 0.25 && !T0.done) {
    T0.done = true;
    const back = HUB_ROOMS[T0.door.to].doors.find(d => d.to === hub.room);
    hubSetRoom(T0.door.to, back ? back.x - 5 : 40);
    for (const p of players) p.face = back && back.x > HUB_ROOMS[T0.door.to].w / 2 ? -1 : 1;
  }
  if (T0.t >= 0.5) hub.trans = null;
  return true;
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
  if (who === "hero") drawHeroPortrait(ch(), 40, y + 58, 1, 1.2);
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
  if (it.door) { hubGo(it); return; }
  if (it.npc) { talkTo(it); return; }
  if (!stationOn(it)) { audio.sfx("nope"); hub.msg = { text: it.lockText || "Pas encore…", t: 2.5 }; return; }
  audio.sfx("start"); p.vx = 0;
  it.open();
}
function talkTo(it) {
  const q = it.quest, id = it.npc;
  if (!q) {   // Mme Bulle : une phrase selon l'avancée, plus un conseil (et une devinette si on lui parle cinq fois de suite)
    const sec = bulleSecret(); if (sec) { startDialog(sec.lines, sec.end); return; }
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
  updateSeason(rdt);
  hub.machShake = Math.max(0, hub.machShake - rdt);
  if (hub.repairFx) { hub.repairFx.t += rdt; if (hub.repairFx.t > 2.5) hub.repairFx = null; }
  const p = players[0], H = hubRoom();
  hub.cam = clamp(coopCamX() - VW / 2, 0, H.w - VW);   // à deux : la caméra suit le milieu des deux héros
  if (hub.arrive) {
    const a = hub.arrive; a.t += rdt;
    for (const q of players) if (a.t > 0.9 + q.idx * 0.2 && q.hidden) { q.hidden = false; q.inv = 0.4; q.vy = -200; q.vx = -60; addFx("fx_teleport", q.x + 5, q.y + q.h); burst(408, H.floor - 40, 24, ["#7dffb0", "#ffffff", "#c86eff"], 160, 0.6, 100, 1); if (!q.idx) audio.sfx("arrive"); }
    if (a.t > 1.6) hub.arrive = null;
  }
  if (updateHubTrans(rdt)) { updateParts(rdt); updateFx(rdt); return; }
  if (updateDialog(rdt)) { updateBulle(rdt, players[0]); updateParts(rdt); updateFx(rdt); return; }
  if (!hub.arrive && hub.queue.length) { hub.queue.shift()(); if (state !== "hub") return; }
  if (hit("Escape", "KeyP", "GStart", "TPause", "HStart")) { openHubMenu(); return; }
  if (hit("KeyO", "GY")) { openOptions("hub"); return; }
  // le poste le plus proche devant lequel on se tient (à la bonne hauteur : le jukebox est sur une étagère)
  const things = hubThings();
  hub.near = null; let bd = 18;
  for (const it of things) {
    const d = Math.abs(p.x + 5 - it.x);
    if (d < Math.max(bd, it.w / 2) && p.onGround && !p.hidden && Math.abs(p.y + p.h - thingFloor(it)) < 6) { bd = d; hub.near = it; }
  }
  // un poste qui s'ouvre quand on s'approche joue son son d'ouverture (le livre de décoration)
  if (hub.near !== hub.prevNear) { const sid = hub.near && STATION_OPEN_SFX[hub.near.id]; if (sid && stationOn(hub.near)) audio.sfx(sid); hub.prevNear = hub.near; }
  hub.cool = Math.max(0, (hub.cool || 0) - rdt);   // juste après un dialogue, Entrée ne relance pas un poste
  if (hub.near && hub.cool <= 0 && (hit(...K.jump) || hit("Enter", "NumpadEnter"))) { for (const k of [...K.jump, "Enter", "NumpadEnter"]) delete pressed[k]; p.jumpBuf = 0; hubInteract(hub.near); return; }
  // clic ou toucher sur un poste, un client ou une porte (coordonnées de la pièce : la caméra défile)
  if (hit("Mouse0")) {
    const mx = mouse.x + hub.cam;
    for (const it of things) { const fy = thingFloor(it); if (mx >= it.x - it.w / 2 && mx <= it.x + it.w / 2 && mouse.y >= fy - it.h && mouse.y <= fy + 4) { delete pressed.Mouse0; hubInteract(it); return; } }
  }
  if (!hub.arrive) for (const q of players) { updatePlayer(q, rdt); if (q.idx) coopKeepNear(q, H); }
  if (!hub.arrive) pluieTasUpdate(rdt, p);   // le secret du tas de chaussettes (pluie.js)
  updateBulle(rdt, p);
  for (const s of STATIONS) if (s.id === "carnet") s.op = clamp((s.op || 0) + (hub.near === s ? 2.5 : -2.5) * rdt, 0, 1);   // le livre des secrets s'ouvre peu à peu
  updateParts(rdt); updateFx(rdt);
}
function openHubMenu() { state = "hubmenu"; hubMenuSel = 0; audio.sfx("pause"); }
let hubMenuSel = 0;
const HUB_MENU = [["Reprendre", () => { state = "hub"; }], ["Options", () => openOptions("hub")], ["Changer de héros", () => openChars("hub")], ["Changer de joueur", () => openProfiles()], ["Écran titre", () => goMenu()]];
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
SCREENS.hub = { update: updateHub, draw: () => { drawHub(); drawSeasonScreen(); drawHubHUD(); drawDialog(); } };

/* ---- Dessin de la laverie ---- */
const hubDeco = () => SAVE.cos.hub;
const decoOf = slot => DECOR_BY_ID[hubDeco()[slot]] || DECOR.find(d => d.slot === slot);
const showOn = k => hubDeco().show[k] !== false;
// Décor de la pièce : l'image fournie, sinon un mur et un sol dessinés (provisoire)
const hubBgs = {};
function hubBgCanvas() {
  const H = hubRoom(), key = hub.room + (hubArt() ? "a" : "c");
  if (hubBgs[key]) return hubBgs[key];
  const [c, x] = mkCanvas(H.w, VH);
  if (hubArt()) x.drawImage(atlasImg(H.bg), 0, 0, H.w, VH);
  else {
    const F = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    F("#1c1430", 0, 0, H.w, H.floor);
    for (let y = 60; y < H.floor - 40; y += 10) for (let bx = (y / 10 % 2) * 10; bx < H.w; bx += 20) F("#221a3a", bx, y, 19, 9);
    F("#2a2046", 0, H.floor - 44, H.w, 44); F("#3a2c5c", 0, H.floor - 46, H.w, 3); F("#140e24", 0, 0, H.w, 18);
    for (let tx = 0; tx < H.w; tx += 8) for (let ty = H.floor; ty < VH; ty += 8) F((tx / 8 + ty / 8) % 2 ? "#d8d4e8" : "#3a3450", tx, ty, 8, 8);
    F("#0e0a1a", 0, H.floor, H.w, 2); F("rgba(10,6,24,0.45)", 0, H.floor + 2, H.w, VH - H.floor);
    for (const [px, py, pw] of H.plats) { F("#0e0a1a", px, py, pw, 6); F("#8a5a3a", px, py, pw, 4); }
    for (const d of H.doors) { F("#0e0a1a", d.x - 16, H.floor - 50, 32, 50); F("#120a24", d.x - 14, H.floor - 48, 28, 48); }
  }
  return hubBgs[key] = c;
}
// Teintes choisies dans la décoration : carrelage (couleur du sol) et éclairage (lumière de la pièce)
function drawHubTints() {
  const H = hubRoom(), T = hubDeco().tile, Lc = decoOf("light").color;
  ctx.save();
  if (T !== "tile_damier") {
    ctx.globalCompositeOperation = "color"; ctx.globalAlpha = 0.55; R(0, H.floor - 6, H.w, 16, decoOf("tile").colors[T === "tile_neon" ? 1 : 0]);
    ctx.globalCompositeOperation = "source-over";
    if (T === "tile_neon") { ctx.globalAlpha = 0.5 + 0.2 * Math.sin(time * 3); R(0, H.floor - 6, H.w, 1, decoOf("tile").colors[1]); }
  }
  if (hubDeco().light !== "light_blanc") { ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = 0.28; R(0, 0, H.w, VH, `rgb(${Lc})`); }
  ctx.restore();
}
function drawSign(x, y) {
  const col = decoOf("sign").color, flick = Math.floor(time * 8) % 37 === 0;
  ctx.globalAlpha = flick ? 0.5 : 1;
  if (hasAtlas("enseigne")) { drawFrame("enseigne", flick ? 1 : 0, x, y, 1, 1, 1.4, null); ctx.globalAlpha = 1; text("LAVERIE LUNELIO", x, y + 1, 11, col, "center", col); }
  else neon(ctx, "LAVERIE LUNELIO", x, y, col, 9);
  ctx.globalAlpha = 1;
}
function drawHub() {
  const H = hubRoom();
  ctx.save(); ctx.translate(-Math.round(hub.cam), 0);
  ctx.drawImage(hubBgCanvas(), 0, 0);
  drawHubTints();
  drawShowcase();
  for (const d of hubDoors()) drawHubDoor(d);
  for (const s of STATIONS) if (s.room === hub.room) drawStation(s);
  drawSeasonWorld();   // surprises du calendrier (secrets.js)
  for (const n of hubNpcs()) if (n.room === hub.room) drawNpc(n.npc, n.x, H.floor, n.x > players[0].x ? -1 : 1, hub.dlg && hub.dlg.lines[hub.dlg.i][0] === n.npc, n.quest);
  drawFxList(true);
  drawGhosts(); for (const p of players) drawCampPlayer(p);
  drawCoopTags();
  drawFxList(false);
  for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(Math.round(q.x), Math.round(q.y), q.size, q.size, q.color); }
  ctx.globalAlpha = 1;
  // invite au-dessus du poste le plus proche
  const n = hub.near;
  if (n && !hub.dlg && !hub.trans && state === "hub") drawPrompt(clamp(n.x, hub.cam + 60, hub.cam + VW - 60), thingFloor(n) - (n.h || 40) - 10, stationOn(n) || n.npc || n.door ? n.label : n.label + " (bientôt)");
  ctx.restore();
  if (hub.trans) { ctx.globalAlpha = Math.min(1, hub.trans.t < 0.25 ? hub.trans.t / 0.25 : (0.5 - hub.trans.t) / 0.25); R(0, 0, VW, VH, "#0d0820"); ctx.globalAlpha = 1; }
}
// Portes entre les pièces : image fournie (fermée, ouverte quand on est devant), sinon dessin provisoire
function drawHubDoor(d) {
  const by = hubRoom().floor, open = hub.near && hub.near.id === d.id || (hub.trans && hub.trans.door.id === d.id);
  if (hasAtlas("portes_laverie")) drawFrame("portes_laverie", d.img + (open ? 3 : 0), d.x, by + 2);
  else {
    R(d.x - 15, by - 50, 30, 50, "#0e0a1a"); R(d.x - 13, by - 48, 26, 48, open ? "#3a1a6a" : "#2a6a6a");
    text(["♜", "🧦", "⌂"][d.img], d.x, by - 38, 9, "#fccc28", "center");
  }
}
// Éléments qui reflètent les progrès : enseigne et coin détente (grande salle), tas de chaussettes, trophées et badges
function drawShowcase() {
  const items = hubDeco().items, H = hubRoom(), fl = H.floor;
  if (hub.room === "salle") {
    drawSign(408, 109);
    // coin détente : objets à poser (dessins provisoires), devant les machines
    if (items.item_plante) { R(218, fl - 18, 10, 18, "#8a4a2a"); R(216, fl - 36, 4, 18, "#2fa85a"); R(221, fl - 42, 4, 24, "#3fd070"); R(225, fl - 34, 4, 16, "#2fa85a"); }
    if (items.item_canape) { R(440, fl - 24, 50, 24, "#0e0a1a"); R(442, fl - 22, 46, 12, "#6a3a8a"); R(440, fl - 14, 50, 10, "#5a2a7a"); R(442, fl - 4, 4, 4, "#2a1a3a"); R(484, fl - 4, 4, 4, "#2a1a3a"); }
    if (items.item_table) { R(300, fl - 10, 26, 3, "#8a5a3a"); R(302, fl - 7, 2, 7, "#5a3a2a"); R(322, fl - 7, 2, 7, "#5a3a2a"); R(304, fl - 14, 8, 4, "#5ef0ff"); }
    if (items.item_distributeur) { R(160, fl - 48, 22, 48, "#0e0a1a"); R(161, fl - 47, 20, 46, "#c8302a"); R(164, fl - 43, 14, 22, "#ffd0a0"); for (let i = 0; i < 3; i++) R(166 + i * 4, fl - 40, 2, 16, ["#ff8a3c", "#7dffb0", "#ff4fd8"][i]); R(164, fl - 14, 14, 4, "#0e0a1a"); }
    if (items.item_panier) { R(526, fl - 12, 22, 12, "#0e0a1a"); R(527, fl - 11, 20, 10, "#c89a5a"); R(529, fl - 15, 6, 5, "#5ef0ff"); R(537, fl - 16, 7, 6, "#ff8ab0"); }
    if (items.item_drapeau) { R(250, 104, 1, 34, "#8a8070"); R(251, 106, 24, 16, "#0e0a1a"); R(252, 107, 22, 14, "#1a1a24"); drawSock(263, 114, { s: 0.6 }); }
    if (items.item_affiche_bobine) { R(118, 130, 24, 30, "#0e0a1a"); R(119, 131, 22, 28, "#ff8a3c"); drawNpc("bobine", 130, 158, 1, false, null, 0.6); }
    if (items.item_lanterne) { R(690, 108, 1, 14, "#3a2a2a"); R(685, 122, 12, 16, "#0e0a1a"); R(686, 123, 10, 14, "#c8302a"); glow(ctx, 691, 130, 18, "255,120,80", 0.35 + 0.1 * Math.sin(time * 3)); }
  } else if (hub.room === "chaussettes") {
    const n = socksCount(), gold = AJOUTS.gold.filter(g => SAVE.gold[g.id]).length;
    // tas de chaussettes qui grandit avec la collection (6 tailles)
    if (showOn("tas") && n > 0) {
      const stage = [1, 6, 18, 36, 54, 72].filter(t => n >= t).length - 1;
      const sx = TAS.shake > 0 ? Math.round(Math.sin(time * 70) * 3 * TAS.shake / 0.3) : 0;   // il tremble quand on le tape
      if (hasAtlas("tas_chaussettes")) drawFrame("tas_chaussettes", stage, 340 + sx, fl + 1);
      else for (let i = 0; i < Math.min(n, 30); i++) drawSock(340 + ((i * 37) % 80) - 40, fl - 6 - Math.floor(i / 8) * 7, { t: i, s: 0.7 });
    }
    R(300, 96, 80, 22, "rgba(10,6,24,0.55)");
    text(`${n} / ${socksTotal()}`, 340, 103, 10, "#7dffb0", "center", "#7dffb0");
    text(`dorées : ${gold} / ${AJOUTS.gold.length}`, 340, 113, 6, "#ffd23c", "center");
  } else if (hub.room === "trophees") {
    // trophée du boss vaincu de chaque monde, posé sur son socle
    if (showOn("trophees")) PEDESTALS.forEach((x, i) => {
      const ok = SAVE.seen.boss[CWORLDS[i].boss], y = 196 + Math.sin(time * 2 + i) * 1;
      if (ok) { glow(ctx, x, y - 14, 22, "255,220,120", 0.25); if (hasAtlas("trophees")) drawFrame("trophees", i, x, y); else { R(x - 4, y - 3, 9, 3, "#c8a020"); R(x - 3, y - 14, 7, 11, "#ffd23c"); R(x - 6, y - 16, 13, 3, "#ffd23c"); } }
      else text("?", x, y - 10, 10, "rgba(200,200,255,0.25)", "center");
    });
    // étagère à trésors (provisoire) : les trésors gagnés y brillent, entre le portail et la première vitrine
    if (showOn("etagere") && hasAtlas("etagere")) {
      // étagère fournie (64 × 72), posée sur le sol : 5 planches de 6 trésors (hauteur du dessus de chaque planche mesurée sur l'image)
      const top = fl + 1 - 72;
      drawFrame("etagere", 0, 107, fl + 1);
      TREASURES.filter(t => has("tres:" + t.id)).forEach((t, i) => drawTreasure(t, 87 + (i % 6) * 8.1, top + [21, 31, 40, 49, 58][Math.floor(i / 6)] - 4, 0.26, true));
    } else if (showOn("etagere")) {
      // planches murales en bois (5 étages de 6 trésors), sans fond plein : le mur reste visible
      for (let k = 0; k < 5; k++) { const y = 113 + k * 14; R(76, y, 62, 3, "#0e0a1a"); R(77, y, 60, 2, "#c89a5a"); R(79, y + 3, 2, 3, "#6a4a2a"); R(133, y + 3, 2, 3, "#6a4a2a"); }
      TREASURES.filter(t => has("tres:" + t.id)).forEach((t, i) => drawTreasure(t, 82 + (i % 6) * 10, 106 + Math.floor(i / 6) * 14, 0.34, true));
    }
    // présentoir à badges (provisoire), entre la dernière vitrine et la porte
    if (showOn("presentoir")) {
      R(572, 108, 42, 50, "#0e0a1a"); R(573, 109, 40, 48, "#8a5a3a"); R(575, 111, 36, 44, "#c89a6a");
      BADGES.filter(b => has("badge:" + b.id)).slice(0, 16).forEach((b, i) => drawBadgeIcon(b, 581 + (i % 4) * 8, 118 + Math.floor(i / 4) * 10, 0.5));
    }
  }
}
// Livre des secrets : il flotte au-dessus du sol (léger va-et-vient, ombre qui suit) et s'ouvre quand on s'approche
function drawSecretBook(s, by, near) {
  const op = s.op || 0, bob = Math.round(Math.sin(time * 2.2) * 3), y = by - 16 + bob;
  ctx.globalAlpha = 0.28 - bob * 0.03; ctx.fillStyle = "#0e0a1a"; ctx.beginPath(); ctx.ellipse(s.x, by - 1, 18 - bob, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  if (hasAtlas("carnet_secrets")) drawFrame("carnet_secrets", op < 0.3 ? 0 : op < 0.85 ? 1 : 2, s.x, y);
  else drawCarnet(s.x, y);
  if (Math.random() < 0.06 + op * 0.2) parts.push({ x: s.x + (Math.random() - 0.5) * 40, y: y - 10 - Math.random() * 30, vx: 0, vy: -12, life: 0.7, max: 0.7, color: "#fccc28", size: 1, grav: 0 });
  if (near) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 6); R(s.x - s.w / 2, by - 1, s.w, 2, "#7dffb0"); ctx.globalAlpha = 1; }
}
// Mme Bulle vit sa vie dans la grande salle : promenade, coup de balai, vaporisateur (nuage de bulles), tasse, nettoyage du
// sol, clin d'œil ; elle s'arrête et regarde le héros quand il s'approche ; après lui avoir parlé, des cœurs ; si personne ne
// joue pendant 25 s, elle fait la sieste (réveil à la première touche). Poses de pnj_bulle (preparer_laverie.py, prepare_bulle).
const BUL = { act: null, t: 0, next: 4, x: 618, home: 618, face: -1, idle: 0, fx: [], talked: false, to: 0, back: false };
const BUL_ACTS = { balai: 1.6, vapo: 1.9, tasse: 2.6, nettoie: 2.3, etoiles: 1.1, coeurs: 1.4, joie: 1.4 };
function bulleDo(act) { BUL.act = act; BUL.t = 0; if (act === "promenade") { BUL.to = clamp(BUL.home + (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 50), 560, 720); BUL.back = false; } }
function updateBulle(rdt, p) {
  const s = STATIONS.find(t => t.id === "bulle"); if (!s || hub.room !== "salle") return;
  const busy = Object.values(keys).some(Boolean) || Object.keys(pressed).length > 0 || down("Mouse0");   // on joue (touches, clics, manette)
  BUL.idle = busy ? 0 : BUL.idle + rdt;
  const talk = hub.dlg && hub.dlg.lines[hub.dlg.i] && hub.dlg.lines[hub.dlg.i][0] === "bulle", near = hub.near === s;
  if (talk) BUL.talked = true; else if (BUL.talked && !hub.dlg) { BUL.talked = false; bulleDo("coeurs"); }
  BUL.t += rdt;
  if (BUL.act === "dort") { if (busy || hub.dlg) bulleDo("etoiles"); }
  else if (talk || (near && BUL.act !== "coeurs")) { BUL.act = null; BUL.face = p.x + 5 > BUL.x ? 1 : -1; }
  else if (BUL.idle > 25 && !hub.dlg) bulleDo("dort");
  else if (BUL.act === "promenade") {
    const goal = BUL.back ? BUL.home : BUL.to, dx = goal - BUL.x;
    if (Math.abs(dx) > 1) { BUL.face = Math.sign(dx); BUL.x += BUL.face * Math.min(Math.abs(dx), 28 * rdt); BUL.t = 0; }
    else if (BUL.t > 1.2) { if (BUL.back) { BUL.act = null; BUL.next = 4 + Math.random() * 5; } else { BUL.back = true; BUL.t = 0; } }
  } else if (BUL.act) {
    if (BUL.act === "vapo" && !BUL.puff && BUL.t > 0.55) { BUL.puff = true; BUL.fx.push({ x: BUL.x + BUL.face * 16, y: thingFloor(s) - 24, face: BUL.face, t: 0 }); audio.sfx("dj"); }
    if (BUL.act === "balai" && Math.random() < 0.35) parts.push({ x: BUL.x + BUL.face * (18 + Math.random() * 8), y: thingFloor(s) - 2 - Math.random() * 4, vx: BUL.face * (20 + Math.random() * 30), vy: -10 - Math.random() * 20, life: 0.5, max: 0.5, color: "#c8b8a0", size: 1, grav: 40 });
    if (BUL.act === "nettoie" && Math.random() < 0.3) parts.push({ x: BUL.x + BUL.face * 12 + (Math.random() - 0.5) * 20, y: thingFloor(s) - 2, vx: (Math.random() - 0.5) * 20, vy: -15 - Math.random() * 20, life: 0.6, max: 0.6, color: Math.random() < 0.5 ? "#bff4ff" : "#ffffff", size: 1, grav: 30 });
    if (BUL.act === "tasse" && Math.random() < 0.08) parts.push({ x: BUL.x + BUL.face * 10, y: thingFloor(s) - 30, vx: 0, vy: -12, life: 0.8, max: 0.8, color: "#e8e0ff", size: 1, grav: 0 });
    if (BUL.t > (BUL_ACTS[BUL.act] || 1.5)) { BUL.act = null; BUL.puff = false; BUL.next = 4 + Math.random() * 5; }
  } else {
    BUL.face = p.x + 5 > BUL.x ? 1 : -1;
    if ((BUL.next -= rdt) <= 0 && !hub.dlg) {
      const r = Math.random();
      bulleDo(r < 0.25 ? "promenade" : r < 0.45 ? "balai" : r < 0.62 ? "vapo" : r < 0.75 ? "tasse" : r < 0.9 ? "nettoie" : "etoiles");
    }
  }
  s.x = Math.round(BUL.x);
  for (const b of BUL.fx) { b.t += rdt; b.x += b.face * 22 * rdt; b.y -= 6 * rdt; }
  BUL.fx = BUL.fx.filter(b => b.t < 1.8);
}
function drawBulle(s, by) {
  const A = ATL.pnj_bulle.anims, act = BUL.act, t = BUL.t, x = s.x;
  let fr;
  if (act === "promenade" && Math.abs((BUL.back ? BUL.home : BUL.to) - BUL.x) > 1) fr = A.marche[0] + Math.floor(time * 9) % A.marche[1];
  else if (act === "balai") fr = A.balai[0] + Math.floor(t * 7) % A.balai[1];
  else if (act === "vapo") fr = A.vapo[0] + Math.min(A.vapo[1] - 1, Math.floor(t * 5));
  else if (act && A[act]) fr = A[act][0];
  else fr = A.repos[0] + Math.floor(time * 5) % A.repos[1];
  drawFrame("pnj_bulle", fr, x, by, BUL.face);
  if (act === "dort") for (let i = 0; i < 2; i++) { const k = (time * 0.6 + i * 0.5) % 1; ctx.globalAlpha = 1 - k; text("z", x + 14 + k * 8, by - 26 - k * 14, 7 + i * 2, "#e8dcff", "center"); ctx.globalAlpha = 1; }
  for (const b of BUL.fx) if (hasAtlas("bulle_bulles")) drawFrame("bulle_bulles", 0, Math.round(b.x), Math.round(b.y), b.face, Math.max(0, Math.min(1, (1.8 - b.t) / 0.6)));
}
// Postes : ceux qui font partie du décor fourni ne sont pas redessinés (seulement un petit signe de vie)
function drawStation(s) {
  const on = stationOn(s), x = s.x, by = thingFloor(s), near = hub.near === s;
  if (s.art && hubArt()) {
    if (s.id === "jukebox" && SAVE.jukebox) for (let i = 0; i < 2; i++) { const k = (time * 0.7 + i * 0.5) % 1; ctx.globalAlpha = 1 - k; text("♪", x - 6 + i * 12, by - 58 - k * 16, 8, "#fccc28", "center"); ctx.globalAlpha = 1; }
    if (s.id === "defis") CHALLENGES.forEach((c, i) => { const P = PROGRAMS[c.prog]; R(x - 22 + i * 10, by - 118, 6, 4, (SAVE.chal[c.id] || {}).done ? "#7dffb0" : on ? P.color : "#4a4a5a"); });
    if (s.id === "souvenirs" && on && memoriesCount() > Object.keys(SAVE.memSeen).length && Math.random() < 0.3) parts.push({ x: x + (Math.random() - 0.5) * 30, y: by - 40 - Math.random() * 50, vx: 0, vy: -20, life: 0.6, max: 0.6, color: "#ff8ab0", size: 1, grav: 0 });
    if (near && on) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 6); R(x - s.w / 2, by - 1, s.w, 2, "#7dffb0"); ctx.globalAlpha = 1; }
    return;
  }
  if (s.id === "carnet") { drawSecretBook(s, by, near); return; }
  ctx.save(); if (!on) ctx.globalAlpha = 0.45;
  const A = { armoire: "armoire", album: "album_lutrin", jukebox: "jukebox", defis: "machine_defis", ratelier: "ratelier", deco: "livre_deco" }[s.id];
  if (A && hasAtlas(A)) {
    const an = s.id === "jukebox" ? (SAVE.jukebox ? "musique" : "repos") : s.id === "defis" ? (on ? "marche" : "repos") : near ? "ouverture" : (ATL[A].anims.fermee ? "fermee" : "ferme");
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
      R(x - 6, by - 14, 12, 10, "#0e0a1a"); R(x - 5, by - 13, 10, 8, "#5ef0ff"); R(x - 3 + Math.round(Math.sin(time * 6) * 2), by - 11, 3, 3, "#ffffff");
      break;
    }
    case "souvenirs": {
      ctx.fillStyle = "#3a1a6a"; ctx.beginPath(); ctx.arc(x, by - 50, 22, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 6; i++) { const a = time * 2 + i; R(Math.round(x + Math.cos(a) * (8 + i * 2)), Math.round(by - 50 + Math.sin(a) * (8 + i * 2)), 2, 2, "#c86eff"); }
      break;
    }
    case "machine": drawHubMachine(x, by); break;
    case "ratelier": {
      // provisoire (en attendant ratelier.png) : armoire en bois, les armes gagnées accrochées dedans
      R(x - 22, by - 56, 44, 56, "#0e0a1a"); R(x - 21, by - 55, 42, 54, "#6a3a8a"); R(x - 18, by - 52, 36, 46, "#2a1a3a");
      for (let i = 0; i < 3; i++) R(x - 18, by - 38 + i * 14, 36, 1, "#8a5a3a");
      WEAPONS.filter(w => w.icon >= 0 && SAVE.weapons.owned[w.id]).forEach((w, i) => { if (hasAtlas("armes_icones")) drawFrame("armes_icones", w.icon, x - 12 + (i % 3) * 12, by - 45 + Math.floor(i / 3) * 14, 1, 1, 0.32); });
      R(x - 21, by - 4, 42, 3, "#4a2a6a"); if (near) { ctx.globalAlpha = 0.3; R(x - 21, by - 55, 42, 54, "#ffb43c"); ctx.globalAlpha = 1; }
      break;
    }
    case "defis": {
      const sh = on ? Math.round(Math.sin(time * 30) * 0.6) : 0;
      R(x - 20 + sh, by - 50, 40, 50, "#0e0a1a"); R(x - 19 + sh, by - 49, 38, 48, "#d8dce8"); R(x - 19 + sh, by - 49, 38, 10, "#a8b0c8");
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
    case "bulle": if (hasAtlas("pnj_bulle")) drawBulle(s, by); else drawNpc("bulle", x, by, x > players[0].x ? -1 : 1, hub.dlg && hub.dlg.lines[hub.dlg.i][0] === "bulle", null); break;
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
    else if (id === "capitaine") { R(-9, -41, 18, 4, O); R(-7, -44, 14, 4, "#2a1a24"); drawSock(0, -42, { s: 0.5 }); R(-6, -28, 10, 6, N.hair); R(-5, -22, 8, 3, N.hair); if (Math.floor(time * 3) % 3 === 0) R(-2, -19, 1, 2, "#5ef0ff"); }
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
  text(hubRoom().name, 6, 8, 9, "#7dd8ff");
  ctx.font = `700 9px ${FONT}`; let x0 = 14 + ctx.measureText(hubRoom().name).width;
  const cards = CARDS.filter(c => has("card:" + c.id)).length;
  drawSock(x0 + 6, 8, { s: 0.55 }); x0 += 14;
  for (const [s, col] of [[`${socksCount()}/${socksTotal()}`, "#7dffb0"], [`Cartes ${cards}/${CARDS.length}`, "#e8dcff"],
    [`Badges ${BADGES.filter(b => has("badge:" + b.id)).length}/${BADGES.length}`, "#fccc28"], [`Pièces ${SAVE.camp.done}/6`, "#ff8ab0"]]) {
    text(s, x0, 8, 8, col); ctx.font = `700 8px ${FONT}`; x0 += ctx.measureText(s).width + 12;
  }
  const who = `${ch().name}  ·  ${df().label}`; ctx.font = `700 8px ${FONT}`;
  text(x0 + ctx.measureText(who).width < VW - 6 ? who : ch().name.split(" ")[0], VW - 6, 8, 8, ch().ui, "right");
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
  if ((P.laverie || []).length) return pickList(P.laverie, hub.visits - 1);   // une musique différente à chaque retour à la laverie
  return charMusic(ch());
}
function screenMusic() {
  if (state === "hub" && hub.dlg && hub.dlg.o && hub.dlg.o.prologue) { const P = audio.playlists.intro || []; if (P.length) return P[0]; }   // prologue : musique de l'intro
  if (HUB_STATES.includes(state) || ((state === "options" || state === "keys") && optFrom === "hub") || (state === "chars" && charsFrom === "hub" && false)) return hubMusic();
  if (state === "memview") { const P = audio.playlists.souvenir || []; return P.length ? P[0] : hubMusic(); }
  if (state === "campwin") { const P = audio.playlists.fin || []; return P.length ? P[0] : charMusic(ch()); }
  if (state === "worlds" && mode === "camp") return hubMusic();
  return undefined;
}
function hubAmbience() {
  if (state === "eglise") return;
  const inHub = HUB_STATES.includes(state);
  audio.setAmbience(inHub && seasonAmbience() ? seasonAmbience() : inHub && hasSound("sfx/laverie/ambiance") ? "sfx/laverie/ambiance" : null);   // jour de pluie : bruit de pluie
}

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
// cosId : identifiant d'un cosmétique, ou directement une variante { id, hue, sat, light } (ennemis)
function atlasImgCos(aid, cosId) { const img = atlasImg(aid), C = typeof cosId === "object" ? cosId : COS_BY_ID[cosId]; return img && C ? recolor(img, C) : img; }
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
    // haut de la tête : première ligne avec au moins 9 pixels pleins d'affilée (une lame de sabre levée est plus fine), 2 pixels plus haut
    outer: for (let y = 0; y < A.ch; y++) { let run = 0, best = 0, end = 0;
      for (let xx = 0; xx < A.cw; xx++) { if (d[(y * A.cw + xx) * 4 + 3] > 100) { if (++run > best) { best = run; end = xx; } } else run = 0; }
      if (best >= 9) { res = { dx: end - (best - 1) / 2 - A.ax, dy: y - 2 - A.ay }; break outer; } }
  } catch (e) {}
  return headCache[k] = res;
}
// Accessoire de tête (provisoire, dessiné par le code) : hx, hy = haut de la tête, face = sens
// Image de cosmetiques/accessoires.png (chaque objet remplit sa case de 24 px) : [échelle, bas de l'image sous le haut de la tête, décalage vers l'avant]
const ACC_FIT = { acc_chapeau_pirate: [0.62, 6, 0], acc_bandana: [0.55, 6, 0], acc_echarpe: [0.5, 20, -2], acc_couronne_slime: [0.45, 3, 0],
  acc_lunettes: [0.42, 11, 3], acc_bonnet: [0.55, 7, 0], acc_casque: [0.58, 7, 0], acc_bigoudis: [0.48, 4, -1], acc_oreilles: [0.5, 4, 0],
  acc_fleurs: [0.55, 4, 0], acc_helice: [0.58, 6, 0], acc_bulle: [1, 17, 0] };
const ACC_ORDER = COSMETICS.filter(c => c.slot === "acc").map(c => c.id);   // même ordre que cosmetiques/accessoires.png
function drawAccessory(id, hx, hy, face, s = 1, alpha = 1) {
  if (hasAtlas("accessoires")) { const [k, dy, dx] = ACC_FIT[id] || [0.55, 4, 0]; drawFrame("accessoires", ACC_ORDER.indexOf(id), hx + face * dx * s, hy + dy * s, face, alpha, s * k); return; }
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
  const big = bigHeads() && !opts.noBig ? drawBigHead(aid, pal ? atlasImgCos(aid, pal) : atlasImg(aid), frame, x, y, face, scale, alpha) : null;   // secret (secrets.js)
  if (acc) { const h = big || headOf(aid, frame); drawAccessory(acc, x + face * h.dx * scale, y + h.dy * scale, face, scale * (big ? big.k : 1), alpha); }
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
  if (!cosOn(p.C, "fx") || p.atkT < 0 || p.atkT > 0.2 || p.C.attack === "magie") return;   // la magie est dessinée sur la planche
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
