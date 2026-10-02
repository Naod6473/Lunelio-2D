/* ---------------- Écrans de la laverie ---------------- */
// Collections (cartes, badges, chaussettes), vestiaire, décoration, jukebox et souvenirs.
// Commandes communes : flèches (ou croix) pour choisir, Entrée / {A} pour valider, Échap / {B} pour revenir à la laverie ;
// la souris et le toucher marchent partout (onglets, cases, bouton « ◀ Laverie »). Haut depuis la première ligne : les onglets.
const BACK_RECT = { x: 6, y: 4, w: 58, h: 16 };
function backToHub() { audio.sfx("back"); state = "hub"; }
function uiBack() { return hit("Escape", "GB", "Backspace") || (hit("Mouse0") && inside(BACK_RECT)); }
function drawBack(label = "◀ Laverie") { drawButton(BACK_RECT, label, !TOUCH && inside(BACK_RECT), "#b9a6e0", 8); }
function drawPanel(x, y, w, h, col = "#3a2a5c", fill = "rgba(14,8,30,0.92)") { R(x, y, w, h, fill); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
// Onglets : renvoie l'index cliqué (ou -1)
const tabRect = (i, n, x0 = 72, w = VW - 80) => ({ x: x0 + i * Math.floor(w / n), y: 4, w: Math.floor(w / n) - 4, h: 16 });
function drawTabs(tabs, cur, focus, x0, w) {
  tabs.forEach((t, i) => { const r = tabRect(i, tabs.length, x0, w), on = i === cur;
    R(r.x, r.y, r.w, r.h, on ? (focus ? "#ffffff" : ch().ui) : "rgba(20,12,40,0.9)"); ctx.strokeStyle = on ? "#ffffff" : "#3a2a5c"; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    text(t, r.x + r.w / 2, r.y + 9, 8, on ? "#120828" : "#e8dcff", "center"); });
}
function clickTab(n, x0, w) { if (!hit("Mouse0")) return -1; for (let i = 0; i < n; i++) if (inside(tabRect(i, n, x0, w))) return i; return -1; }
// Navigation dans une grille (cols colonnes) avec les onglets au-dessus. U : objet d'écran { tab, sel, focus }
function gridNav(U, n, cols, ntabs) {
  if (U.focus === "tabs") {
    if (hit(...K.left)) { U.tab = (U.tab + ntabs - 1) % ntabs; U.sel = 0; audio.sfx("page"); return "tab"; }
    if (hit(...K.right)) { U.tab = (U.tab + 1) % ntabs; U.sel = 0; audio.sfx("page"); return "tab"; }
    if (hit(...K.down, ...K.ok) && n) { U.focus = "list"; audio.sfx("select"); }
    return null;
  }
  if (hit(...K.left)) { if (U.sel % cols) U.sel--; else if (cols === 1) { U.tab = (U.tab + ntabs - 1) % ntabs; U.sel = 0; audio.sfx("page"); return "tab"; } audio.sfx("select"); }
  if (hit(...K.right)) { if (U.sel % cols < cols - 1 && U.sel + 1 < n) U.sel++; else if (cols === 1) { U.tab = (U.tab + 1) % ntabs; U.sel = 0; audio.sfx("page"); return "tab"; } audio.sfx("select"); }
  if (hit(...K.up)) { if (U.sel - cols >= 0) U.sel -= cols; else U.focus = "tabs"; audio.sfx("select"); }
  if (hit(...K.down)) { if (U.sel + cols < n) U.sel += cols; else if (Math.floor(U.sel / cols) < Math.floor((n - 1) / cols)) U.sel = n - 1; audio.sfx("select"); }
  return null;
}
const hoverable = () => !TOUCH && !PAD;

/* ---------------- Collections : cartes, badges, chaussettes ---------------- */
const ALB = { tab: 0, cat: 0, world: 0, sel: 0, focus: "list", page: 0 };
const ALB_TABS = ["Cartes", "Badges", "Chaussettes", "Trésors", "Famille", "Secrets"];
const WORLD_FILTERS = [["all", "Tous les lieux"], ["laverie", "Laverie"], ...CWORLDS.map(W => [W.id, W.name]), ["bonus", "Ancienne aventure"]];
function openAlbum() { state = "album"; ALB.sel = 0; ALB.focus = "list"; audio.sfx("page"); }
function albumCards() {
  const cat = CARD_CATS[ALB.cat][0], wf = WORLD_FILTERS[ALB.world][0];
  return CARDS.filter(c => c.cat === cat && (wf === "all" || c.world === wf));
}
const heroOfCard = c => c.heroId ? CHARS.find(C => C.id === c.heroId) : null;
const cardName = c => c.name || heroOfCard(c).name;
const ALB_CARD = i => ({ x: 10 + (i % 5) * 46, y: 62 + Math.floor(i / 5) * 66, w: 42, h: 60 });
const ALB_PAGE = 15;
SCREENS.album = {
  update() {
    if (uiBack()) { backToHub(); return; }
    const t = clickTab(ALB_TABS.length, 72, VW - 80); if (t >= 0) { ALB.tab = t; ALB.sel = 0; audio.sfx("page"); if (t === 4) openFamily(); }
    if (ALB.tab === 4 && (hit("KeyC", "GX") || (hit("Mouse0") && inside({ x: 150, y: 25, w: 96, h: 14 })))) { const i = DIFFS.findIndex(d => d.id === FAM.diff); FAM.diff = DIFFS[(i + 1) % DIFFS.length].id; audio.sfx("page"); }
    const n = ALB.tab === 0 ? Math.min(ALB_PAGE, albumCards().length - ALB.page * ALB_PAGE) : ALB.tab === 1 ? BADGES.length : ALB.tab === 3 ? TREASURES.length : ALB.tab === 5 ? SECRETS.length : 0;
    if (ALB.tab === 5 && hit("Mouse0")) SECRETS.forEach((s, i) => { if (inside(secRect(i))) { ALB.sel = i; ALB.focus = "list"; audio.sfx("select"); } });
    if (ALB.tab === 0) {
      // filtres : catégorie (4 boutons) et lieu (bouton qui change à chaque clic)
      if (hit("Mouse0")) {
        CARD_CATS.forEach((c, i) => { if (inside({ x: 10 + i * 58, y: 26, w: 54, h: 14 })) { ALB.cat = i; ALB.sel = 0; ALB.page = 0; audio.sfx("page"); } });
        if (inside({ x: 246, y: 26, w: 120, h: 14 })) { ALB.world = (ALB.world + 1) % WORLD_FILTERS.length; ALB.sel = 0; ALB.page = 0; audio.sfx("page"); }
        if (inside({ x: 372, y: 26, w: 46, h: 14 })) { ALB.page = Math.max(0, ALB.page - 1); ALB.sel = 0; audio.sfx("page"); }
        if (inside({ x: 422, y: 26, w: 46, h: 14 })) { if ((ALB.page + 1) * ALB_PAGE < albumCards().length) { ALB.page++; ALB.sel = 0; audio.sfx("page"); } }
        for (let i = 0; i < n; i++) if (inside(ALB_CARD(i))) { ALB.sel = i; ALB.focus = "list"; audio.sfx("select"); }
      }
      if (hit("KeyC", "GX")) { ALB.cat = (ALB.cat + 1) % CARD_CATS.length; ALB.sel = 0; ALB.page = 0; audio.sfx("page"); }
      if (hit("KeyV", "GY")) { ALB.world = (ALB.world + 1) % WORLD_FILTERS.length; ALB.sel = 0; ALB.page = 0; audio.sfx("page"); }
    } else if (ALB.tab === 1 && hit("Mouse0")) for (let i = 0; i < BADGES.length; i++) if (inside(badgeRect(i))) { ALB.sel = i; audio.sfx("select"); }
    else if (ALB.tab === 3 && hit("Mouse0")) for (let i = 0; i < TREASURES.length; i++) if (inside(tresRect(i))) { ALB.sel = i; ALB.focus = "list"; audio.sfx("select"); }
    if (gridNav(ALB, n, ALB.tab === 0 ? 5 : ALB.tab === 1 ? 5 : ALB.tab === 3 ? 6 : 1, ALB_TABS.length) === "tab") { ALB.page = 0; if (ALB.tab === 4) openFamily(); }
    ALB.sel = clamp(ALB.sel, 0, Math.max(0, n - 1));
  },
  draw() {
    drawHub(); R(0, 0, VW, VH, "rgba(10,6,24,0.86)");
    drawTabs(ALB_TABS, ALB.tab, ALB.focus === "tabs", 72, VW - 80); drawBack();
    if (ALB.tab === 0) drawAlbumCards(); else if (ALB.tab === 1) drawAlbumBadges(); else if (ALB.tab === 2) drawAlbumSocks(); else if (ALB.tab === 3) drawAlbumTreasures(); else if (ALB.tab === 4) drawAlbumFamily(); else drawAlbumSecrets();
  },
};
function drawAlbumCards() {
  CARD_CATS.forEach(([k, label], i) => { const r = { x: 10 + i * 58, y: 26, w: 54, h: 14 }, on = i === ALB.cat, n = cardsIn(k).filter(c => has("card:" + c.id)).length;
    R(r.x, r.y, r.w, r.h, on ? "#e8dcff" : "rgba(20,12,40,0.9)"); text(`${label} ${n}/${cardsIn(k).length}`, r.x + r.w / 2, r.y + 7, 6, on ? "#120828" : "#b9a6e0", "center"); });
  const wr = { x: 246, y: 26, w: 120, h: 14 }; R(wr.x, wr.y, wr.w, wr.h, "rgba(20,12,40,0.9)"); ctx.strokeStyle = "#5a4a80"; ctx.strokeRect(wr.x + 0.5, wr.y + 0.5, wr.w - 1, wr.h - 1);
  text("Lieu : " + WORLD_FILTERS[ALB.world][1], wr.x + wr.w / 2, wr.y + 7, 6, "#e8dcff", "center");
  const list = albumCards(), pages = Math.max(1, Math.ceil(list.length / ALB_PAGE));
  if (pages > 1) { drawButton({ x: 372, y: 26, w: 46, h: 14 }, "◀", false, "#b9a6e0", 7); drawButton({ x: 422, y: 26, w: 46, h: 14 }, "▶", false, "#b9a6e0", 7); text(`${ALB.page + 1}/${pages}`, 420, 47, 6, "#b9a6e0", "center"); }
  const total = CARDS.filter(c => has("card:" + c.id)).length;
  text(`Album : ${total}/${CARDS.length} cartes`, 10, 50, 8, "#fccc28");
  const page = list.slice(ALB.page * ALB_PAGE, ALB.page * ALB_PAGE + ALB_PAGE);
  if (!page.length) text("Aucune carte ici", 120, 140, 9, "#6a5a88", "center");
  page.forEach((c, i) => {
    const r = ALB_CARD(i), own = has("card:" + c.id), sel = i === ALB.sel && ALB.focus === "list";
    drawCardFrame(r, c, own, sel);
  });
  // détail de la carte choisie
  const c = page[ALB.sel]; if (!c) return;
  const own = has("card:" + c.id), px = 246, py = 52, pw = 226, ph = 202;
  drawPanel(px, py, pw, ph, own ? catColor(c.cat) : "#3a2a5c");
  R(px + 6, py + 6, 70, 70, "rgba(30,20,56,0.9)");
  ctx.save(); ctx.beginPath(); ctx.rect(px + 6, py + 6, 70, 70); ctx.clip();
  if (own) drawCardArt(c, px + 41, py + 41, 1.5); else text("?", px + 41, py + 41, 30, "#4a3a68", "center");
  ctx.restore();
  const C = heroOfCard(c);
  text(own ? cardName(c) : "???", px + 82, py + 12, 9, own ? catColor(c.cat) : "#8a7aa8");
  text(CARD_CATS.find(k => k[0] === c.cat)[1] + " · " + (WORLD_FILTERS.find(w => w[0] === c.world) || ["", ""])[1], px + 82, py + 25, 6, "#b9a6e0");
  let y = py + 40;
  const line = (s, col = "#e8dcff", size = 7) => { for (const l of wrapText(s, pw - (y < py + 80 ? 90 : 14), size)) { text(l, y < py + 80 ? px + 82 : px + 8, y, size, col); y += size + 3; } };
  if (!own) { line("Comment l'obtenir :", "#fccc28"); line(c.how); return; }
  line(C ? C.desc : c.desc);
  y = Math.max(y, py + 84);
  if (C) { line("Capacités : " + abilityText(C), "#7dffb0"); line(C.special === "doublejump" ? "Astuce : le double saut aide à attraper ce qui est très haut." : "Astuce : le dash traverse les ennemis."); }
  if (c.tip) line(c.tip, "#7dffb0");
  if (c.phases) {
    const seen = SAVE.seen.phase[c.boss] || 1;
    line(`Phases (${c.phases.length}) :`, "#fccc28");
    c.phases.forEach((t, i) => line(i < seen ? t : `P${i + 1} : pas encore vue`, i < seen ? "#e8dcff" : "#6a5a88", 6));
  }
  line("Obtenue : " + c.how, "#b9a6e0", 6);
}
const catColor = cat => ({ pnj: "#7dffb0", heros: "#fccc28", monstres: "#5ef0ff", boss: "#ff4fd8" })[cat];
function drawCardFrame(r, c, own, sel) {
  const col = catColor(c.cat);
  R(r.x, r.y, r.w, r.h, own ? "rgba(30,20,56,0.95)" : "rgba(20,12,36,0.95)");
  ctx.strokeStyle = sel ? "#ffffff" : own ? col : "#3a2a5c"; ctx.lineWidth = sel ? 2 : 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  if (own) {
    R(r.x + 3, r.y + 3, r.w - 6, 38, hexA(col, 0.18));
    ctx.save(); ctx.beginPath(); ctx.rect(r.x + 3, r.y + 3, r.w - 6, 38); ctx.clip(); drawCardArt(c, r.x + r.w / 2, r.y + 22, 0.85); ctx.restore();
    const nm = cardName(c); text(nm.length > 10 ? nm.slice(0, 9) + "…" : nm, r.x + r.w / 2, r.y + r.h - 9, 6, col, "center");
  } else {
    // dos de carte : le hublot et un point d'interrogation
    ctx.strokeStyle = "#3a2a5c"; ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + 24, 11, 0, Math.PI * 2); ctx.stroke();
    text("?", r.x + r.w / 2, r.y + 24, 11, "#4a3a68", "center");
    text("???", r.x + r.w / 2, r.y + r.h - 9, 6, "#4a3a68", "center");
  }
}
// Illustration d'une carte : portrait du pack, client dessiné, ennemi ou boss de l'ancienne aventure (provisoires)
function drawCardArt(c, cx, cy, s = 1) {
  const a = c.art;
  if (a.atlas) { const an = ATL[a.atlas].anims[a.anim]; drawFrame(a.atlas, an ? an[0] : 0, cx, cy + 20 * s, 1, 1, s); }
  else if (a.npc) drawNpcPortrait(a.npc, cx, cy - 4, s * 0.8);
  else if (a.foe && hasAtlas("illus_monstres")) drawFrame("illus_monstres", Object.keys(FOES).indexOf(a.foe), cx, cy + 20 * s, 1, 1, s);
  else if (a.foe) { const F = FOES[a.foe], A = ATL[F.atlas]; const sc = Math.min(1.3, 34 / Math.max(A.cw, A.ch)) * s * 1.5; drawFrame(F.atlas, A.anims.idle[0], cx, F.ground ? cy + 14 * s : cy, 1, 1, sc); }
  else if (a.old) {
    const d = ENEMIES[a.old], e = { type: a.old, x: 0, y: 0, w: d.w, h: d.h, face: 1, state: "idle", walkT: time, charging: false };
    ctx.save(); ctx.translate(cx, cy); ctx.scale(2 * s, 2 * s); ctx.translate(-d.w / 2, -d.h / 2); (d.draw)(e); ctx.restore();
  } else if (a.oldBoss) {
    const cfg = BOSSES[a.oldBoss], K0 = BOSS_KINDS[cfg.kind], [w, h] = K0.size;
    const e = { cfg, kind: cfg.kind, mode: K0.modes[0], x: 0, y: 0, w, h, face: 1, state: "idle", walkT: time, flashT: 0, hp: 1, maxHp: 1 };
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1.2 * s, 1.2 * s); ctx.translate(-w / 2, -h / 2); drawBoss(e); ctx.restore();
  }
}
// Badges : médaille ronde avec un symbole (provisoire en attendant icones/badges.png)
const BADGE_GLYPH = { socks: "2", basket: "▤", star: "★", home: "⌂", bubble: "…", heart: "♥", shield: "◈", bolt: "ϟ", swirl: "@", card: "▯", book: "▥", crown: "♛", crystal: "◆", trophy: "♜", skull: "☠", key: "⚷" };
// Image d'une planche teintée (médailles : l'icône étoile en bronze, argent ou or), gardée en cache ; contours sombres gardés
const tintCache = {};
function drawTinted(aid, i, col, x, y, scale = 1) {
  const A = ATL[aid], img = A && atlasImg(aid); if (!img) return;
  const key = `${aid}|${i}|${col}`;
  let c = tintCache[key];
  if (!c) {
    const [cv2, x2] = mkCanvas(A.cw, A.ch);
    x2.drawImage(img, (i % A.cols) * A.cw, Math.floor(i / A.cols) * A.ch, A.cw, A.ch, 0, 0, A.cw, A.ch);
    try {
      const d = x2.getImageData(0, 0, A.cw, A.ch), a = d.data, tr = parseInt(col.slice(1, 3), 16), tg = parseInt(col.slice(3, 5), 16), tb = parseInt(col.slice(5, 7), 16);
      for (let k = 0; k < a.length; k += 4) {
        if (a[k + 3] < 8) continue;
        const l = (a[k] * 0.3 + a[k + 1] * 0.59 + a[k + 2] * 0.11) / 255; if (l < 0.14) continue;
        const f = 0.3 + 0.95 * l; a[k] = Math.min(255, tr * f); a[k + 1] = Math.min(255, tg * f); a[k + 2] = Math.min(255, tb * f);
      }
      x2.putImageData(d, 0, 0);
    } catch (e) {}
    c = tintCache[key] = cv2;
  }
  ctx.drawImage(c, Math.round(x - A.ax * scale), Math.round(y - A.ay * scale), A.cw * scale, A.ch * scale);
}
// Médaille m (1 bronze, 2 argent, 3 or) : l'icône étoile des badges, teintée
function drawMedal(m, x, y, s = 1) {
  if (!m) return;
  if (hasAtlas("badges")) { drawTinted("badges", 4, MEDAL_COLS[m], x, y, s); return; }
  ctx.fillStyle = MEDAL_COLS[m]; ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, Math.PI * 2); ctx.fill();
}
// Ligne de résultat : la médaille gagnée, et le temps à battre pour la suivante
function drawMedalLine(kind, time, x, y) {
  const m = medalOf(kind, time), M = MEDALS[kind]; if (!M) return;
  if (m) { drawMedal(m, x - 70, y, 1.2); text(MEDAL_LABELS[m] + " !", x - 56, y, 10, MEDAL_COLS[m]); }
  else text("Pas encore de médaille", x, y, 9, "#b9a6e0", "center");
  if (m < 3) text(`${MEDAL_LABELS[m + 1]} : moins de ${fmtTime(M[2 - m])}`, x, y + 16, 7, "#e8dcff", "center");
}
function drawBadgeIcon(b, cx, cy, s = 1, own = true) {
  if (hasAtlas("badges")) {
    const fr = b.frame ?? BADGES.indexOf(b);
    if (b.tint && own) drawTinted("badges", fr, b.tint, cx, cy, s * 1.1); else drawFrame("badges", fr, cx, cy, 1, own ? 1 : 0.25, s * 1.1);
    return;
  }
  const col = own ? b.col : "#3a3450";
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  R(-5, 5, 4, 6, own ? "#c8302a" : "#2a2440"); R(1, 5, 4, 6, own ? "#3a6aff" : "#2a2440");
  ctx.fillStyle = "#0e0a1a"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = own ? "#ffffff44" : "#ffffff11"; ctx.beginPath(); ctx.arc(-2, -2, 3, 0, Math.PI * 2); ctx.fill();
  if (b.icon === "sock" || b.icon === "gold") drawSock(0, 1, { ghost: !own, gold: b.icon === "gold" && own, s: 0.6 });
  else if (b.icon === "machine") drawMachineIcon(0, 0, 0.5);
  else text(BADGE_GLYPH[b.icon] || "★", 0, 1, 9, own ? "#120828" : "#5a4a80", "center");
  ctx.restore();
}
const badgeRect = i => ({ x: 12 + (i % 5) * 46, y: 32 + Math.floor(i / 5) * 44, w: 42, h: 42 });
function drawAlbumBadges() {
  text(`Badges : ${BADGES.filter(b => has("badge:" + b.id)).length}/${BADGES.length}`, 12, 28, 8, "#fccc28");
  BADGES.forEach((b, i) => {
    const r = badgeRect(i), own = has("badge:" + b.id), sel = i === ALB.sel && ALB.focus === "list";
    R(r.x, r.y + 4, r.w, r.h - 4, sel ? "rgba(255,255,255,0.14)" : "rgba(20,12,40,0.8)");
    if (sel) { ctx.strokeStyle = "#ffffff"; ctx.strokeRect(r.x + 0.5, r.y + 4.5, r.w - 1, r.h - 5); }
    drawBadgeIcon(b, r.x + r.w / 2, r.y + 20, 1.15, own);
    const nm = own ? b.name : "???"; text(nm.length > 11 ? nm.slice(0, 10) + "…" : nm, r.x + r.w / 2, r.y + r.h - 5, 6, own ? b.col : "#5a4a80", "center");
  });
  const b = BADGES[ALB.sel]; if (!b) return;
  const own = has("badge:" + b.id), px = 250, py = 34;
  drawPanel(px, py, 222, 120, own ? b.col : "#3a2a5c");
  drawBadgeIcon(b, px + 30, py + 32, 2.2, own);
  text(own ? b.name : "Badge à gagner", px + 62, py + 20, 10, own ? b.col : "#b9a6e0");
  text(own ? "Obtenu !" : "Pas encore obtenu", px + 62, py + 36, 7, own ? "#7dffb0" : "#ff8ab0");
  let y = py + 66; for (const l of wrapText("Condition : " + b.how, 206, 8)) { text(l, px + 8, y, 8, "#e8dcff"); y += 12; }
  // récompenses liées à ce badge
  const rew = [...COSMETICS, ...DECOR].filter(x => x.cond && x.cond.badge === b.id);
  if (rew.length) text("Débloque : " + rew.map(x => x.name).join(", "), px + 8, y + 4, 7, "#7dffb0");
}
// Trésors : grille de 6 colonnes, animés quand on les a ; détail à droite
const tresRect = i => ({ x: 10 + (i % 6) * 38, y: 40 + Math.floor(i / 6) * 42, w: 34, h: 38 });
function drawAlbumTreasures() {
  text(`Trésors : ${TREASURES.filter(t => has("tres:" + t.id)).length}/${TREASURES.length}`, 12, 30, 8, "#fccc28");
  TREASURES.forEach((t, i) => {
    const r = tresRect(i), own = has("tres:" + t.id), sel = i === ALB.sel && ALB.focus === "list";
    R(r.x, r.y, r.w, r.h, sel ? "rgba(255,255,255,0.14)" : "rgba(20,12,40,0.8)");
    if (sel) { ctx.strokeStyle = "#ffffff"; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
    drawTreasure(t, r.x + r.w / 2, r.y + r.h / 2, 0.95, own);
  });
  const t = TREASURES[ALB.sel]; if (!t) return;
  const own = has("tres:" + t.id), px = 250, py = 40;
  drawPanel(px, py, 222, 170, own ? "#fccc28" : "#3a2a5c");
  R(px + 61, py + 10, 100, 100, "rgba(30,20,56,0.9)");
  drawTreasure(t, px + 111, py + 60, 2.8, own);
  text(own ? t.name : "Trésor à trouver", px + 111, py + 124, 10, own ? "#fccc28" : "#b9a6e0", "center");
  text(own ? "Dans ta collection !" : "Pas encore trouvé", px + 111, py + 138, 7, own ? "#7dffb0" : "#ff8ab0", "center");
  let y = py + 154; for (const l of wrapText("Comment : " + t.how, 206, 7)) { text(l, px + 8, y, 7, "#e8dcff"); y += 10; }
}
function drawAlbumSocks() {
  const n = socksCount(), T = socksTotal(), gold = AJOUTS.gold.filter(g => SAVE.gold[g.id]).length;
  drawSock(20, 34, { s: 0.7 }); text(`Chaussettes puantes : ${n}/${T}`, 30, 34, 10, "#7dffb0");
  text(`Chaussettes dorées (chemins secrets) : ${gold}/${AJOUTS.gold.length}`, 30, 48, 7, "#ffd23c");
  // par monde : barre et une case par salle (pleine : chaussette trouvée ; bord vert : salle terminée)
  CWORLDS.forEach((W, i) => {
    const y = 64 + i * 22, got = socksInWorld(W.id), tot = socksWorldTotal(W.id), col = MACHINE_FX[W.id][0];
    text(W.name, 10, y + 4, 7, SAVE.camp.visited[W.id] ? col : "#5a4a80");
    W.rooms.forEach((r, k) => {
      const x = 110 + k * 11, s = !!SAVE.socks[r.id], done = !!SAVE.camp.rooms[r.id];
      R(x, y - 1, 9, 9, s ? col : "rgba(30,20,56,0.9)"); if (done) { ctx.strokeStyle = "#7dffb0"; ctx.strokeRect(x + 0.5, y - 0.5, 8, 8); }
      if (k === 11) text("B", x + 4.5, y + 3.5, 6, s ? "#120828" : "#6a5a88", "center");
    });
    text(`${got}/${tot}`, 248, y + 4, 7, got === tot ? "#7dffb0" : "#e8dcff");
  });
  text("Case pleine : chaussette trouvée   Bord vert : salle terminée   B : salle du boss", 10, 200, 6, "#b9a6e0");
  // paliers et leurs récompenses
  drawPanel(282, 26, 192, 228, "#5a4a80");
  text("Paliers", 378, 36, 9, "#fccc28", "center");
  SOCK_TIERS.forEach((t, i) => {
    const y = 50 + i * 20, ok = n >= t;
    const rew = [...COSMETICS, ...DECOR, ...BADGES].filter(x => x.cond && x.cond.socks === t).map(x => x.name);
    R(288, y - 6, 26, 13, ok ? "#7dffb0" : "rgba(40,28,70,0.9)"); text(String(t), 301, y + 1, 7, ok ? "#120828" : "#b9a6e0", "center");
    const s = rew.join(", ") || "—"; text(s.length > 34 ? s.slice(0, 33) + "…" : s, 318, y + 1, 6, ok ? "#e8dcff" : "#8a7aa8");
  });
}

/* ---------------- Vestiaire : héros et cosmétiques ---------------- */
// Les choix sont enregistrés par héros (SAVE.cos.char[id]) ; « Aucun » remet l'apparence d'origine.
const WR = { tab: 0, sel: 0, focus: "list" };
const WR_TABS = ["Héros", "Tenue", "Couleurs", "Effets"];
function openWardrobe() { state = "wardrobe"; WR.sel = 0; WR.focus = "list"; audio.sfx("locker"); }
function wardrobeItems() { const slot = COS_SLOTS[WR.tab - 1][0]; return [null, ...COSMETICS.filter(c => c.slot === slot)]; }
const wrRect = i => ({ x: 232, y: 30 + i * 17, w: 240, h: 15 });
function equip(slot, id) {
  const C = ch(), e = SAVE.cos.char[C.id] = SAVE.cos.char[C.id] || {};
  if (id && !has("cos:" + id)) { audio.sfx("nope"); return; }
  e[slot] = id; saveGame(); audio.sfx("equip");
}
SCREENS.wardrobe = {
  update() {
    if (uiBack()) { backToHub(); return; }
    const t = clickTab(4, 72, VW - 80); if (t >= 0) { WR.tab = t; WR.sel = 0; audio.sfx("page"); }
    const items = WR.tab ? wardrobeItems() : [0];
    gridNav(WR, items.length, 1, 4);
    WR.sel = clamp(WR.sel, 0, items.length - 1);
    const act = i => { if (WR.tab === 0) { openChars("hub"); return; } const slot = COS_SLOTS[WR.tab - 1][0]; equip(slot, items[i] && items[i].id); };
    if (WR.focus === "list" && hit(...K.ok)) { act(WR.sel); return; }
    if (hit("Mouse0")) {
      if (WR.tab === 0 && inside({ x: 262, y: 120, w: 180, h: 24 })) { act(0); return; }
      if (WR.tab) for (let i = 0; i < items.length; i++) if (inside(wrRect(i))) { WR.sel = i; WR.focus = "list"; act(i); }
    }
  },
  draw() {
    drawHub(); R(0, 0, VW, VH, "rgba(10,6,24,0.86)");
    drawTabs(WR_TABS, WR.tab, WR.focus === "tabs", 72, VW - 80); drawBack();
    const C = ch();
    // aperçu : le héros avec ce qui est équipé (ou l'objet survolé), qui alterne repos, course et coup
    drawPanel(8, 26, 216, 228, C.ui);
    R(30, 208, 172, 2, hexA(C.ui, 0.5));
    let pal, acc;
    if (WR.tab && WR.focus === "list") { const it = wardrobeItems()[WR.sel], slot = COS_SLOTS[WR.tab - 1][0]; if (!it || has("cos:" + it.id)) { if (slot === "pal") pal = it ? it.id : null; if (slot === "acc") acc = it ? it.id : null; } }
    const cyc = time % 3, fr = cyc < 1 ? Math.floor(cyc * 5) % 4 : cyc < 2 ? 6 + Math.floor(cyc * 12) % 6 : 12 + Math.min(4, Math.floor((cyc - 2) / 0.1));
    drawCharCos(C, fr, 116, 206, 1, 3, 1, { pal, acc });
    if (cyc >= 2 && cosOn(C, "fx")) { ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = fxCol({ C }); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(146, 160, 40, -1.2, 1.2); ctx.stroke(); ctx.restore(); }
    text(C.name, 116, 222, 12, C.ui, "center", C.ui);
    text(abilityText(C), 116, 238, 7, "#e8dcff", "center");
    text("Les tenues changent l'apparence, pas les capacités.", 116, 34, 6, "#b9a6e0", "center");
    if (WR.tab === 0) {
      text("Les huit héros sont toujours disponibles.", 352, 60, 8, "#e8dcff", "center");
      text(`Tu joues avec : ${C.name}`, 352, 80, 9, C.ui, "center");
      text(`Héros déjà utilisés : ${CHARS.filter(c => SAVE.seen.char[c.id]).length}/8`, 352, 98, 8, "#7dffb0", "center");
      drawButton({ x: 262, y: 120, w: 180, h: 24 }, "Changer de héros ▶", WR.focus === "list" || inside({ x: 262, y: 120, w: 180, h: 24 }), C.ui, 10);
      return;
    }
    const slot = COS_SLOTS[WR.tab - 1][0], cur = charCos(C)[slot] || null;
    wardrobeItems().forEach((it, i) => {
      const r = wrRect(i), sel = i === WR.sel && WR.focus === "list", own = !it || has("cos:" + it.id), on = (it ? it.id : null) === cur;
      R(r.x, r.y, r.w, r.h, sel ? "rgba(255,255,255,0.16)" : "rgba(20,12,40,0.85)");
      if (sel) { ctx.strokeStyle = C.ui; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
      text(on ? "●" : "○", r.x + 8, r.y + 8, 7, on ? "#7dffb0" : "#5a4a80", "center");
      text(it ? (own ? it.name : "🔒 " + it.name) : "Aucun (apparence d'origine)", r.x + 16, r.y + 8, 7, own ? "#ffffff" : "#6a5a88");
      if (it && !own) text(it.how, r.x + r.w - 6, r.y + 8, 6, "#8a7aa8", "right");
      if (it && it.slot === "fx" && own) R(r.x + r.w - 18, r.y + 4, 12, 7, it.rainbow ? `hsl(${Math.floor(time * 300) % 360},100%,65%)` : it.color);
    });
  },
};

/* ---------------- Décoration de la laverie ---------------- */
// Choix enregistrés pour toute la sauvegarde (SAVE.cos.hub, SAVE.cos.machine). La laverie se voit derrière le panneau.
const DC = { tab: 0, sel: 0, focus: "list" };
const DC_TABS = DECOR_SLOTS.map(s => s[1]);
function openDeco() { state = "deco"; DC.sel = 0; DC.focus = "list"; audio.sfx("page"); }
function decoItems() {
  const slot = DECOR_SLOTS[DC.tab][0];
  if (slot === "machine") return [{ id: null, name: "Machine d'origine" }, ...COSMETICS.filter(c => c.slot === "machine")];
  if (slot === "show") return SHOWCASE.map(([k, n]) => ({ id: k, name: n, show: true }));
  return DECOR.filter(d => d.slot === slot);
}
const dcRect = i => ({ x: 296, y: 46 + i * 17, w: 176, h: 15 });
function decoOwned(it) { const slot = DECOR_SLOTS[DC.tab][0]; return it.show || !it.id || (slot === "machine" ? has("cos:" + it.id) : has("decor:" + it.id)); }
function decoActive(it) {
  const slot = DECOR_SLOTS[DC.tab][0], H = SAVE.cos.hub;
  if (slot === "machine") return (SAVE.cos.machine || null) === it.id;
  if (slot === "show") return H.show[it.id] !== false;
  if (slot === "item") return !!H.items[it.id];
  return H[slot] === it.id;
}
function decoPick(it) {
  if (!decoOwned(it)) { audio.sfx("nope"); return; }
  const slot = DECOR_SLOTS[DC.tab][0], H = SAVE.cos.hub;
  if (slot === "machine") SAVE.cos.machine = it.id;
  else if (slot === "show") H.show[it.id] = H.show[it.id] === false;
  else if (slot === "item") H.items[it.id] = !H.items[it.id];
  else H[slot] = it.id;
  for (const k in hubBgs) delete hubBgs[k];   // le décor de la laverie sera redessiné
  saveGame(); audio.sfx("equip");
}
SCREENS.deco = {
  update() {
    if (uiBack()) { backToHub(); return; }
    const t = clickTab(DC_TABS.length, 72, VW - 80); if (t >= 0) { DC.tab = t; DC.sel = 0; audio.sfx("page"); }
    const items = decoItems();
    gridNav(DC, items.length, 1, DC_TABS.length);
    DC.sel = clamp(DC.sel, 0, items.length - 1);
    if (DC.focus === "list" && hit(...K.ok)) decoPick(items[DC.sel]);
    if (hit("Mouse0")) for (let i = 0; i < items.length; i++) if (inside(dcRect(i))) { DC.sel = i; DC.focus = "list"; decoPick(items[i]); }
  },
  draw() {
    drawHub(); R(0, 0, VW, 24, "rgba(10,6,24,0.86)");
    drawTabs(DC_TABS, DC.tab, DC.focus === "tabs", 72, VW - 80); drawBack();
    drawPanel(290, 26, 186, 200, "#5a4a80", "rgba(14,8,30,0.88)");
    const slot = DECOR_SLOTS[DC.tab][0];
    text({ tile: "Carrelage du sol", light: "Couleur des néons", sign: "Couleur de l'enseigne", machine: "Couleur de la machine", item: "Objets à poser (plusieurs)", show: "Montrer ou ranger" }[slot], 383, 36, 8, "#fccc28", "center");
    decoItems().forEach((it, i) => {
      const r = dcRect(i), sel = i === DC.sel && DC.focus === "list", own = decoOwned(it), on = decoActive(it);
      R(r.x, r.y, r.w, r.h, sel ? "rgba(255,255,255,0.18)" : "rgba(20,12,40,0.9)");
      if (sel) { ctx.strokeStyle = "#ffffff"; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
      const multi = slot === "item" || slot === "show";
      text(on ? (multi ? "☑" : "●") : (multi ? "☐" : "○"), r.x + 8, r.y + 8, 7, on ? "#7dffb0" : "#5a4a80", "center");
      text(own ? it.name : "🔒 " + it.name, r.x + 16, r.y + 8, 7, own ? "#ffffff" : "#6a5a88");
      if (!own && it.how) text(it.how, r.x + r.w - 4, r.y + 8, 5, "#8a7aa8", "right");
      if (own && (it.color || it.colors)) R(r.x + r.w - 14, r.y + 4, 9, 7, it.colors ? it.colors[0] : it.color.startsWith("#") ? it.color : `rgb(${it.color})`);
    });
    text("Les trophées, le tas de chaussettes et le présentoir se remplissent avec tes progrès.", VW / 2, VH - 14, 6, "#e8dcff", "center");
  },
};

/* ---------------- Jukebox ---------------- */
// Pistes découvertes, musique du héros ou de la laverie en mode automatique. Respecte l'option Musique et le bouton muet (M).
const JB = { sel: 0, scroll: 0 };
function openJukebox() { state = "jukebox"; audio.sfx("coin"); JB.sel = Math.max(0, TRACKS.findIndex(t => t.id === SAVE.jukebox) + 1); }
const jbItems = () => [null, ...TRACKS];
const JB_ROWS = 12, jbRect = i => ({ x: 120, y: 40 + i * 16, w: 352, h: 14 });
function jbPick(t) {
  if (!t) { SAVE.jukebox = null; saveGame(); audio.sfx("coin"); return; }
  if (!has("track:" + t.id)) { audio.sfx("nope"); return; }
  if (!trackAvailable(t)) { audio.sfx("nope"); return; }
  SAVE.jukebox = t.id; saveGame(); audio.sfx("coin");
}
SCREENS.jukebox = {
  update() {
    if (uiBack()) { backToHub(); return; }
    const n = jbItems().length;
    if (hit(...K.up)) { JB.sel = (JB.sel + n - 1) % n; audio.sfx("select"); }
    if (hit(...K.down)) { JB.sel = (JB.sel + 1) % n; audio.sfx("select"); }
    if (JB.sel < JB.scroll) JB.scroll = JB.sel; if (JB.sel >= JB.scroll + JB_ROWS) JB.scroll = JB.sel - JB_ROWS + 1;
    if (hit(...K.ok)) jbPick(jbItems()[JB.sel]);
    if (hit("Mouse0")) {
      for (let i = 0; i < JB_ROWS; i++) if (inside(jbRect(i)) && JB.scroll + i < n) { JB.sel = JB.scroll + i; jbPick(jbItems()[JB.sel]); }
      if (inside({ x: 120, y: 236, w: 60, h: 14 })) JB.scroll = Math.max(0, JB.scroll - JB_ROWS);
      if (inside({ x: 190, y: 236, w: 60, h: 14 })) JB.scroll = Math.min(n - JB_ROWS, JB.scroll + JB_ROWS);
    }
  },
  draw() {
    drawHub(); R(0, 0, VW, VH, "rgba(10,6,24,0.86)"); drawBack();
    text("Jukebox", VW / 2, 14, 14, "#ff4fd8", "center", "#ff4fd8");
    drawPanel(8, 30, 104, 220, "#ff4fd8");
    const cur = audio.curKey, T = SAVE.jukebox && TRACK_BY_ID[SAVE.jukebox];
    text("En ce moment :", 60, 46, 7, "#b9a6e0", "center");
    const nm = T ? T.name : "Automatique";
    wrapText(nm, 96, 8).forEach((l, i) => text(l, 60, 62 + i * 11, 8, "#ffffff", "center"));
    if (!OPT.music) text("Musique coupée", 60, 100, 7, "#ff8ab0", "center"), text("(Options)", 60, 112, 7, "#ff8ab0", "center");
    else if (audio.muted) text("Son coupé (M)", 60, 100, 7, "#ff8ab0", "center");
    else if (cur) for (let i = 0; i < 6; i++) R(22 + i * 12, 150 - Math.abs(Math.sin(time * 5 + i)) * 24, 8, Math.abs(Math.sin(time * 5 + i)) * 24 + 2, ["#ff4fd8", "#fccc28", "#5ef0ff", "#7dffb0", "#ff8a3c", "#c86eff"][i]);
    const own = TRACKS.filter(t => has("track:" + t.id)).length;
    text(`Découvertes : ${own}/${TRACKS.length}`, 60, 176, 7, "#7dffb0", "center");
    text("Automatique : la", 60, 200, 6, "#b9a6e0", "center"); text("musique de la laverie", 60, 210, 6, "#b9a6e0", "center"); text("ou de ton héros", 60, 220, 6, "#b9a6e0", "center");
    const items = jbItems();
    for (let i = 0; i < JB_ROWS && JB.scroll + i < items.length; i++) {
      const k = JB.scroll + i, t = items[k], r = jbRect(i), sel = k === JB.sel;
      R(r.x, r.y, r.w, r.h, sel ? "rgba(255,255,255,0.16)" : "rgba(20,12,40,0.85)");
      if (sel) { ctx.strokeStyle = "#ff4fd8"; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
      if (!t) { text((SAVE.jukebox ? "○ " : "▶ ") + "Automatique", r.x + 6, r.y + 7, 7, "#ffffff"); continue; }
      const got = has("track:" + t.id), ok = trackAvailable(t), playing = SAVE.jukebox === t.id;
      text(t.group, r.x + 6, r.y + 7, 6, "#8a7aa8");
      text((playing ? "▶ " : "") + (got ? t.name : "???"), r.x + 58, r.y + 7, 7, !got ? "#5a4a80" : ok ? "#ffffff" : "#b9a6e0");
      const info = !got ? "🔒 " + (t.how || "") : !ok ? "à venir : audio/" + t.base + ".mp3" : t.base.startsWith("synth:") ? "composition" : "";
      if (info) text(info.length > 44 ? info.slice(0, 43) + "…" : info, r.x + r.w - 6, r.y + 7, 5, !got ? "#6a5a88" : "#fccc28", "right");
    }
    if (items.length > JB_ROWS) { drawButton({ x: 120, y: 236, w: 60, h: 14 }, "▲", false, "#b9a6e0", 7); drawButton({ x: 190, y: 236, w: 60, h: 14 }, "▼", false, "#b9a6e0", 7); }
    text(say("↑ ↓ : choisir   Entrée : écouter", "Touche une musique pour l'écouter", "Croix : choisir   {A} : écouter"), 360, 244, 7, "#b9a6e0", "center");
  },
};

/* ---------------- Souvenirs de la machine ---------------- */
// Liste des six souvenirs ; une scène se passe (Échap) et se revoit autant qu'on veut (aucune récompense à la relecture).
const MEMS = { sel: 0, view: null };
function openMemories() { state = "memories"; MEMS.sel = 0; audio.sfx("page"); }
const memRect = i => ({ x: 20, y: 40 + i * 30, w: 440, h: 26 });
// auto : ouvert en revenant à la laverie (on y retourne ensuite)
function openMemory(id, auto = false) {
  MEMS.view = { id, i: 0, t: 0, auto, fade: 9 }; state = "memview"; audio.sfx("memory"); speakMem();
  const A = ATL["souvenir_" + (MEMORIES.findIndex(M => M.id === id) + 1)]; if (A) getImg(A.src);   // l'image se charge maintenant (atlas « lazy »)
}
// Image d'un souvenir (3 vues de la même scène) : la vue k, et en fondu de 1,2 s depuis la vue précédente quand on passe à la phrase suivante
function drawMemoryArt(aid, k, fade, x, y, w, h) {
  const A = ATL[aid], n = A.cols, s = Math.min(w / A.cw, h / A.ch), cx = x + w / 2, by = y + (h + A.ch * s) / 2;
  ctx.imageSmoothingEnabled = true;
  const a = reducedMotion.matches ? 1 : Math.min(1, fade / 1.2);
  if (a < 1 && k > 0) drawFrame(aid, Math.min(n - 1, k - 1), cx, by, 1, 1, s);
  drawFrame(aid, Math.min(n - 1, k), cx, by, 1, a, s);
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
}
function speakMem() { const v = MEMS.view, M = MEM_BY_ID[v.id]; if (OPT.voice) voice.say(M.lines[v.i], true); }
SCREENS.memories = {
  update() {
    if (uiBack()) { backToHub(); return; }
    const n = MEMORIES.length;
    if (hit(...K.up)) { MEMS.sel = (MEMS.sel + n - 1) % n; audio.sfx("select"); }
    if (hit(...K.down)) { MEMS.sel = (MEMS.sel + 1) % n; audio.sfx("select"); }
    const go = i => { const M = MEMORIES[i]; if (has("mem:" + M.id)) openMemory(M.id); else audio.sfx("nope"); };
    if (hit(...K.ok)) { go(MEMS.sel); return; }
    if (hit("Mouse0")) for (let i = 0; i < n; i++) if (inside(memRect(i))) { MEMS.sel = i; go(i); return; }
  },
  draw() {
    drawHub(); R(0, 0, VW, VH, "rgba(10,6,24,0.88)"); drawBack();
    text("Souvenirs de la machine", VW / 2, 16, 13, "#ff8ab0", "center", "#ff8ab0");
    MEMORIES.forEach((M, i) => {
      const r = memRect(i), own = has("mem:" + M.id), sel = i === MEMS.sel, W = CWORLDS.find(w => w.id === M.world);
      R(r.x, r.y, r.w, r.h, sel ? "rgba(255,255,255,0.14)" : "rgba(20,12,40,0.85)");
      ctx.strokeStyle = sel ? "#ff8ab0" : "#3a2a5c"; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      R(r.x + 4, r.y + 4, 18, 18, own ? MACHINE_FX[M.world][0] : "#2a2244"); text(String(i + 1), r.x + 13, r.y + 13, 9, own ? "#120828" : "#5a4a80", "center");
      text(own ? M.title : "Souvenir verrouillé", r.x + 30, r.y + 9, 9, own ? "#ffffff" : "#6a5a88");
      text(own ? (SAVE.memSeen[M.id] ? "Déjà vu — revoir" : "Nouveau !") : `Ramène la pièce de : ${W.name}`, r.x + 30, r.y + 19, 6, own ? (SAVE.memSeen[M.id] ? "#b9a6e0" : "#7dffb0") : "#8a7aa8");
    });
    text(say("↑ ↓ : choisir   Entrée : regarder", "Touche un souvenir pour le regarder", "Croix : choisir   {A} : regarder"), VW / 2, 234, 7, "#b9a6e0", "center");
  },
};
SCREENS.memview = {
  update(rdt) {
    const v = MEMS.view, M = MEM_BY_ID[v.id]; v.t += rdt; v.fade += rdt;
    const end = () => { SAVE.memSeen[v.id] = 1; saveGame(); voice.stop(); MEMS.view = null; state = v.auto ? "hub" : "memories"; audio.sfx("back"); };
    if (hit("Escape", "GB")) { end(); return; }
    if (hit("Enter", "Space", "NumpadEnter", "Mouse0", "GA", "GStart", "TJump", "TAtk", ...K.attack)) {
      if (v.t * 35 < M.lines[v.i].length) v.t = 99;
      else if (v.i + 1 < M.lines.length) { v.i++; v.t = 0; v.fade = 0; audio.sfx("page"); speakMem(); }
      else end();
    }
  },
  draw() {
    const v = MEMS.view, M = MEM_BY_ID[v.id], idx = MEMORIES.indexOf(M);
    R(0, 0, VW, VH, "#0a0618");
    const aid = "souvenir_" + (idx + 1), art = ATL[aid];
    const fx = art ? 72 : 60, fy = art ? 18 : 22, fw = art ? 336 : 360, fh = art ? 189 : 170;   // image fournie : 16/9 (une vue par phrase)
    ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
    if (art) { R(fx, fy, fw, fh, "#0a0618"); if (atlasImg(aid)) drawMemoryArt(aid, v.i, v.fade, fx, fy, fw, fh); else text("…", fx + fw / 2, fy + fh / 2, 12, "#b9a6e0", "center"); }
    else {
      drawMemScene(M.scene, fx, fy, fw, fh, v.t + v.i * 3);
      ctx.fillStyle = "rgba(120,60,160,0.16)"; ctx.fillRect(fx, fy, fw, fh);   // teinte « vieux souvenir »
    }
    ctx.restore();
    ctx.strokeStyle = "#ff8ab0"; ctx.lineWidth = 2; ctx.strokeRect(fx - 1, fy - 1, fw + 2, fh + 2);
    text(`Souvenir ${idx + 1} : ${M.title}`, VW / 2, 12, 9, "#ff8ab0", "center");
    const s = M.lines[v.i].slice(0, Math.floor(v.t * 35));
    wrapText(s, VW - 60, 9).forEach((l, i) => text(l, VW / 2, (art ? 218 : 210) + i * 13, 9, "#ffffff", "center"));
    text(`${v.i + 1}/${M.lines.length}`, VW - 14, VH - 8, 7, "#b9a6e0", "right");
    text(say("Entrée : suite   Échap : passer", "Touche : suite", "{A} : suite   {B} : passer"), 14, VH - 8, 7, "#b9a6e0");
  },
};
// Scènes provisoires dessinées avec les éléments du jeu (remplacées par souvenirs/souvenir_<n>.png)
function drawMemScene(kind, x0, y0, w, h, t) {
  const F = (c, x, y, ww, hh) => R(x0 + x, y0 + y, ww, hh, c), gy = h - 30;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + h); bg.addColorStop(0, "#1a1030"); bg.addColorStop(1, "#3a2050");
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, w, h); F("#2a1a3a", 0, gy, w, 30);
  if (kind === "atelier") {
    for (let i = 0; i < 6; i++) F("#4a3a5a", 20 + i * 54, 20, 40, 3);
    for (let i = 0; i < 8; i++) F(["#c8c8d8", "#8a5a3a", "#fccc28"][i % 3], 30 + i * 36, 12, 4, 8);
    drawMachineIcon(x0 + 200, y0 + gy - 22, 2);
    drawNpc("firmin", x0 + 140, y0 + gy, 1, Math.floor(t * 3) % 2 === 0);
    if (Math.floor(t * 4) % 3 === 0) { ctx.strokeStyle = "#fccc28"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 240, y0 + 40); ctx.lineTo(x0 + 230, y0 + 60); ctx.lineTo(x0 + 245, y0 + 62); ctx.lineTo(x0 + 232, y0 + 86); ctx.stroke(); }
  } else if (kind === "chaussette") {
    drawMachineIcon(x0 + 180, y0 + gy - 26, 2.4);
    for (let i = 0; i < 12; i++) { const a = t * 3 + i * 0.5, r = 6 + i * 3; R(Math.round(x0 + 180 + Math.cos(a) * r), Math.round(y0 + gy - 24 + Math.sin(a) * r * 0.7), 2, 2, ["#fccc28", "#ffffff", "#c86eff"][i % 3]); }
    drawSock(x0 + 180 + Math.cos(t * 3) * 10, y0 + gy - 24 + Math.sin(t * 3) * 6, {});
    drawNpc("firmin", x0 + 110, y0 + gy, 1, false);
    text("?", x0 + 110, y0 + gy - 50, 14, "#fccc28", "center");
  } else if (kind === "orage") {
    F("#0a0618", 0, 0, w, gy);
    if (Math.floor(t * 2) % 3 === 0) { ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(x0, y0, w, gy); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 220, y0); ctx.lineTo(x0 + 200, y0 + 40); ctx.lineTo(x0 + 225, y0 + 45); ctx.lineTo(x0 + 190, y0 + gy - 40); ctx.stroke(); }
    F("#3a2a5a", 120, 60, 160, gy - 60); F("#2a1a3a", 110, 52, 180, 10);
    drawMachineIcon(x0 + 190, y0 + gy - 24, 2);
    for (let i = 0; i < 5; i++) R(Math.round(x0 + 180 + Math.random() * 20), Math.round(y0 + gy - 50 + Math.random() * 10), 2, 2, "#fccc28");
  } else if (kind === "pieces") {
    drawMachineIcon(x0 + w / 2, y0 + gy - 24, 2);
    Object.values(PIECES).forEach((P, i) => {
      const a = -Math.PI * 0.9 + i * Math.PI * 0.36, k = (t * 0.35) % 1, r = 30 + k * 120;
      const px = x0 + w / 2 + Math.cos(a) * r, py = y0 + gy - 30 + Math.sin(a) * r * 0.6;
      ctx.globalAlpha = 0.35; ctx.fillStyle = P.color; ctx.beginPath(); ctx.arc(x0 + w / 2 + Math.cos(a) * 140, y0 + gy - 30 + Math.sin(a) * 84, 16, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      R(Math.round(px - 3), Math.round(py - 3), 7, 7, "#0e0a1a"); R(Math.round(px - 2), Math.round(py - 2), 5, 5, P.color);
    });
  } else if (kind === "plongeon") {
    drawMachineIcon(x0 + w / 2, y0 + gy - 30, 3);
    CHARS.forEach((C, i) => { const k = ((t * 0.4) + i / 8) % 1, a = k * Math.PI * 4 + i, r = 90 * (1 - k);
      drawChar(C, 18, x0 + w / 2 + Math.cos(a) * r, y0 + gy - 24 + Math.sin(a) * r * 0.5, 1, 0.6 * (1 - k * 0.6), 1); });
  } else if (kind === "message") {
    F("#1a0a2a", 0, 0, w, gy);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = "#ff4fd8"; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x0 + 20 + i * 40, y0 + gy); ctx.lineTo(x0 + 30 + i * 40, y0 + gy - 30 - (i % 3) * 14); ctx.lineTo(x0 + 40 + i * 40, y0 + gy); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = "rgba(255,120,220,0.35)"; ctx.beginPath(); ctx.moveTo(x0 + w / 2, y0 + 20); ctx.lineTo(x0 + w / 2 + 50, y0 + 80); ctx.lineTo(x0 + w / 2, y0 + 130); ctx.lineTo(x0 + w / 2 - 50, y0 + 80); ctx.fill();
    drawNpc("firmin", x0 + w / 2, y0 + 110, 1, Math.floor(t * 3) % 2 === 0, null, 0.85);
    text("⌂", x0 + w / 2 + 34, y0 + 60, 14, "#fccc28", "center", "#fccc28");
  }
}
