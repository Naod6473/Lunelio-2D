/* ---------------- Profils et sauvegarde partagée ---------------- */
// Écran « Qui joue ? » (state "profils", après le titre) : chaque profil a sa sauvegarde (sauvegarde.js, PROFILS).
// Nouveau profil : écran "nomprofil" (nom tapé au clavier, ou clavier à l'écran à la manette et au toucher).
// Synchronisation avec le service de la maison (deploy/lunelio_api.py, derrière /api/) : à l'ouverture d'un profil, en
// arrivant à la laverie et quelques secondes après chaque sauvegarde. Les deux versions sont fusionnées (mergeSave) ;
// sans service (fichier local, version autonome, GitHub Pages…) ou sans connexion famille, le jeu garde la sauvegarde
// de l'appareil, sans message d'erreur.
// SYNC.st : "off" (pas de service), "auth" (Cloudflare Access demande la connexion famille), "ok", "wait" (en cours).
const SYNC = { st: "wait", rev: {}, timer: null, busy: false, again: false, remote: [], scores: null };
const NOM_OK = /^[\p{L}\p{N}](?:[\p{L}\p{N}' -]{0,10}[\p{L}\p{N}])?$/u;   // comme le service : 1 à 12 caractères
// SYNC_ON : sauvegarde partagée avec le service de la maison. Désactivée pour l'instant (choix du parent) : les profils
// et l'onglet « Famille » marchent avec les parties de l'appareil, et le jeu n'appelle jamais /api/. Mettre true pour l'activer.
const SYNC_ON = false;
const syncPossible = () => SYNC_ON && AUDIO_MODE !== "embed" && /^https?:$/.test(location.protocol);
async function api(path, opts = {}) {
  if (!syncPossible()) { SYNC.st = "off"; return null; }
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch("api/" + path, { method: opts.method || "GET", body: opts.body, keepalive: !!opts.keepalive, cache: "no-store", credentials: "same-origin",
      redirect: "manual", signal: ctl.signal, headers: opts.body ? { "Content-Type": "application/json" } : {} });
    if (r.type === "opaqueredirect" || r.status === 401 || (r.status === 403 && !opts.body)) { SYNC.st = "auth"; return null; }   // Cloudflare Access
    const ct = r.headers.get("Content-Type") || "";
    if (!ct.includes("application/json")) { SYNC.st = "off"; return null; }   // pas de service (page d'erreur, autre hébergement)
    SYNC.st = "ok";
    return { status: r.status, data: await r.json() };
  } catch (e) { if (SYNC.st !== "auth") SYNC.st = "off"; return null; }
  finally { clearTimeout(to); }
}
async function syncCheck() {
  const r = await api("etat"); if (!r) return;
  const l = await api("profils"); if (l && l.status === 200) SYNC.remote = (l.data.profils || []).filter(p => p && typeof p.id === "string" && typeof p.nom === "string");
}
// Récupère la sauvegarde du profil en cours, la fusionne avec celle de l'appareil, puis renvoie le résultat si besoin
async function syncPull() {
  const P = curProfil(); if (!P) return;
  const r = await api("save/" + P.id); if (!r || P !== curProfil()) return;
  if (r.status === 404) { SYNC.rev[P.id] = 0; return syncPush(); }
  if (r.status !== 200 || !r.data.save) return;
  SYNC.rev[P.id] = r.data.rev;
  const before = JSON.stringify(r.data.save), merged = fillSave(mergeSave(SAVE, r.data.save));
  SAVE = merged; try { localStorage.setItem(saveKey(), JSON.stringify(SAVE)); } catch (e) {}
  checkUnlocks(true);
  if (JSON.stringify(SAVE) !== before) syncPush();
}
async function syncPush(keepalive) {
  const P = curProfil(); if (!P || SYNC.st === "off" || SYNC.st === "auth") return;
  if (SYNC.busy) { SYNC.again = true; return; }
  SYNC.busy = true;
  try {
    for (let tries = 0; tries < 3; tries++) {
      const r = await api("save/" + P.id, { method: "PUT", keepalive, body: JSON.stringify({ nom: P.nom, rev: SYNC.rev[P.id] || 0, save: SAVE }) });
      if (!r || P !== curProfil()) return;
      if (r.status === 200) { SYNC.rev[P.id] = r.data.rev; return; }
      if (r.status === 409 && r.data.conflit === "version") {   // un autre appareil a joué entre-temps : on fusionne et on renvoie
        SYNC.rev[P.id] = r.data.rev; SAVE = fillSave(mergeSave(SAVE, r.data.save));
        try { localStorage.setItem(saveKey(), JSON.stringify(SAVE)); } catch (e) {}
        continue;
      }
      if (r.status === 409 && r.data.conflit === "nom" && typeof r.data.id === "string") { adoptRemote(P, r.data.id); return syncPull(); }
      return;
    }
  } finally { SYNC.busy = false; if (SYNC.again) { SYNC.again = false; syncSoon(); } }
}
// Le nom existe déjà sur le serveur (créé sur un autre appareil) : ce profil devient celui du serveur
function adoptRemote(P, id) {
  const sv = readSave(saveKey(P.id));
  try { if (sv) localStorage.setItem(saveKey(id), JSON.stringify(mergeSave(readSave(saveKey(id)), sv))); localStorage.removeItem(saveKey(P.id)); } catch (e) {}
  PROFILS.list = PROFILS.list.filter(p => p.id !== id && p !== P); P.id = id; PROFILS.list.push(P);
  if (PROFILS.cur !== id) PROFILS.cur = id;
  saveProfils(); SYNC.rev[id] = 0;
}
function syncSoon() {
  if (!curProfil() || SYNC.st === "off" || SYNC.st === "auth") return;
  clearTimeout(SYNC.timer); SYNC.timer = setTimeout(() => syncPush(), 3000);
}
addEventListener("pagehide", () => { if (SYNC.timer) { clearTimeout(SYNC.timer); SYNC.timer = null; syncPush(true); } });
async function syncScores() {
  const r = await api("scores");
  SYNC.scores = r && r.status === 200 ? (r.data.profils || []) : null;
}

/* ---- Choisir, créer ---- */
const profileMenu = () => {
  const m = new Map(PROFILS.list.map(p => [p.id, { id: p.id, nom: p.nom, local: true }]));
  for (const p of SYNC.remote) { const o = m.get(p.id) || { id: p.id, nom: p.nom }; o.remote = true; o.mondes = p.mondes; o.maj = p.maj; m.set(p.id, o); }
  return [...m.values()];
};
const PF = { sel: 0, msg: null, busy: false };
function openProfiles() {
  state = "profils"; PF.msg = null; PF.busy = false;
  const list = profileMenu(); PF.sel = Math.max(0, list.findIndex(p => p.id === PROFILS.cur));
  syncCheck().then(() => { if (state === "profils") { const l = profileMenu(); if (PROFILS.cur) PF.sel = Math.max(0, l.findIndex(p => p.id === PROFILS.cur)); } });
}
async function selectProfile(p) {
  if (PF.busy) return; PF.busy = true;
  if (!PROFILS.list.some(q => q.id === p.id)) PROFILS.list.push({ id: p.id, nom: p.nom });
  PROFILS.cur = p.id; saveProfils();
  // profil créé sur un autre appareil : on part de sa sauvegarde du serveur (pas d'une partie neuve)
  if (!readSave(saveKey(p.id)) && SYNC.st === "ok") {
    const r = await api("save/" + p.id);
    if (r && r.status === 200 && r.data.save) { try { localStorage.setItem(saveKey(p.id), JSON.stringify(r.data.save)); } catch (e) {} SYNC.rev[p.id] = r.data.rev; }
  }
  loadGame(); afterProfile();
  PF.busy = false;
  syncPull();
  audio.sfx("start"); openChars("menu");
}
// Le héros, les armes et le reste suivent la sauvegarde du profil
function afterProfile() {
  const i = CHARS.findIndex(C => C.id === SAVE.lastChar); charIdx = i >= 0 ? i : 0; charSel = charIdx;
  if (COOP.nom === curProfil()?.nom) COOP.nom = null;
}
function createProfile(nom) {
  const same = profileMenu().find(p => p.nom.toLocaleLowerCase("fr") === nom.toLocaleLowerCase("fr"));
  if (same) { PF.msg = `« ${same.nom} » existe déjà : on le reprend`; return selectProfile(same); }
  const b = new Uint8Array(8); crypto.getRandomValues(b);
  const id = "p" + [...b].map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 14);
  // le premier profil reprend la partie d'avant les profils (s'il y en avait une)
  const old = !PROFILS.legacy && !PROFILS.list.length ? readSave(SAVE_KEY) : null;
  if (old) { try { localStorage.setItem(saveKey(id), JSON.stringify(old)); } catch (e) {} }
  PROFILS.legacy = true;
  PROFILS.list.push({ id, nom }); saveProfils();
  if (old) toast("Ta partie continue", `dans le profil ${nom}`, "start", "#7dffb0");
  return selectProfile({ id, nom });
}
const PF_ROW = i => ({ x: 120, y: 44 + i * 20, w: 240, h: 17 });
const PF_PAGE = 8;
const PF_LOGIN = { x: 170, y: 232, w: 140, h: 16 };
SCREENS.profils = {
  update() {
    const list = profileMenu(), n = list.length + 1;
    PF.sel = clamp(PF.sel, 0, n - 1);
    if (hit("Escape", "GB", "Backspace") || (hit("Mouse0") && inside(BACK_RECT))) { audio.sfx("back"); goMenu(); return; }
    if (hit("ArrowUp", "KeyW", "GUp")) { PF.sel = (PF.sel + n - 1) % n; audio.sfx("select"); }
    if (hit("ArrowDown", "KeyS", "GDown")) { PF.sel = (PF.sel + 1) % n; audio.sfx("select"); }
    const page = Math.floor(PF.sel / PF_PAGE);
    if (hit("Mouse0")) {
      if (SYNC.st === "auth" && inside(PF_LOGIN)) { location.href = "api/connexion"; return; }
      for (let i = 0; i < PF_PAGE; i++) { const k = page * PF_PAGE + i; if (k < n && inside(PF_ROW(i))) { if (PF.sel === k || TOUCH) { PF.sel = k; this.go(list); return; } PF.sel = k; audio.sfx("select"); } }
    }
    if (hit("Enter", "NumpadEnter", "Space", "GA", "GStart")) this.go(list);
  },
  go(list) {
    if (PF.sel >= list.length) { openNameEntry(); return; }
    if (list[PF.sel]) selectProfile(list[PF.sel]);
  },
  draw() {
    drawMenuBg(); R(0, 0, VW, VH, "rgba(13,8,32,0.6)");
    text("Qui joue ?", VW / 2, 22, 16, ch().ui, "center", ch().ui);
    drawBack("◀ Titre");
    const list = profileMenu(), n = list.length + 1, page = Math.floor(PF.sel / PF_PAGE);
    for (let i = 0; i < PF_PAGE; i++) {
      const k = page * PF_PAGE + i; if (k >= n) break;
      const r = PF_ROW(i), sel = k === PF.sel, p = list[k];
      R(r.x, r.y, r.w, r.h, sel ? "rgba(255,255,255,0.16)" : "rgba(20,12,40,0.85)");
      ctx.strokeStyle = sel ? ch().ui : "#3a2a5c"; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      if (!p) { text("+ Nouveau profil", r.x + 10, r.y + 9, 9, "#7dffb0"); continue; }
      text(p.nom, r.x + 10, r.y + 9, 9, sel ? "#ffffff" : "#e8dcff");
      const mondes = p.id === PROFILS.cur ? SAVE.camp.done : p.local ? ((readSave(saveKey(p.id)) || {}).camp || {}).done || 0 : p.mondes || 0;
      text(`${mondes}/${CWORLDS.length} mondes`, r.x + r.w - 8, r.y + 9, 7, "#b9a6e0", "right");
      if (p.id === PROFILS.cur) text("◆", r.x + r.w + 8, r.y + 9, 7, ch().ui, "center");
    }
    if (n > PF_PAGE) text(`Page ${page + 1}/${Math.ceil(n / PF_PAGE)}`, VW / 2, 210, 7, "#b9a6e0", "center");
    // état de la sauvegarde partagée
    if (SYNC.st === "ok") text("✓ Sauvegardes partagées avec la maison", VW / 2, 222, 8, "#7dffb0", "center");
    else if (SYNC.st === "auth") { text("Pour partager les sauvegardes :", VW / 2, 222, 7, "#b9a6e0", "center"); drawButton(PF_LOGIN, "Connexion famille", !TOUCH && inside(PF_LOGIN), "#fccc28", 8); }
    else if (SYNC.st === "off" && SYNC_ON) text("Sauvegarde sur cet appareil", VW / 2, 222, 8, "#b9a6e0", "center");
    if (PF.msg) text(PF.msg, VW / 2, 36, 8, "#fccc28", "center");
    text(say("Flèches pour choisir, Entrée pour jouer", "Touche ton nom pour jouer", "Croix pour choisir, {A} pour jouer"), VW / 2, 256, 8, "#b9a6e0", "center");
  },
};

