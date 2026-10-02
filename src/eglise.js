/* ---------------- L'église : le mariage de Laurène et Jules ---------------- */
// Après les 6 mondes, une cloche sonne dans la laverie à chaque retour et la machine propose « L'église » (EGLISE_CARD).
// Combat en plusieurs actes sur trois plans fixes (eglise_1 à 3, sans plateforme, sol à EG_FLOOR) : Brie, Jules, Laurène,
// puis Laurène et Jules ensemble (P2, 10 % plus rapides), avec des dialogues à portraits entre les actes. Musique : l'église,
// « à fond » au début, pendant les dialogues, et qui reprend là où elle s'était arrêtée (audio.resume) ; thème de chaque boss
// pendant son acte ; le duo final alterne les deux thèmes.
// EN CHANTIER : les boss, leurs dialogues et leurs thèmes arrivent. Tant que EG_READY est faux, la carte n'apparaît qu'après
// Maj + E sur l'écran des mondes (astuce de test), et on traverse les trois plans sans combat.
const EG_READY = false, EG_FLOOR = 236, EG_MUSIC = "musique/eglise/eglise", EG_LEVEL = 0.9;
const EG = { plan: 0, st: "intro", t: 0, fade: 0, trans: null, paused: false, music: null, bell: null };
function egliseOpen() { return SAVE.camp.done >= CWORLDS.length && (EG_READY || !!SAVE.flags.egliseTest); }
// Écran des mondes : Maj + E montre ou cache l'église en chantier (test)
function egliseCheat() {
  if (!((keys.ShiftLeft || keys.ShiftRight) && hit("KeyE"))) return;
  SAVE.flags.egliseTest = SAVE.flags.egliseTest ? 0 : 1; saveGame();
  msg = { text: SAVE.flags.egliseTest ? (SAVE.camp.done >= CWORLDS.length ? "Église en chantier : visible" : "Église : termine d'abord les 6 mondes (Maj + D)") : "Église en chantier : cachée", t: 2.5 };
  audio.sfx("eg_cloche");
}
// Son long (cloches) qu'on peut arrêter en fondu
function egSound(name, vol = 1) {
  const f = SFX_FILES[name], buf = f && audio.buffers[f];
  if (!audio.ctx || !OPT.sfx || !buf) { audio.sfx(name); return { stop() {} }; }
  const c = audio.ctx, s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(audio.sfxG); s.start();
  return { stop(sec = 1) { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, sec / 3); try { s.stop(t + sec + 0.5); } catch (e) {} } };
}
// Carte de l'écran des mondes : le premier plan de l'église, assombri, avec une lueur rouge
function drawEgliseCard(r, tw, th) {
  if (hasAtlas("eglise_1")) drawFrame("eglise_1", 0, r.x + 4 + tw / 2, r.y + 4 + th, 1, 1, tw / VW); else R(r.x + 4, r.y + 4, tw, th, "#2a0a1a");
  ctx.imageSmoothingEnabled = false;
  R(r.x + 4, r.y + 4, tw, th, `rgba(30,0,20,${0.25 + 0.1 * Math.sin(time * 2)})`);
}
// Musique : silence pendant la cloche du début, puis l'église (si le fichier manque : la musique du Maître des ombres)
function egliseMusic() {
  if (!EG.music) return null;
  if (EG.music === EG_MUSIC && !hasSound(EG_MUSIC)) return pickList(audio.list("boss:maitre_ombres", "musique/boss/maitre_ombres"), 0) || "synth:boss";
  return EG.music;
}
function egArena() {
  const W = CWORLDS[2];
  lvl = { json: true, eglise: true, W, R: W.rooms[0], width: VW, solids: [{ x: -40, y: EG_FLOOR, w: VW + 80, h: VH }], plats: [], blocks: [], decor: [], hazards: [], dest: [], items: [], exits: [],
    machine: null, ckpt: null, start: { x: 40, y: EG_FLOOR - 32 }, foeSpawns: [], bossSpawn: null, lastSafe: null, leaving: false, arena: null, covers: [], gold: [], qitems: [], sock: null };
}
function startEglise() {
  egArena();
  enemies = []; lasers = []; parts = []; pickups = []; ghosts = []; fxs = []; mach = null; chal = null; roomTime = 0; hitstop = 0; hub.dlg = null;
  players = [makePlayer(ch(), K, 0)]; const p = players[0]; p.x = 30; p.y = EG_FLOOR - p.h;
  Object.assign(EG, { plan: 0, st: "intro", t: 0, fade: 1, trans: null, paused: false, music: null });
  audio.resume.add(EG_MUSIC); audio.load(EG_MUSIC);   // gros fichier : chargé pendant les cloches
  EG.bell = egSound("eg_mariage", 0.9);   // les cloches du mariage, puis l'orgue… heavy metal
  state = "eglise"; voice.say("L'église.", true);
}
function egLeave() {
  if (EG.bell) EG.bell.stop(0.5); EG.bell = null;
  audio.setLevel(0.5); audio.setAmbience(null);
  enterHub({ x: 380 });
}
SCREENS.eglise = {
  update(rdt) {
    const p = players[0];
    if (hub.dlg) { updateDialog(rdt); return; }
    if (hit("Escape", "KeyP", "TPause", "GStart")) { EG.paused = !EG.paused; audio.sfx("pause"); }
    if (EG.paused) { if (hit("KeyQ", "GB", "Backspace")) egLeave(); return; }
    const dt = rdt * (slowOn ? 0.35 : 1);
    EG.t += dt; roomTime += dt; EG.fade = Math.max(0, EG.fade - rdt * 1.5);
    audio.setAmbience(OPT.sfx ? "sfx/eglise/ambiance" : null);
    // les cloches sonnent, puis la musique de l'église démarre à fond
    if (EG.st === "intro" && EG.t > 3.2) { EG.st = "free"; if (EG.bell) EG.bell.stop(2); EG.bell = null; EG.music = EG_MUSIC; audio.setLevel(EG_LEVEL, 0.2); shake = 4; }
    // pouvoirs comme en jeu
    const d = df(), pw = powerOf(p.C);
    if (pw && pw.burst) { p.powerOn = false; if (d.power && hit(...p.input.power)) burstPower(p, pw); p.gauge = Math.min(1, p.gauge + d.regen * rdt); }
    else { p.powerOn = !!(d.power && pw && down(...p.input.power) && p.gauge > 0); p.gauge = p.powerOn ? Math.max(0, p.gauge - d.drain * rdt) : Math.min(1, p.gauge + d.regen * rdt); }
    setTimeFx(usingPower(p, "slow"), usingPower(p, "fast"));
    if (!EG.trans) updatePlayer(p, dt);
    p.x = clamp(p.x, 2, VW - 12);
    // en chantier : au bord droit, on passe au plan suivant (fondu) ; après le dernier, retour à la laverie
    if (EG.st === "free" && !EG.trans && p.x >= VW - 14) { EG.trans = { t: 0, done: false }; audio.sfx("eg_glas"); }
    if (EG.trans) {
      const T0 = EG.trans; T0.t += rdt;
      if (T0.t > 0.6 && !T0.done) { T0.done = true; if (EG.plan >= 2) { egLeave(); return; } EG.plan++; p.x = 30; p.vx = 0; audio.duck(1.2); }
      if (T0.t > 1.2) EG.trans = null;
    }
    updateParts(dt); updateFx(dt);
  },
  draw() {
    const p = players[0];
    if (hasAtlas("eglise_" + (EG.plan + 1))) drawFrame("eglise_" + (EG.plan + 1), 0, VW / 2, VH, 1); else R(0, 0, VW, VH, "#1a0612");
    // la lumière des cierges vacille
    R(0, 0, VW, VH, `rgba(20,0,16,${0.12 + 0.05 * Math.sin(time * 3) + 0.03 * Math.sin(time * 11)})`);
    drawFxList(true); drawCampPlayer(p); drawFxList(false);
    for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(Math.round(q.x), Math.round(q.y), q.size, q.size, q.color); }
    ctx.globalAlpha = 1;
    R(0, 0, VW, 16, "rgba(10,6,24,0.7)");
    text("L'église", 6, 8, 9, "#ff5a7a");
    text(["Le parvis", "Les marches", "La nef"][EG.plan], VW - 8, 8, 8, "#e8dcff", "right");
    if (!EG_READY) text("En chantier : les mariés arrivent bientôt…  (→ au bord droit : plan suivant)", VW / 2, 26, 7, "#b9a6e0", "center");
    const f = EG.trans ? (EG.trans.t < 0.6 ? EG.trans.t / 0.6 : 1 - (EG.trans.t - 0.6) / 0.6) : EG.fade;
    if (f > 0) R(0, 0, VW, VH, `rgba(0,0,0,${Math.min(1, f)})`);
    drawDialog();
    if (EG.paused) {
      R(0, 0, VW, VH, "rgba(10,6,24,0.7)"); text("Pause", VW / 2, 110, 16, "#ff5a7a", "center", "#ff5a7a");
      text(say("Échap : reprendre   Q : laverie", "⏸ : reprendre", "Start : reprendre   {B} : laverie"), VW / 2, 136, 8, "#e8dcff", "center");
    }
  },
};
