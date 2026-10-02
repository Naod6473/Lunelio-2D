#!/usr/bin/env bash
# Installe le service des sauvegardes partagées de Lunelio (profils, sauvegardes, tableau des scores).
# À lancer une seule fois, en root, dans le conteneur qui sert le jeu (après installer-lxc.sh) :
#   bash /var/www/lunelio/deploy/installer-service.sh
# Il peut être relancé sans risque (les sauvegardes déjà là ne sont pas touchées).
set -euo pipefail
JEU=/var/www/lunelio
DATA=/var/lib/lunelio

command -v python3 >/dev/null || { apt update; apt install -y python3; }

# un utilisateur à part, sans connexion, qui ne peut écrire que dans le dossier des sauvegardes
id lunelio >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin lunelio
install -d -o lunelio -g lunelio -m 700 "$DATA"

cat > /etc/systemd/system/lunelio-api.service <<EOF
[Unit]
Description=Lunelio : sauvegardes partagées et scores de la famille
After=network.target

[Service]
User=lunelio
Group=lunelio
Environment=LUNELIO_DATA=$DATA
Environment=LUNELIO_PORT=8770
ExecStart=/usr/bin/python3 $JEU/deploy/lunelio_api.py
Restart=on-failure
RestartSec=3
# protections : rien d'autre que le dossier des sauvegardes en écriture
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ReadWritePaths=$DATA
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
MemoryMax=128M

[Install]
WantedBy=multi-user.target
EOF

# la mise à jour automatique remplace le code du service : on le relance alors tout seul
cat > /etc/systemd/system/lunelio-api-relance.service <<EOF
[Unit]
Description=Relance le service des sauvegardes de Lunelio après une mise à jour

[Service]
Type=oneshot
ExecStart=/bin/systemctl try-restart lunelio-api.service
EOF
cat > /etc/systemd/system/lunelio-api-relance.path <<EOF
[Unit]
Description=Surveille le code du service des sauvegardes de Lunelio

[Path]
PathChanged=$JEU/deploy/lunelio_api.py

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now lunelio-api.service lunelio-api-relance.path
systemctl restart lunelio-api.service

# Nginx : la configuration du dépôt transmet /api/ au service
cp "$JEU/deploy/nginx-lunelio.conf" /etc/nginx/sites-available/lunelio
nginx -t
systemctl reload nginx

sleep 1
if curl -fsS http://127.0.0.1/api/etat >/dev/null; then
  echo "Service des sauvegardes en marche : http://$(hostname -I | awk '{print $1}')/api/etat"
else
  echo "Le service ne répond pas : voir « journalctl -u lunelio-api »" >&2
  exit 1
fi
echo "Sauvegardes dans $DATA (pensez à les copier de temps en temps ailleurs que dans le conteneur)."
echo "Sur internet, protégez /api/ avec Cloudflare Access : voir docs/cloudflare_api.md."
