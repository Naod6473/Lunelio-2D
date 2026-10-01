#!/usr/bin/env bash
# Récupère la dernière version du jeu depuis GitHub (à lancer en root dans le conteneur).
set -euo pipefail
cd /var/www/lunelio
git fetch --depth 1 origin main
git reset --hard origin/main
echo "Lunelio est à jour : $(git log -1 --format='%h %s')"
