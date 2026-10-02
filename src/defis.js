/* ---------------- Programmes de lavage (défis) ---------------- */
// Variantes de salles existantes avec une règle en plus (CHALLENGES dans registres.js). La salle est reconstruite à chaque fois
// (buildRoom) : la campagne n'est jamais modifiée, et la progression, les chaussettes et la salle de reprise ne bougent pas.
// Tout avance avec le temps du jeu : la pause arrête le chronomètre, les bourrasques et les indices.
// chal = { C, ri, t, gust, res } ; res = résultat affiché à la fin (état "chalres").
const CS = { sel: 0 };
const chalOpen = C => testCond(C.unlock);
function openChallenges() { state = "chalsel"; CS.sel = clamp(CS.sel, 0, CHALLENGES.length - 1); audio.sfx("drum"); }
const csRect = i => ({ x: 10, y: 34 + i * 34, w: 168, h: 30 });
const CS_GO = { x: 300, y: 228, w: 160, h: 22 };
const rewardName = k => { const [t, id] = k.split(/:(.*)/); return (REWARD_INFO[t] ? REWARD_INFO[t][0](id) : id) + { cos: " (tenue)", decor: " (décoration)", track: " (musique)", card: " (carte)", badge: " (badge)" }[t]; };
const chalBest = C => ((SAVE.chal[C.id] || {}).best || {})[df().id];
SCREENS.chalsel = {
  update() {
    if (uiBack()) { backToHub(); return; }
    const n = CHALLENGES.length;
    if (hit(...K.up)) { CS.sel = (CS.sel + n - 1) % n; audio.sfx("dial"); }
    if (hit(...K.down)) { CS.sel = (CS.sel + 1) % n; audio.sfx("dial"); }
    const go = () => { const C = CHALLENGES[CS.sel]; if (chalOpen(C)) startChallenge(C); else audio.sfx("nope"); };
    if (hit(...K.ok)) { go(); return; }
    if (hit("Mouse0")) {
      for (let i = 0; i < n; i++) if (inside(csRect(i))) { if (CS.sel === i) { go(); return; } CS.sel = i; audio.sfx("dial"); }
      if (inside(CS_GO)) { go(); return; }
    }
  },
  draw() {
    drawHub(); R(0, 0, VW, VH, "rgba(10,6,24,0.88)"); drawBack();
    text("Programmes de lavage", VW / 2 + 30, 14, 13, "#5ef0ff", "center", "#5ef0ff");
    CHALLENGES.forEach((C, i) => {
      const P = PROGRAMS[C.prog], r = csRect(i), sel = i === CS.sel, open = chalOpen(C), done = (SAVE.chal[C.id] || {}).done;
      R(r.x, r.y, r.w, r.h, sel ? "rgba(255,255,255,0.15)" : "rgba(20,12,40,0.9)");
      ctx.strokeStyle = sel ? P.color : "#3a2a5c"; ctx.lineWidth = sel ? 2 : 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      R(r.x + 4, r.y + 4, 22, 22, open ? P.color : "#2a2244"); text(P.icon, r.x + 15, r.y + 15, 11, "#120828", "center");
      text(P.name, r.x + 32, r.y + 10, 9, open ? "#ffffff" : "#6a5a88");
      text(open ? (done ? "Réussi ✓" : "À essayer") : "Verrouillé", r.x + 32, r.y + 22, 6, open ? (done ? "#7dffb0" : "#fccc28") : "#6a5a88");
    });
    // fiche du programme choisi : niveau, règles, réussite, échec, récompense, record
    const C = CHALLENGES[CS.sel], P = PROGRAMS[C.prog], W = CWORLDS.find(w => w.id === C.world), open = chalOpen(C);
    drawPanel(186, 30, 288, 194, P.color);
    let y = 44;
    const row = (label, val, col = "#e8dcff") => { text(label, 194, y, 7, "#b9a6e0"); for (const l of wrapText(val, 196, 8)) { text(l, 270, y, 8, col); y += 11; } y += 3; };
    text(`${P.icon}  ${P.name}`, 194, y, 11, P.color); y += 18;
    row("Niveau", `${W.name} : ` + C.rooms.map(id => W.rooms.find(r => r.id === id).name).join(", "));
    row("Règle", P.rule + (C.limit ? ` (${C.limit} s)` : ""));
    row("Réussite", C.win, "#7dffb0");
    row("Échec", C.lose, "#ff8ab0");
    row("Récompense", C.reward.map(rewardName).join(", ") + ((SAVE.chal[C.id] || {}).done ? " — déjà gagnée" : ""), "#fccc28");
    const b = chalBest(C);
    row("Record", b ? `${fmtTime(b)} (${df().label})` : "Pas encore de record", b ? "#ffffff" : "#8a7aa8");
    if (!open) text("Pour l'ouvrir : termine " + (CWORLDS[(C.unlock.world || 1) - 1] || {}).name, 330, 216, 8, "#ff8ab0", "center");
    else drawButton(CS_GO, "Lancer le programme ▶", inside(CS_GO) || PAD, P.color, 9);
    text("La difficulté choisie au menu reste appliquée.", 94, 228, 6, "#b9a6e0", "center");
    text(say("↑ ↓ : choisir   Entrée : lancer   Échap : laverie", "Touche un programme, puis « Lancer »", "Croix : choisir   {A} : lancer   {B} : laverie"), 94, 244, 6, "#b9a6e0", "center");
  },
};
function startChallenge(C) {
  const wi = CWORLDS.findIndex(W => W.id === C.world);
  chal = { C, ri: 0, gust: { t: 0, phase: "calm", dir: 1 }, res: null };
  curWorld = wi; runTime = 0; deaths = 0; msg = null; audio.sfx("start");
  chalLoad();
  msg = { text: `Programme ${PROGRAMS[C.prog].name} !`, t: 2.2 };
  voice.say(`Programme ${PROGRAMS[C.prog].name}. ${PROGRAMS[C.prog].rule}`, true);
}
function chalLoad(restart) {
  const wi = curWorld, ri = roomIndex(wi, chal.C.rooms[chal.ri]);
  camp.ckpt = ri; camp.fromStart = true;
  loadCampRoom(wi, ri, { fadeIn: !restart, restart });
  chal.gust = { t: 0, phase: "calm", dir: 1 };
}
// Porte franchie : salle suivante du défi, ou réussite à la dernière
function chalRoomDone() {
  if (chal.ri + 1 < chal.C.rooms.length) { chal.ri++; chalLoad(); return true; }
  chalWin(); return true;
}
function chalWin() { if (!chal || chal.res) return; chalEnd(true); }
function chalFail(why) { if (!chal || chal.res) return; chalEnd(false, why); }
function chalEnd(ok, why) {
  const C = chal.C, s = SAVE.chal[C.id] = SAVE.chal[C.id] || { best: {} };
  s.best = s.best || {};
  const first = ok && !s.done, prev = s.best[df().id];
  const rec = ok && (prev === undefined || runTime < prev);
  if (rec) s.best[df().id] = runTime;
  chal.res = { ok, why, time: runTime, rec, first, t: 0, sel: 0 };
  setTimeFx(false, false);
  if (ok) { emit("challenge", { id: C.id }); for (const k of C.reward) grant(k); saveGame(); audio.sfx("chal_ok"); voice.say("Programme réussi ! Bravo !", true); }
  else { saveGame(); audio.sfx("chal_fail"); voice.say("Presque ! On réessaie ?", true); }
  state = "chalres";
}
function chalAbandon() { chal = null; enterHub({ room: "chaussettes", x: 160, msg: "Programme abandonné" }); }
const CR_BTN = [{ x: 140, y: 196, w: 96, h: 22, label: "Recommencer" }, { x: 244, y: 196, w: 96, h: 22, label: "Laverie" }];
SCREENS.chalres = {
  update(rdt) {
    const r = chal.res; r.t += rdt; updateParts(rdt);
    if (r.t < 0.6) return;
    if (hit(...K.left, ...K.right, ...K.up, ...K.down)) { r.sel = 1 - r.sel; audio.sfx("select"); }
    const act = i => { if (i === 0) { const C = chal.C; startChallenge(C); } else { chal = null; enterHub({ room: "chaussettes", x: 160 }); } };
    if (hit(...K.ok)) { act(r.sel); return; }
    if (hit("Escape", "GB")) { act(1); return; }
    if (hit("Mouse0")) CR_BTN.forEach((b, i) => { if (state === "chalres" && inside(b)) act(i); });
  },
  draw() {
    const r = chal.res, C = chal.C, P = PROGRAMS[C.prog];
    drawCampWorld(); R(0, 0, VW, VH, "rgba(10,6,24,0.8)");
    text(r.ok ? "Programme réussi !" : "Presque !", VW / 2, 70, 22, r.ok ? "#7dffb0" : "#ff8ab0", "center", r.ok ? "#7dffb0" : "#ff8ab0");
    text(`${P.icon} ${P.name}`, VW / 2, 96, 10, P.color, "center");
    text(r.ok ? `Temps : ${fmtTime(r.time)}` + (r.rec ? "   Nouveau record !" : "") : r.why || "", VW / 2, 120, 10, r.rec ? "#fccc28" : "#ffffff", "center");
    if (r.first) text("Récompense : " + C.reward.map(rewardName).join(", "), VW / 2, 142, 8, "#fccc28", "center");
    else if (r.ok) text("Récompense déjà gagnée : on joue pour le record !", VW / 2, 142, 8, "#b9a6e0", "center");
    const b = chalBest(C); if (b !== undefined) text(`Record (${df().label}) : ${fmtTime(b)}`, VW / 2, 162, 8, "#e8dcff", "center");
    CR_BTN.forEach((bt, i) => drawButton(bt, bt.label, (PAD || TOUCH) ? r.sel === i : inside(bt), i ? "#b9a6e0" : P.color, 9));
  },
};

