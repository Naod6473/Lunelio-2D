/* ---------------- Sauvegarde commune (version 3) ---------------- */
// Une seule sauvegarde pour tous les héros, dans localStorage (lunelio-save). Les réglages restent dans lunelio-options.
// SAVE.got est le registre des récompenses déjà données : grant() n'agit qu'une fois par clé, même après un rechargement.
// Migration : les anciennes clés (lunelio-v2-…, lunelio-progress-…, lunelio-best-…) sont relues une fois, puis laissées en place
// (une ancienne version du jeu reste donc jouable si on revient en arrière).
const SAVE_KEY = "lunelio-save", SAVE_VERSION = 3;
function newSave() {
  return {
    v: SAVE_VERSION,
    camp: { done: 0, resume: {}, rooms: {}, visited: {} },   // done : mondes terminés ; resume : salle où reprendre par monde
    bonus: { done: 0 },                                      // ancienne aventure : mondes terminés
    best: {},                                                // "camp|diff|monde" ou "bonus|diff|monde" → { time, deaths }
    socks: {}, gold: {},                                     // chaussettes principales (par salle) et dorées (chemins secrets)
    seen: { foe: {}, oldFoe: {}, boss: {}, oldBoss: {}, phase: {}, char: {}, met: {} },
    flags: {}, got: {}, quests: {}, chal: {}, memSeen: {}, repaired: {},
    cos: { char: {}, machine: null, hub: { tile: "tile_damier", light: "light_blanc", sign: "sign_violet", items: {}, show: {} } },
    jukebox: null, lastChar: null,
    weapons: { owned: randomWeapons(2), eq: {} },            // armes du râtelier : possédées, et arme choisie par héros
    dahaka: { best: {} },
    rush: { best: {} },                                      // boss rush : record (secondes) par difficulté, en solo ou à deux                                    // niveau secret : record (mètres) par difficulté
  };
}
// n armes tirées au hasard parmi celles qu'on n'a pas encore (le sabre est toujours là)
function randomWeapons(n, owned = {}) {
  const left = WEAPONS.filter(w => w.id !== "sabre" && !owned[w.id]).map(w => w.id), o = {};
  for (let i = 0; i < n && left.length; i++) o[left.splice(Math.floor(Math.random() * left.length), 1)[0]] = 1;
  return o;
}
// Après un boss vaincu : une nouvelle arme au hasard (tant qu'il en reste)
function weaponReward(silent) {
  const got = randomWeapons(1, SAVE.weapons.owned), id = Object.keys(got)[0]; if (!id) return;
  SAVE.weapons.owned[id] = 1;
  if (!silent) toast("Nouvelle arme !", WEAPON_BY_ID[id].name + " · au râtelier", "equip", "#ffb43c");
}
let SAVE = newSave();
function saveGame() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
// Complète une sauvegarde relue avec les champs manquants (versions futures ou fichier abîmé)
function fillSave(o) {
  const base = newSave();
  const fill = (dst, src) => { for (const k in src) { if (dst[k] === undefined || dst[k] === null && src[k] !== null) dst[k] = src[k]; else if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k]) && typeof dst[k] === "object") fill(dst[k], src[k]); } };
  fill(o, base); o.v = SAVE_VERSION;
  o.camp.done = clamp(+o.camp.done || 0, 0, CWORLDS.length); o.bonus.done = clamp(+o.bonus.done || 0, 0, WORLDS.length);
  return o;
}
function loadGame() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (e) { o = null; }
  if (o && typeof o === "object" && o.v >= 3) { SAVE = fillSave(o); }
  else { SAVE = migrateOld(); saveGame(); }
  // armes : une partie commencée avant le râtelier reçoit une arme de plus par boss déjà vaincu
  if (!SAVE.flags.armes) { SAVE.flags.armes = 1; for (let i = 0; i < Object.keys(SAVE.seen.boss).length + Object.keys(SAVE.seen.oldBoss).length; i++) weaponReward(true); saveGame(); }
  checkUnlocks(true);
}
// Relit les sauvegardes des versions précédentes (par personnage) et les fusionne : le meilleur de chaque héros est gardé.
function migrateOld() {
  const S = newSave(), get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ids = CHARS.map(C => C.id);
  let any = false;
  for (const id of ids) {
    const p = +get(`lunelio-v2-progress-${id}`) || 0; if (p) any = true;
    S.camp.done = Math.max(S.camp.done, clamp(p, 0, CWORLDS.length));
    if (p > 0) S.seen.char[id] = 1;
    const b = +get(`lunelio-progress-${id}`) || 0; S.bonus.done = Math.max(S.bonus.done, clamp(b, 0, WORLDS.length));
    CWORLDS.forEach(W => {
      const r = +get(`lunelio-v2-room-${id}-${W.id}`) || 0; if (r > (S.camp.resume[W.id] || 0)) S.camp.resume[W.id] = r;
      for (const D of DIFFS) {
        let v = null; try { v = JSON.parse(get(`lunelio-v2-best-${id}-${D.id}-${W.id}`) || "null"); } catch (e) {}
        const k = `camp|${D.id}|${W.id}`; if (v && typeof v.time === "number" && (!S.best[k] || v.time < S.best[k].time)) S.best[k] = { time: v.time, deaths: v.deaths || 0 };
      }
    });
    WORLDS.forEach((W, wi) => {
      for (const D of DIFFS) {
        let v = null; try { v = JSON.parse(get(`lunelio-best-${id}-${D.id}-${wi}`) || "null"); } catch (e) {}
        const k = `bonus|${D.id}|${wi}`; if (v && typeof v.time === "number" && (!S.best[k] || v.time < S.best[k].time)) S.best[k] = { time: v.time, deaths: v.deaths || 0 };
      }
    });
  }
  // mondes déjà terminés : boss et ennemis vaincus, pièces déjà réparées (pas de dialogue rejoué)
  for (let i = 0; i < S.camp.done; i++) { const W = CWORLDS[i]; S.seen.boss[W.boss] = 1; S.seen.foe[W.enemy] = 1; S.camp.visited[W.id] = 1; S.repaired[W.id] = 1; S.seen.phase[W.boss] = BIG[W.boss].moves.length; }
  if (S.camp.done < CWORLDS.length && S.camp.done > 0) S.camp.visited[CWORLDS[S.camp.done].id] = 1;
  for (let i = 0; i < S.bonus.done; i++) S.seen.oldBoss[WORLDS[i].id] = 1;
  if (S.bonus.done > 0) { S.seen.oldFoe.walker = 1; S.seen.oldFoe.shooter = 1; }
  S.lastChar = get("lunelio-perso");
  if (any) S.flags.migrated = 2;
  return S;
}
// Remet tout à zéro (écran des options, avec confirmation) : les réglages ne bougent pas
function resetGame() { SAVE = newSave(); SAVE.flags.armes = 1; saveGame(); checkUnlocks(true); }

