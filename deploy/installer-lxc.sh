#!/usr/bin/env bash
# Installation de Lunelio dans un conteneur LXC Debian (à lancer en root dans le conteneur).
set -euo pipefail
REPO="https://github.com/Naod6473/Lunelio-2D.git"
apt update
apt install -y nginx git
if [ ! -d /var/www/lunelio/.git ]; then
  rm -rf /var/www/lunelio
  git clone --depth 1 "$REPO" /var/www/lunelio
fi
cp /var/www/lunelio/deploy/nginx-lunelio.conf /etc/nginx/sites-available/lunelio
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/lunelio /etc/nginx/sites-enabled/lunelio
nginx -t
systemctl reload nginx
echo "Lunelio est en ligne : http://$(hostname -I | awk '{print $1}')"
