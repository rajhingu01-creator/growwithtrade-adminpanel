# Tradewithgrow Hostinger Deployment

This setup deploys:
- Main site + API: `tradewithgrow.com`
- Admin panel: `tradewithgrow.com/adminpanel`
- Support panel: `support.tradewithgrow.com`

## 1) VPS prerequisites

Run on Hostinger VPS:

```bash
sudo apt update
sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

## 2) Clone and install

```bash
cd /var/www
sudo git clone <your-repo-url> tradewithgrow
cd tradewithgrow
npm install
cd adminpanel && npm install && cd ..
cd twg-support && npm install && cd ..
```

## 3) Environment files

Create root `.env` at `/var/www/tradewithgrow/.env`:

```env
NODE_ENV=production
PORT=3001
APP_URL=https://tradewithgrow.com
APP_BASE_URL=https://tradewithgrow.com
PUBLIC_APP_URL=https://tradewithgrow.com
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
GOOGLE_CLIENT_ID=<your-google-client-id>
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-pass>
SMTP_FROM=<from-email>
NOWPAYMENTS_API_KEY=<nowpayments-key>
NOWPAYMENTS_REDIRECT_BASE_URL=https://tradewithgrow.com
UROPAY_API_KEY=<uropay-key>
UROPAY_SECRET=<uropay-secret>
PASSWORD_ENC_KEY=<64-hex-chars>
```

Create support `.env` at `/var/www/tradewithgrow/twg-support/.env`:

```env
NODE_ENV=production
PORT=3002
JWT_SECRET=<same-or-another-secret>
VITE_SOCKET_URL=https://support.tradewithgrow.com
```

Optional root `.env.production` (for Vite build-time variables):

```env
VITE_SUPPORT_SOCKET_URL=https://support.tradewithgrow.com
```

## 4) Build

```bash
cd /var/www/tradewithgrow
npm run build
cd twg-support
npm run build
```

## 5) PM2 process setup

Use the included PM2 config:

```bash
cd /var/www/tradewithgrow
pm2 start deploy/hostinger/ecosystem.config.cjs
pm2 save
pm2 startup
```

## 6) Nginx setup

Use `deploy/hostinger/nginx.tradewithgrow.conf` as template:

```bash
sudo cp deploy/hostinger/nginx.tradewithgrow.conf /etc/nginx/sites-available/tradewithgrow
sudo ln -s /etc/nginx/sites-available/tradewithgrow /etc/nginx/sites-enabled/tradewithgrow
sudo nginx -t
sudo systemctl reload nginx
```

Then add SSL certificates (Let's Encrypt):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tradewithgrow.com -d www.tradewithgrow.com -d support.tradewithgrow.com
```

## 7) DNS records in Hostinger

Create A records:
- `@` -> VPS public IP
- `www` -> VPS public IP
- `support` -> VPS public IP

## 8) Deploy updates

```bash
cd /var/www/tradewithgrow
git pull
npm install
cd adminpanel && npm install && cd ..
cd twg-support && npm install && npm run build && cd ..
npm run build
pm2 restart tradewithgrow-main tradewithgrow-support
```

## 9) Health checks

- `https://tradewithgrow.com`
- `https://tradewithgrow.com/adminpanel`
- `https://support.tradewithgrow.com`
- `pm2 status`
- `pm2 logs tradewithgrow-main`
- `pm2 logs tradewithgrow-support`
