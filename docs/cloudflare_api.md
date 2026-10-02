# Sauvegardes partagées : installation et Cloudflare

> **Désactivé pour l'instant** : le jeu n'appelle pas `/api/` tant que `SYNC_ON` vaut `false` dans `src/profils.js`. Pour l'activer : passer `SYNC_ON` à `true`, relancer `build.py`, puis suivre ce guide.

Le jeu reste **public** sur `https://lunelio.pissits.com`. Seul `/api/` (profils, sauvegardes, scores) est réservé à la famille, grâce à **Cloudflare Access**. Un visiteur qui n'est pas connecté joue normalement : sa sauvegarde reste dans son appareil.

## 1. Dans le conteneur (une seule fois)

En root, dans le conteneur LXC qui sert le jeu :

```bash
bash /var/www/lunelio/deploy/installer-service.sh
```

Le script :

- crée l'utilisateur système `lunelio` et le dossier `/var/lib/lunelio` (les sauvegardes, hors du dossier du jeu) ;
- installe le service `lunelio-api` (Python, écoute seulement sur `127.0.0.1:8770`, ne peut écrire que dans `/var/lib/lunelio`) ;
- installe `lunelio-api-relance.path`, qui relance le service quand la mise à jour automatique change son code ;
- copie la configuration Nginx du dépôt (`/api/` est transmis au service, avec une limite de débit) et recharge Nginx.

Vérifier : `curl http://127.0.0.1/api/etat` doit répondre `{"ok": true, ...}`. Journal : `journalctl -u lunelio-api`.

**Copies de sécurité** : le service garde les 10 dernières versions de chaque profil dans `/var/lib/lunelio/versions/`. Pensez à copier `/var/lib/lunelio` ailleurs de temps en temps (sauvegarde Proxmox du conteneur, par exemple).

## 2. Cloudflare Access : réserver `/api/` à la famille

Dans le tableau de bord Cloudflare, **Zero Trust** :

1. **Access → Applications → Add an application → Self-hosted**.
2. **Application name** : `Lunelio sauvegardes`. **Session duration** : 1 mois (la famille n'aura à se reconnecter qu'une fois par mois).
3. **Application domain** : sous-domaine `lunelio`, domaine `pissits.com`, **path** : `api/*`.
   - Important : seulement `api/*`, pas tout le site, pour que le jeu reste public.
4. **Policy** : action **Allow**, règle **Include → Emails** : les adresses e-mail de la famille (une par personne qui se connectera).
5. **Login methods** : **One-time PIN** suffit (un code est envoyé par e-mail).
6. Enregistrer.

Dans le jeu, sur l'écran **« Qui joue ? »**, le bouton **« Connexion famille »** apparaît quand Access demande la connexion. Il ouvre la page de Cloudflare (adresse e-mail, puis code reçu), qui ramène au jeu. Ensuite, l'écran affiche « ✓ Sauvegardes partagées avec la maison ». La connexion se fait une fois par appareil et par navigateur (et de nouveau quand la session expire).

## 3. Cache : ne jamais garder `/api/` en cache

Le service répond déjà `Cache-Control: no-store`, mais par sécurité :

**Caching → Cache Rules → Create rule** : *URI Path* **starts with** `/api/` → **Bypass cache**.

## 4. Limite de débit (facultatif, conseillé)

**Security → WAF → Rate limiting rules → Create rule** : *URI Path* **starts with** `/api/`, **10 requêtes par 10 secondes** par adresse IP → **Block** pendant 1 minute. (L'offre gratuite propose une règle de ce type ; les valeurs possibles dépendent de l'offre.)

Le service et Nginx ont aussi leurs propres limites (taille d'une sauvegarde, nombre de profils, requêtes par minute).

## 5. Vérifier

- Dans une fenêtre de navigation privée, ouvrir `https://lunelio.pissits.com/api/etat` : Cloudflare doit demander une adresse e-mail. Après connexion (avec une adresse autorisée) : `{"ok": true, ...}`.
- `https://lunelio.pissits.com/` : le jeu s'ouvre sans rien demander.

## À savoir

- **Le tunnel** : rien à changer, il envoie déjà `lunelio.pissits.com` vers Nginx. Aucun port n'est ouvert sur la box.
- **À la maison par l'adresse IP** (`http://IP_DU_CONTENEUR`) : Access n'est pas sur ce chemin, le réseau de la maison est de confiance. Mais le navigateur range les données à part pour chaque adresse : les profils de l'appareil ne sont pas les mêmes en `http://IP…` et en `https://lunelio.pissits.com`. Grâce au serveur, il suffit de rechoisir son nom dans « Qui joue ? » pour retrouver sa partie. Le plus simple : toujours utiliser `https://lunelio.pissits.com`, qui permet aussi d'installer le jeu comme une appli.
- **Effacer un profil** : pour l'instant à la main, dans le conteneur (`/var/lib/lunelio/profils.json` et `saves/<id>.json`), service arrêté.
- **Données gardées** : le nom du profil et la sauvegarde du jeu, rien d'autre. Préférez un surnom ou un prénom, jamais un nom de famille.
