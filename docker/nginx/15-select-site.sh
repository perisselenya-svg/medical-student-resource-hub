#!/bin/sh
# Chooses the Nginx site template before the official image runs envsubst
# (20-envsubst-on-templates.sh). Until a Let's Encrypt certificate exists for
# $DOMAIN we serve HTTP only, so Certbot's webroot challenge can succeed.
set -eu
mkdir -p /tmp/nginx-templates
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  cp /etc/nginx/site-templates/https.conf.template /tmp/nginx-templates/default.conf.template
  echo "resource-hub: certificate found for ${DOMAIN}, serving HTTPS"
else
  cp /etc/nginx/site-templates/http-only.conf.template /tmp/nginx-templates/default.conf.template
  echo "resource-hub: WARNING no certificate for ${DOMAIN} yet, serving HTTP only (run certbot on the host, then: docker compose restart nginx)"
fi