/* ---- Compteurs ---- */
const SOCK_ROOMS = Object.keys(AJOUTS.socks || {});
const socksCount = () => SOCK_ROOMS.filter(r => SAVE.socks[r]).length;
const socksTotal = () => SOCK_ROOMS.length;
const worldRooms = wid => (CWORLDS.find(W => W.id === wid) || { rooms: [] }).rooms.map(r => r.id);
const socksInWorld = wid => worldRooms(wid).filter(r => SAVE.socks[r]).length;
const socksWorldTotal = wid => worldRooms(wid).filter(r => AJOUTS.socks[r]).length;
const questsDone = () => QUESTS.filter(q => (SAVE.quests[q.id] || {}).st === "done").length;
const challengesDone = () => CHALLENGES.filter(c => (SAVE.chal[c.id] || {}).done).length;
const programsDone = () => new Set(CHALLENGES.filter(c => (SAVE.chal[c.id] || {}).done).map(c => c.prog)).size;
const has = key => !!SAVE.got[key];
const memoriesCount = () => MEMORIES.filter(m => has("mem:" + m.id)).length;
const cardsIn = cat => CARDS.filter(c => c.cat === cat);
const catComplete = cat => cardsIn(cat).every(c => has("card:" + c.id));

// Évalue une condition des registres (voir l'en-tête de registres.js)
function testCond(c) {
  if (!c) return false;
  if (c.all) return c.all.every(testCond);
  if (c.start) return true;
  if (c.world !== undefined) return SAVE.camp.done >= c.world;
  if (c.weapons !== undefined) return Object.keys(SAVE.weapons.owned).length >= c.weapons;
  if (c.boss) return !!SAVE.seen.boss[c.boss];
  if (c.foe) return !!SAVE.seen.foe[c.foe];
  if (c.char) return !!SAVE.seen.char[c.char];
  if (c.socks !== undefined) return socksCount() >= c.socks;
  if (c.socksWorld) return socksWorldTotal(c.socksWorld) > 0 && socksInWorld(c.socksWorld) >= socksWorldTotal(c.socksWorld);
  if (c.socksWorldAny) return CWORLDS.some(W => socksWorldTotal(W.id) > 0 && socksInWorld(W.id) >= socksWorldTotal(W.id));
  if (c.quest) return (SAVE.quests[c.quest] || {}).st === "done";
  if (c.questsDone !== undefined) return questsDone() >= c.questsDone;
  if (c.challenge) return !!(SAVE.chal[c.challenge] || {}).done;
  if (c.challengesDone !== undefined) return challengesDone() >= c.challengesDone;
  if (c.programsDone !== undefined) return programsDone() >= c.programsDone;
  if (c.memory) return has("mem:" + c.memory);
  if (c.memories !== undefined) return memoriesCount() >= c.memories;
  if (c.badge) return has("badge:" + c.badge);
  if (c.cardCat) return catComplete(c.cardCat);
  if (c.cardCatComplete !== undefined) return CARD_CATS.filter(([k]) => catComplete(k)).length >= c.cardCatComplete;
  if (c.cardsAll) return CARDS.every(k => has("card:" + k.id));
  if (c.charsAll) return CHARS.every(C => SAVE.seen.char[C.id]);
  if (c.oldFoe) return !!SAVE.seen.oldFoe[c.oldFoe];
  if (c.oldBoss) return !!SAVE.seen.oldBoss[c.oldBoss];
  if (c.bonusWorld !== undefined) return SAVE.bonus.done >= c.bonusWorld;
  if (c.flag) return !!SAVE.flags[c.flag];
  if (c.medalsGold !== undefined) return CWORLDS.filter(W => DIFFS.some(D => { const b = SAVE.best[`camp|${D.id}|${W.id}`]; return b && medalOf(W.id, b.time) === 3; })).length >= c.medalsGold;
  if (c.visited) return !!SAVE.camp.visited[c.visited];
  if (c.met) return !!SAVE.seen.met[c.met];
  return false;
}

