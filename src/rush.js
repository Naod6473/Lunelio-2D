/* ---------------- Boss rush ---------------- */
// Carte de l'écran des mondes (RUSH_CARD, après les 6 mondes) : les 6 boss de la campagne d'affilée, dans leurs arènes, puis
// les combats de l'église (Brie, Jules, Laurène, puis le duo ; RUSH_EG : étapes de EG_SCRIPT), sans dialogue.
// rush : { i (boss en cours), t (chrono, temps réel en jeu), hp (cœurs gardés d'un boss à l'autre), startHp, next (pause
// entre deux boss), res (résultat) }. Perdre recommence le boss en cours, avec les cœurs du début de ce combat ; le chrono
// continue. Record par difficulté, en solo et à deux : SAVE.rush.best["diff|1"] ou ["diff|2"].
// Ni pièce, ni arme, ni chaussette : le boss rush ne compte que pour le record (et ses badges).
let rush = null;
const RUSH_EG = [0, 2, 4, 5], RUSH_TOTAL = CWORLDS.length + RUSH_EG.length;
const rushName = i => i < CWORLDS.length ? BIG[CWORLDS[i].boss].name : EG_SCRIPT[RUSH_EG[i - CWORLDS.length]].fight.map(id => EGB[id].name).join(" et ");
const rushOpen = () => campProgress() >= CWORLDS.length;
const rushKey = () => `${df().id}|${COOP.on ? 2 : 1}`;
const rushBest = () => (SAVE.rush.best || {})[rushKey()];
function startRush() {
  rush = { i: 0, t: 0, hp: null, startHp: null, next: 0, res: null };
  runTime = 0; deaths = 0; msg = null; spokenRoom = -1; audio.sfx("start");
  rushLoad();
}
function rushLoad() {
  const i = rush.i;
  if (i >= CWORLDS.length) egRushFight(RUSH_EG[i - CWORLDS.length]);   // l'église (eglise.js)
  else {
    const W = CWORLDS[i], ri = W.rooms.length - 1;
    camp.ckpt = ri; camp.fromStart = false;   // en Doom aussi, on recommence ce boss
    loadCampRoom(i, ri, { fadeIn: true });
  }
  msg = { text: `Boss ${i + 1} sur ${RUSH_TOTAL} : ${rushName(i)}`, t: 2.4 };
}
// Appelé par loadCampRoom : cœurs gardés d'un boss à l'autre ; un combat recommencé repart avec les cœurs de son début
function rushApply(restart) {
  if (!restart) rush.startHp = rush.hp ? rush.hp.slice() : null;
  const hp = rush.startHp;
  if (hp) for (const p of players) p.hp = clamp(hp[p.idx] ?? df().hp, 1, df().hp);
}
// Le boss est vaincu (à la place de campVictory ; e : boss de la campagne, null à l'église) : un cœur de plus, le copain
// dans sa bulle revient, puis le boss suivant ; après le dernier, les mariés explosent en confettis et le résultat s'affiche
function rushWin(e) {
  if (e) foeDefeatFx(e.B.defeat, e.x + e.w / 2, e.y + e.h / 2, true);
  for (const p of players) { if (p.dead) coopRevive(p, true); p.hp = Math.min(df().hp, p.hp + 1); p.gauge = 1; }
  rush.hp = players.map(p => p.hp);
  rush.i++;
  if (rush.i >= RUSH_TOTAL) { if (state === "eglise") { egConfetti(); audio.sfx("victory"); } rush.next = 2.5; return; }
  rush.next = 2.2; msg = { text: "Boss suivant !", t: 2 }; voice.say("Boss suivant !", true);
}
// Appelé par updateCamp et par l'église : pause entre deux boss, fondu, puis le boss suivant (ou le résultat)
function updateRush(dt) {
  if (!rush || rush.next <= 0) return;
  rush.next -= dt;
  const last = rush.i >= RUSH_TOTAL;
  if (rush.next < 0.4 && !last) { const f = Math.min(1, 1 - rush.next / 0.4); if (state === "eglise") EG.fade = Math.max(EG.fade, f); else campFade = f; }
  if (rush.next <= 0) { if (last) rushEnd(); else rushLoad(); }
}
function rushEnd() {
  const k = rushKey(), prev = rushBest(), rec = prev === undefined || rush.t < prev;
  if (rec) SAVE.rush.best[k] = rush.t;
  rush.res = { time: rush.t, rec, prev, t: 0, sel: 0 };
  emit("rush", { time: rush.t, diff: df().id, duo: COOP.on });
  saveGame(); setTimeFx(false, false);
  audio.sfx("chal_ok"); voice.say("Boss rush terminé ! Bravo !", true);
  state = "rushres";
}
function rushQuit() { rush = null; enterHub({ x: 380 }); }
// Carte de l'écran des mondes : les portraits des 6 boss
function drawRushCard(r, tw, th) {
  R(r.x + 4, r.y + 4, tw, th, "#1a0a26");
  const ids = Object.keys(BIG), cw = Math.floor(tw / 3), chh = Math.floor(th / 2);
  CWORLDS.forEach((W, k) => {
    const pi = ids.indexOf(W.boss), x = r.x + 4 + (k % 3) * cw, y = r.y + 4 + Math.floor(k / 3) * chh;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, chh); ctx.clip();
    R(x, y, cw, chh, k % 2 ? "#24123a" : "#2c1646");
    const sc = Math.min(cw / 40, chh / 37) * 0.95;   // portrait entier (40 × 37), pieds en bas de la case
    drawFrame("portraits_boss", pi, x + cw / 2, y + chh - 1, 1, 1, sc);
    ctx.restore();
  });
  R(r.x + 4, r.y + 4, tw, th, `rgba(255,60,90,${0.06 + 0.04 * Math.sin(time * 3)})`);
}
const RR_BTN = [{ x: 140, y: 200, w: 96, h: 22, label: "Rejouer" }, { x: 244, y: 200, w: 96, h: 22, label: "Laverie" }];
SCREENS.rushres = {
  update(rdt) {
    const r = rush.res; r.t += rdt; updateParts(rdt);
    if (r.t < 0.6) return;
    if (hit(...K.left, ...K.right, ...K.up, ...K.down)) { r.sel = 1 - r.sel; audio.sfx("select"); }
    const act = i => { if (i === 0) startRush(); else rushQuit(); };
    if (hit(...K.ok)) { act(r.sel); return; }
    if (hit("Escape", "GB")) { act(1); return; }
    if (hit("Mouse0")) RR_BTN.forEach((b, i) => { if (state === "rushres" && inside(b)) act(i); });
  },
  draw() {
    const r = rush.res;
    if (lvl.eglise) SCREENS.eglise.draw(); else drawCampWorld();
    R(0, 0, VW, VH, "rgba(10,6,24,0.82)");
    text("Boss rush terminé !", VW / 2, 56, 22, "#ff5a7a", "center", "#ff5a7a");
    text(`${df().label}  ·  ${COOP.on ? "à deux" : "en solo"}`, VW / 2, 80, 9, "#e8dcff", "center");
    text(`Temps : ${fmtTime(r.time)}` + (r.rec ? "   Nouveau record !" : ""), VW / 2, 104, 12, r.rec ? "#fccc28" : "#ffffff", "center");
    const b = rushBest(); if (b !== undefined) text(`Record : ${fmtTime(b)}`, VW / 2, 124, 8, "#b9a6e0", "center");
    if (typeof drawMedalLine === "function") drawMedalLine("rush", r.time, VW / 2, 150);
    RR_BTN.forEach((bt, i) => drawButton(bt, bt.label, (PAD || TOUCH) ? r.sel === i : inside(bt), i ? "#b9a6e0" : "#ff5a7a", 9));
  },
};
