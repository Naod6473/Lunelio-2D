// Service worker de Lunelio : permet de jouer hors ligne une fois le jeu installé.
// Ce fichier est un modèle : build.py remplace __VERSION__, __AUDIO__ et __ASSETS__ et écrit ../sw.js.
//
// Le jeu (index.html) est toujours demandé au serveur d'abord ; le cache ne sert que
// sans réseau. Une nouvelle version publiée sur main est donc prise dès le prochain
// chargement, sans vider le cache à la main. Les sons, lourds et rarement modifiés,
// sont lus dans le cache puis rafraîchis en arrière-plan. Les images de la campagne (assets/) ont une
// empreinte dans leur adresse (?v=…) : on les lit dans le cache, et une nouvelle version a une autre adresse.
const VERSION = "__VERSION__";
const GAME_CACHE = "lunelio-jeu-" + VERSION;
const AUDIO_CACHE = "lunelio-audio";
const GAME_FILES = ["./", "index.html", "manifest.json", "icons/icon-192.png", "icons/icon-512.png", "icons/favicon-32.png"];
const AUDIO_FILES = __AUDIO__;
const AUDIO_PATH = new URL("audio/", self.registration.scope).pathname;
const IMAGE_CACHE = "lunelio-images";
const ASSET_URLS = __ASSETS__;
const ASSET_PATH = new URL("assets/", self.registration.scope).pathname;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    await (await caches.open(GAME_CACHE)).addAll(GAME_FILES);
    // les sons déjà en cache ne sont pas retéléchargés ; un son manquant n'empêche pas l'installation
    const audio = await caches.open(AUDIO_CACHE);
    await Promise.all(AUDIO_FILES.map(async f => { if (!(await audio.match(f))) await audio.add(f).catch(() => {}); }));
    const img = await caches.open(IMAGE_CACHE);
    await Promise.all(ASSET_URLS.map(async f => { if (!(await img.match(f))) await img.add(f).catch(() => {}); }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("lunelio-jeu-") && k !== GAME_CACHE) await caches.delete(k);
    // images d'anciennes versions : on ne garde que celles de la liste
    const img = await caches.open(IMAGE_CACHE), keep = new Set(ASSET_URLS.map(f => new URL(f, self.registration.scope).href));
    for (const r of await img.keys()) if (!keep.has(r.url)) await img.delete(r);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (url.origin !== location.origin) return;   // police Google Fonts : le navigateur s'en occupe
  if (req.method === "HEAD") e.respondWith(head(req));
  else if (req.method !== "GET") return;
  else if (url.pathname.startsWith(AUDIO_PATH)) e.respondWith(audioFile(req));
  else if (url.pathname.startsWith(ASSET_PATH)) e.respondWith(imageFile(req));
  else e.respondWith(networkFirst(req));
});

const wait = ms => new Promise(res => setTimeout(res, ms));

// Réseau d'abord ; si le serveur ne répond pas (hors ligne, ou plus de 4 s), la copie en cache.
async function networkFirst(req) {
  const cache = await caches.open(GAME_CACHE);
  const net = fetch(req).then(res => { if (res.status === 200 && res.type === "basic") cache.put(req, res.clone()); return res; });
  const cached = async () => (await cache.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? cache.match("index.html") : undefined);
  const res = await Promise.race([net.catch(cached), wait(4000).then(cached)]);
  return res || net;
}

// Sons : le cache d'abord, puis une vérification en arrière-plan (une fois par réveil du service worker).
const refreshed = new Set();
async function audioFile(req) {
  const cache = await caches.open(AUDIO_CACHE);
  const key = req.url.split("?")[0];
  const hit = await cache.match(key);
  const refresh = () => fetch(key).then(res => { if (res.status === 200) cache.put(key, res.clone()); return res; });
  if (!hit) return refresh();
  if (!refreshed.has(key)) { refreshed.add(key); refresh().catch(() => {}); }
  return hit;
}

// Le jeu détecte les musiques présentes avec des requêtes HEAD : hors ligne, on répond avec le cache.
async function head(req) {
  try { return await fetch(req); }
  catch (err) {
    const hit = await caches.match(req.url.split("?")[0]);
    return new Response(null, { status: hit ? 200 : 404 });
  }
}

// Images de la campagne : le cache d'abord (l'adresse contient l'empreinte du fichier), sinon le réseau.
async function imageFile(req) {
  const cache = await caches.open(IMAGE_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.status === 200) cache.put(req, res.clone());
  return res;
}