/* ---- Saisie du nom : clavier, ou clavier à l'écran (manette, toucher, souris) ---- */
const NK_ROWS = ["ABCDEFGHIJ", "KLMNOPQRST", "UVWXYZÉÈÇÏ", "0123456789", "-' ⌫✓"];
const NE = { nom: "", r: 0, c: 0, err: null };
function openNameEntry() { state = "nomprofil"; Object.assign(NE, { nom: "", r: 0, c: 0, err: null }); audio.sfx("select"); }
addEventListener("keydown", e => {
  if (state !== "nomprofil" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key && e.key.length === 1 && /[\p{L}\p{N}' -]/u.test(e.key)) { e.preventDefault(); nameType(e.key); }
});
function nameType(ch1) {
  if (NE.nom.length >= 12) { audio.sfx("nope"); return; }
  if (ch1 === " " && (!NE.nom || NE.nom.endsWith(" "))) return;
  NE.nom += NE.nom ? ch1.toLocaleLowerCase("fr") : ch1.toLocaleUpperCase("fr");   // une majuscule au début, comme un prénom
  NE.err = null; audio.sfx("select");
}
function nameOk() {
  const nom = NE.nom.trim();
  if (!NOM_OK.test(nom)) { NE.err = "Un nom de 1 à 12 lettres"; audio.sfx("nope"); return; }
  createProfile(nom);
}
const nkRect = (r, c) => { const row = NK_ROWS[r], w = row.length === 10 ? 30 : r === 4 ? 46 : 30; return { x: VW / 2 - (row.length * (w + 4) - 4) / 2 + c * (w + 4), y: 110 + r * 26, w, h: 22 }; };
function nkPress(k) {
  if (k === "⌫") { NE.nom = NE.nom.slice(0, -1); audio.sfx("back"); }
  else if (k === "✓") nameOk();
  else nameType(k);
}
SCREENS.nomprofil = {
  update() {
    if (hit("Escape", "GB") || (hit("Mouse0") && inside(BACK_RECT))) { audio.sfx("back"); openProfiles(); return; }
    if (hit("Backspace")) { NE.nom = NE.nom.slice(0, -1); audio.sfx("back"); }
    if (hit("Enter", "NumpadEnter", "GStart")) { nameOk(); return; }
    // clavier à l'écran (seulement les flèches et la croix : les lettres tapées écrivent le nom)
    if (hit("ArrowUp", "GUp")) { NE.r = (NE.r + NK_ROWS.length - 1) % NK_ROWS.length; NE.c = Math.min(NE.c, NK_ROWS[NE.r].length - 1); audio.sfx("select"); }
    if (hit("ArrowDown", "GDown")) { NE.r = (NE.r + 1) % NK_ROWS.length; NE.c = Math.min(NE.c, NK_ROWS[NE.r].length - 1); audio.sfx("select"); }
    if (hit("ArrowLeft", "GLeft")) { NE.c = (NE.c + NK_ROWS[NE.r].length - 1) % NK_ROWS[NE.r].length; audio.sfx("select"); }
    if (hit("ArrowRight", "GRight")) { NE.c = (NE.c + 1) % NK_ROWS[NE.r].length; audio.sfx("select"); }
    if (hit("GA")) { nkPress([...NK_ROWS[NE.r]][NE.c]); return; }
    if (hit("GX", "GY")) { NE.nom = NE.nom.slice(0, -1); audio.sfx("back"); }
    if (hit("Mouse0")) NK_ROWS.forEach((row, r) => [...row].forEach((k, c) => { if (state === "nomprofil" && inside(nkRect(r, c))) { NE.r = r; NE.c = c; nkPress(k); } }));
  },
  draw() {
    drawMenuBg(); R(0, 0, VW, VH, "rgba(13,8,32,0.7)");
    text("Nouveau profil", VW / 2, 22, 16, ch().ui, "center", ch().ui);
    drawBack("◀ Retour");
    text("Comment tu t'appelles ?", VW / 2, 50, 9, "#e8dcff", "center");
    R(VW / 2 - 90, 62, 180, 26, "rgba(20,12,40,0.95)"); ctx.strokeStyle = ch().ui; ctx.strokeRect(VW / 2 - 89.5, 62.5, 179, 25);
    text(NE.nom + (Math.floor(time * 2) % 2 ? "_" : " "), VW / 2, 76, 13, "#ffffff", "center");
    if (NE.err) text(NE.err, VW / 2, 98, 8, "#ff8ab0", "center");
    NK_ROWS.forEach((row, r) => [...row].forEach((k, c) => {
      const b = nkRect(r, c), sel = PAD && r === NE.r && c === NE.c;
      const label = k === " " ? "espace" : k === "⌫" ? "⌫ effacer" : k === "✓" ? "✓ OK" : k;
      drawButton(b, label, sel || (!TOUCH && inside(b)), k === "✓" ? "#7dffb0" : "#e8dcff", k.length > 1 || label.length > 1 ? 7 : 10);
    }));
    text(say("Tape ton nom au clavier, puis Entrée", "Touche les lettres, puis ✓ OK", "Croix et {A} pour écrire, {X} pour effacer, {START} pour valider"), VW / 2, 256, 8, "#b9a6e0", "center");
  },
};

/* ---- Coop : le joueur 2 peut choisir son nom, pour les records à deux ---- */
function coopNames() { return ["Invité", ...profileMenu().map(p => p.nom).filter(nm => nm !== curProfil()?.nom)]; }

/* ---- Tableau des scores familial (onglet « Famille » des collections) ---- */
// Résumé d'une sauvegarde, comme celui du service (resume() de lunelio_api.py)
function saveSummary(sv) {
  sv = sv || {};
  const best = {}; for (const [k, v] of Object.entries(sv.best || {})) if (k.startsWith("camp|") && v && typeof v.time === "number") best[k] = v.time;
  const chal = {}; for (const [k, c] of Object.entries(sv.chal || {})) if (c && c.best) chal[k] = c.best;
  return { mondes: (sv.camp || {}).done || 0, chaussettes: Object.keys(sv.socks || {}).length, badges: Object.keys(sv.got || {}).filter(k => k.startsWith("badge:")).length,
    best, rush: (sv.rush || {}).best || {}, rushAvec: (sv.rush || {}).avec || {}, dahaka: (sv.dahaka || {}).best || {}, chal };
}
// Les profils du tableau : ceux du serveur (si on y a accès), complétés par ceux de cet appareil (le profil en cours est à jour)
function familyRows() {
  const m = new Map();
  for (const p of SYNC.scores || []) m.set(p.id, { ...p });
  for (const p of PROFILS.list) {
    const sv = p.id === PROFILS.cur ? SAVE : readSave(saveKey(p.id)); if (!sv) continue;
    const o = m.get(p.id), s = saveSummary(sv);
    m.set(p.id, o && p.id !== PROFILS.cur ? o : { id: p.id, nom: p.nom, ...s });
  }
  return [...m.values()];
}
const FAM = { diff: null };
function familyRecords(rows, d) {
  const recs = [];
  const bestOf = (get, better, fmt, label, medal) => {
    let top = null;
    for (const r of rows) { const v = get(r); if (typeof v === "number" && (!top || better(v, top.v))) top = { v, who: r.nom, r }; }
    recs.push({ label, top, fmt, medal });
  };
  const lt = (a, b) => a < b, gt = (a, b) => a > b;
  CWORLDS.forEach((W, i) => bestOf(r => r.best[`camp|${d}|${W.id}`], lt, fmtTime, `${i + 1}. ${W.name}`, v => medalOf(W.id, v)));
  bestOf(r => r.rush[`${d}|1`], lt, fmtTime, "Boss rush (seul)", v => medalOf("rush", v));
  bestOf(r => r.rush[`${d}|2`], lt, fmtTime, "Boss rush (à deux)", v => medalOf("rush", v));
  const last = recs[recs.length - 1]; if (last.top) last.top.who += " + " + (last.top.r.rushAvec[`${d}|2`] || "Invité");
  bestOf(r => r.dahaka[d], gt, v => `${Math.floor(v)} m`, "Dahaka : temple", null);
  bestOf(r => r.dahaka[`grotte|${d}`], gt, v => `${Math.floor(v)} m`, "Dahaka : grotte", null);
  return recs;
}
function openFamily() { FAM.diff = FAM.diff || df().id; syncScores(); }
function drawAlbumFamily() {
  const d = FAM.diff || df().id, D = DIFFS.find(x => x.id === d) || df(), rows = familyRows();
  text("Records de la famille", 12, 32, 9, "#fccc28");
  drawButton({ x: 150, y: 25, w: 96, h: 14 }, `${D.label} ▸`, !TOUCH && inside({ x: 150, y: 25, w: 96, h: 14 }), D.color || "#e8dcff", 7);
  if (!rows.length) { text("Pas encore de profil.", 12, 60, 8, "#b9a6e0"); return; }
  familyRecords(rows, d).forEach((rc, i) => {
    const y = 50 + i * 19;
    R(10, y - 7, 290, 16, i % 2 ? "rgba(20,12,40,0.55)" : "rgba(30,18,56,0.7)");
    text(rc.label, 14, y + 1, 7, "#e8dcff");
    if (!rc.top) { text("—", 296, y + 1, 7, "#5a4a80", "right"); return; }
    const md = rc.medal ? rc.medal(rc.top.v) : 0;
    text(rc.fmt(rc.top.v), 196, y + 1, 7, "#7dffb0", "right"); if (md) drawMedal(md, 206, y + 1, 0.55);
    text(rc.top.who.length > 14 ? rc.top.who.slice(0, 13) + "…" : rc.top.who, 296, y + 1, 7, "#fccc28", "right");
  });
  // les joueurs de la famille
  drawPanel(308, 26, 164, 226);
  text("Les joueurs", 318, 36, 8, "#fccc28");
  rows.sort((a, b) => b.mondes - a.mondes || b.chaussettes - a.chaussettes).slice(0, 10).forEach((r, i) => {
    const y = 52 + i * 20;
    text(r.nom, 316, y, 8, r.id === PROFILS.cur ? ch().ui : "#ffffff");
    text(`${r.mondes}/${CWORLDS.length} mondes · ${r.chaussettes} chaussettes · ${r.badges} badges`, 316, y + 9, 6, "#b9a6e0");
  });
  const st = SYNC.st === "ok" ? "Toute la famille (serveur de la maison)" : "Les joueurs de cet appareil";
  text(st, 12, 250, 7, "#b9a6e0");
}

syncReady = true;
// Au démarrage : le service répond-il ? Si oui, la sauvegarde du profil en cours se met à jour en arrière-plan.
setTimeout(() => syncCheck().then(() => { if (curProfil() && SYNC.st === "ok") syncPull(); }), 1200);