/* ---- Récompenses ---- */
// Annonces à l'écran (une à la fois) : nouvelle carte, badge, cosmétique, décoration, musique, souvenir, palier
let toasts = [];
const REWARD_INFO = {
  card: [k => (CARD_BY_ID[k] || {}).name || heroCardName(k), "Nouvelle carte", "card"],
  badge: [k => (BADGES.find(b => b.id === k) || {}).name, "Nouveau badge", "badge"],
  cos: [k => (COS_BY_ID[k] || {}).name, "Nouvelle tenue", "equip"],
  decor: [k => (DECOR_BY_ID[k] || {}).name, "Nouvelle décoration", "equip"],
  track: [k => (TRACK_BY_ID[k] || {}).name, "Nouvelle musique", "coin"],
  mem: [k => (MEM_BY_ID[k] || {}).title, "Nouveau souvenir", "memory"],
  tres: [k => (TREASURE_BY_ID[k] || {}).name, "Nouveau trésor !", "card"],
};
function heroCardName(k) { const C = CHARS.find(c => "heros_" + c.id === k); return C ? C.name : k; }
function toast(title, sub, snd, col = "#7dffb0") { toasts.push({ title, sub, t: 0, col, snd }); }
// Donne une récompense une seule fois ; silent : sans annonce (chargement, migration)
function grant(key, silent) {
  if (!key || SAVE.got[key]) return false;
  SAVE.got[key] = 1;
  const [type, id] = key.split(/:(.*)/);
  const R = REWARD_INFO[type];
  if (R && !silent) toast(R[1], R[0](id) || id, R[2], type === "badge" || type === "tres" ? "#fccc28" : type === "mem" ? "#ff8ab0" : "#7dffb0");
  return true;
}
// Passe en revue tous les registres et donne ce qui vient d'être mérité (plusieurs tours : un badge peut en débloquer un autre)
function checkUnlocks(silent) {
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    const list = [
      ...CARDS.filter(c => c.cond).map(c => ["card:" + c.id, c.cond]),
      ...BADGES.map(b => ["badge:" + b.id, b.cond]),
      ...COSMETICS.map(c => ["cos:" + c.id, c.cond]),
      ...DECOR.map(d => ["decor:" + d.id, d.cond]),
      ...TRACKS.map(t => ["track:" + t.id, t.cond]),
      ...MEMORIES.map(m => ["mem:" + m.id, m.cond]),
      ...TREASURES.map(t => ["tres:" + t.id, t.cond]),
    ];
    // une musique dont le fichier manque est débloquée sans annonce (le jukebox l'affiche « à venir »)
    const quiet = key => key.startsWith("track:") && !trackAvailable(TRACK_BY_ID[key.slice(6)]);
    for (const [key, cond] of list) if (!SAVE.got[key] && testCond(cond)) { grant(key, silent || !!cond.start || quiet(key)); changed = true; }
    if (!changed) break;
  }
  for (const n of SOCK_TIERS) { const k = "tier:" + n; if (!SAVE.got[k] && socksCount() >= n) { SAVE.got[k] = 1; if (!silent) toast("Palier atteint !", `${n} chaussettes`, "milestone", "#fccc28"); } }
  updateQuests();
  saveGame();
}
// Avancée des quêtes : objets ramassés ou défi réussi → la quête est prête à être rendue au client
function updateQuests() {
  for (const q of QUESTS) {
    const s = SAVE.quests[q.id]; if (!s || s.st !== "active") continue;
    const g = q.goal;
    const ok = g.type === "items" ? g.items.every(i => s.items && s.items[i]) : g.type === "challenge" ? !!(SAVE.chal[g.challenge] || {}).done : false;
    if (ok) { s.st = "ready"; toast("Quête accomplie !", `Va voir ${NPCS[q.npc].name}`, "quest_done", "#ff8ab0"); }
  }
}
// Événements du jeu : chaque système appelle emit(), qui note le fait puis vérifie les récompenses
function emit(type, d = {}) {
  const S = SAVE;
  switch (type) {
    case "sock": if (S.socks[d.room]) return; S.socks[d.room] = 1; break;
    case "gold": if (S.gold[d.id]) return; S.gold[d.id] = 1; S.flags.secret = 1; break;
    case "foe": if (S.seen.foe[d.sp]) return; S.seen.foe[d.sp] = 1; break;
    case "oldFoe": if (S.seen.oldFoe[d.type]) return; S.seen.oldFoe[d.type] = 1; break;
    case "phase": if ((S.seen.phase[d.id] || 0) >= d.n) return; S.seen.phase[d.id] = d.n; break;
    case "boss": S.seen.boss[d.id] = 1; if (d.noDamage) S.flags.noDamageBoss = 1; if (d.doom) S.flags.doomBoss = 1; weaponReward(); break;
    case "oldBoss": S.seen.oldBoss[d.wid] = 1; if (d.doom) S.flags.doomBoss = 1; weaponReward(); break;
    case "roomDone": S.camp.rooms[d.room] = 1; S.seen.char[d.char] = 1; if (d.doom) S.flags.doomRoom = 1; break;
    case "worldDone": S.camp.done = Math.max(S.camp.done, d.wi + 1); if (d.duo) S.flags.duoWorld = 1; break;
    case "rescue": if (S.flags.rescue) return; S.flags.rescue = 1; break;
    case "rush": S.flags.rushDone = 1; if (medalOf("rush", d.time) === 3) S.flags.goldMedal = 1; break;
    case "medal": if (d.m === 3) S.flags.goldMedal = 1; break;
    case "bonusDone": S.bonus.done = Math.max(S.bonus.done, d.wi + 1); break;
    case "visit": if (S.camp.visited[d.wid]) return; S.camp.visited[d.wid] = 1; break;
    case "met": if (S.seen.met[d.npc]) return; S.seen.met[d.npc] = 1; break;
    case "questItem": { const s = S.quests[d.quest]; if (!s || s.st !== "active" || (s.items && s.items[d.id])) return; s.items = s.items || {}; s.items[d.id] = 1; break; }
    case "challenge": { const c = S.chal[d.id] = S.chal[d.id] || { best: {} }; c.done = 1; break; }
  }
  checkUnlocks(false);
}