/* ---- En jeu ---- */
// Compte à rebours des 30 dernières secondes (sfx/defis/chrono, 30 s) : joué seulement en jeu, arrêté en pause ou à la fin,
// et repris au bon endroit (runTime avance en temps réel, même au ralenti). Sans le fichier : le tic des 10 dernières secondes.
const CHRONO_LEN = 30;
let chronoSnd = null;
function chalChrono() {
  const f = SFX_FILES.chrono30, C = chal && !chal.res && chal.C, left = C && C.limit ? C.limit - runTime : 0;
  const want = state === "play" && audio.ctx && OPT.sfx && left > 0 && left <= CHRONO_LEN && hasSound(f);
  if (!want) { if (chronoSnd) { chronoSnd.stop(); chronoSnd = null; } return; }
  if (chronoSnd) return;
  const buf = audio.buffers[f]; if (!buf) { audio.load(f); return; }
  const c = audio.ctx, s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = 0.8; s.connect(g); g.connect(audio.sfxG);
  s.start(0, Math.max(0, Math.min(buf.duration - 0.05, buf.duration - left)));
  chronoSnd = { stop() { const t = c.currentTime; g.gain.setTargetAtTime(0, t, 0.05); try { s.stop(t + 0.3); } catch (e) {} } };
}
// Appelé par updatePlay() après le déplacement des joueurs (dt : temps du jeu, rdt : temps réel)
function chalUpdate(dt, rdt) {
  if (!chal || chal.res) return;
  const C = chal.C, p = players[0];
  if (C.limit) {
    const left = C.limit - runTime;
    if (left < 10 && Math.floor(left + rdt) !== Math.floor(left) && left > 0 && !chronoSnd) audio.sfx("tick");
    if (left <= 0) { audio.sfx("chrono_end"); chalFail(C.prog === "solitaire" ? "La chaussette est restée cachée…" : "Le chronomètre est arrivé à zéro"); return; }
  }
  if (C.gust) {
    // bourrasques : calme → annonce (flèche, son) → poussée ; jamais sans annonce
    const g = chal.gust, G0 = C.gust; g.t += dt;
    if (g.phase === "calm" && g.t >= G0.every - G0.warn) { g.phase = "warn"; g.t = 0; g.dir = Math.random() < 0.5 ? -1 : 1; audio.sfx("gust_warn"); }
    else if (g.phase === "warn" && g.t >= G0.warn) { g.phase = "push"; g.t = 0; audio.sfx("gust"); }
    else if (g.phase === "push") {
      if (g.t >= G0.push) { g.phase = "calm"; g.t = 0; }
      else for (const q of players) if (!q.dead && !campLocked(q)) {
        const vx = q.vx, vy = q.vy; q.vx = g.dir * G0.force * windMul(); q.vy = 0; moveBody(q, dt); q.vx = vx; q.vy = vy;
        if (Math.random() < 0.3) parts.push({ x: g.dir > 0 ? 0 : VW, y: 30 + Math.random() * 200, vx: g.dir * 400, vy: 0, life: 1.2, max: 1.2, color: "#e8f8ff", size: 1, grav: 0 });
      }
    }
  }
  if (C.grip && p.onGround && Math.abs(p.vx) > 60 && !(down(...K.left) || down(...K.right)) && Math.random() < 0.08) { audio.sfx("slip"); parts.push({ x: p.x + 5, y: p.y + p.h, vx: -p.vx * 0.2, vy: -20, life: 0.4, max: 0.4, color: "#e8f8ff", size: 1, grav: 60 }); }
}
// Adhérence (programme Lavage à froid) : multiplie l'accélération au sol
const chalGrip = p => chal && !chal.res && chal.C.grip && p.onGround ? chal.C.grip : 1;
// Programme Délicat : le premier coup reçu fait échouer
function chalHurt() { if (chal && chal.C.prog === "delicat") chalFail("Tu as été touché : le linge délicat est froissé !"); }
// Chaussette cible (Chaussette solitaire) : elle n'apparaît que de près
function chalTargetAlpha(k) {
  const d = Math.min(...players.map(p => Math.hypot(p.x + 5 - (k.x + 6), p.y + 16 - (k.y + 6))));
  const pulse = Math.floor(time * 0.5) % 4 === 0 ? 0.25 : 0;   // un petit scintillement de temps en temps
  return clamp(1 - (d - 30) / 60, 0, 1) || pulse * (0.5 + 0.5 * Math.sin(time * 10));
}
function drawChalHUD() {
  if (!chal) return;
  const C = chal.C, P = PROGRAMS[C.prog];
  R(VW / 2 - 70, 17, 140, 14, "rgba(10,6,24,0.8)");
  if (C.limit) { const left = Math.max(0, C.limit - runTime); text(`${P.icon} ${P.name}  ${left.toFixed(1)} s`, VW / 2, 24, 8, left < 10 ? (Math.floor(time * 4) % 2 ? "#ff3b5c" : "#ffffff") : P.color, "center"); }
  else text(`${P.icon} ${P.name}` + (C.prog === "delicat" ? "  : ne te fais pas toucher" : C.prog === "froid" ? "  : ça glisse !" : ""), VW / 2, 24, 8, P.color, "center");
  if (C.gust) {
    const g = chal.gust;
    if (g.phase === "warn" && Math.floor(time * 6) % 2) { R(VW / 2 - 80, 100, 160, 30, "rgba(10,6,24,0.75)"); text(g.dir > 0 ? "Bourrasque  ➜➜➜" : "⬅⬅⬅  Bourrasque", VW / 2, 115, 12, "#bff4ff", "center", "#5ef0ff"); }
    if (g.phase === "push") { ctx.globalAlpha = 0.12; R(0, 0, VW, VH, "#bff4ff"); ctx.globalAlpha = 1; }
  }
  if (C.grip) { ctx.globalAlpha = 0.35; for (const s of [...lvl.solids, ...lvl.plats]) R(s.x, s.y, s.w, 2, "#e8f8ff"); ctx.globalAlpha = 1; for (let i = 0; i < 8; i++) R((i * 61 + Math.floor(time * 20)) % VW, (i * 37 + Math.floor(time * 30)) % VH, 1, 1, "#ffffff"); }
  if (C.hints) {
    const n = Math.min(C.hints.length, 1 + Math.floor(runTime / 20));
    R(6, 34, 210, 10 + n * 11, "rgba(10,6,24,0.75)");
    for (let i = 0; i < n; i++) text(`Indice ${i + 1} : ${C.hints[i]}`, 10, 41 + i * 11, 6, "#e8dcff");
  }
}