/* ---- Accès pratiques (campagne et ancienne aventure) ---- */
const campProgress = () => SAVE.camp.done;
function setCampProgress(n) { if (n > SAVE.camp.done) { SAVE.camp.done = clamp(n, 0, CWORLDS.length); checkUnlocks(false); } }
function campResume(wi) { return clamp(+SAVE.camp.resume[CWORLDS[wi].id] || 0, 0, CWORLDS[wi].rooms.length - 1); }
function setCampResume(wi, ri) { if (ri > 0) SAVE.camp.resume[CWORLDS[wi].id] = ri; else delete SAVE.camp.resume[CWORLDS[wi].id]; saveGame(); }
const campBestKey = wi => `camp|${df().id}|${CWORLDS[wi].id}`;
function campBest(wi) { return SAVE.best[campBestKey(wi)] || null; }
function getProgress() { return Math.min(WORLDS.length, SAVE.bonus.done); }
function setProgress(n) { if (n > SAVE.bonus.done) emit("bonusDone", { wi: n - 1 }); }
const bestKey = wi => `bonus|${df().id}|${wi}`;
function getBest(wi) { return SAVE.best[bestKey(wi)] || null; }
function setBest(k, v) { SAVE.best[k] = v; saveGame(); }

/* ---- Annonces ---- */
function updateToasts(rdt) {
  const t = toasts[0]; if (!t) return;
  if (t.t === 0 && t.snd) audio.sfx(t.snd);
  t.dur = t.dur || (toasts.length > 3 ? 1.3 : 2.4);   // plusieurs annonces à la suite : chacune reste moins longtemps
  t.t += rdt; if (t.t > t.dur) toasts.shift();
}
function drawToasts() {
  const t = toasts[0]; if (!t) return;
  const k = Math.min(1, t.t / 0.25, ((t.dur || 2.4) - t.t) / 0.3), y = VH - 64 + (1 - k) * 30;
  ctx.font = `700 9px ${FONT}`; const big = ctx.measureText(t.sub).width < 200, fs = big ? 9 : 7;
  ctx.font = `700 ${fs}px ${FONT}`; const w = Math.max(120, ctx.measureText(t.sub).width + 24);
  ctx.globalAlpha = Math.max(0, k);
  R(Math.round(VW - w - 8), Math.round(y), Math.round(w), 26, "rgba(10,6,24,0.92)");
  ctx.strokeStyle = t.col; ctx.lineWidth = 1; ctx.strokeRect(Math.round(VW - w - 8) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, 25);
  text(t.title, VW - w / 2 - 8, y + 8, 7, t.col, "center");
  text(t.sub, VW - w / 2 - 8, y + 18, fs, "#ffffff", "center");
  ctx.globalAlpha = 1;
}
loadGame();
