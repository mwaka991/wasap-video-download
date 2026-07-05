# WhatsApp Video Downloader Bot (Baileys)

Bot ya WhatsApp inayotumia **@whiskeysockets/baileys** (WhatsApp Web multi-device API isiyo
rasmi) kupokea link za video, kuzidownload kwa `yt-dlp`, na kuzirudisha kwa mtumiaji.

## ⚠️ Onyo muhimu kabla ya kuanza

Hii ni njia **isiyo rasmi (unofficial)** ya kuunganisha na WhatsApp. Sio Meta Cloud API rasmi.
- WhatsApp inaweza kugundua tabia isiyo ya kibinadamu (automation) na **kupiga marufuku (ban)**
  namba inayotumika.
- Tumia **namba tofauti** isiyo muhimu sana kwako mwanzoni (siyo namba yako binafsi/biashara
  kuu), hadi uwe na uhakika inafanya kazi vizuri kwa muda.
- Epuka kutuma kwa watu wengi kwa haraka sana (bulk messaging) - hii ndiyo tabia inayosababisha
  ban haraka zaidi.
- Kodi hii ina delays za kibinadamu (`humanBehavior.js`) na rate-limiting kupunguza hatari, lakini
  hazizuii ban 100%.

## Muundo wa mradi

```
wa-video-bot/
  index.js           - faili kuu, inaunganisha na WhatsApp na kupokea ujumbe
  db.js              - database ya SQLite (watumiaji + maombi ya video)
  downloader.js      - inaita yt-dlp kudownload video
  humanBehavior.js    - delays/typing indicator za kuiga tabia ya kibinadamu
  package.json
  auth_info/         - itaundwa yenyewe; ina "session" ya WhatsApp (usiifute bila sababu!)
  wa_users.db        - database itakayoundwa yenyewe
```

## Hatua za usanidi (kwenye VPS ya Ubuntu, kama uliyotumia kwa bot ya Telegram)

### 1. Sakinisha Node.js (toleo 18 au zaidi)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # thibitisha imefungwa
```

### 2. Hakikisha yt-dlp na ffmpeg zipo (kama kwenye bot ya Telegram)
```bash
sudo apt install -y ffmpeg
pip install -U yt-dlp --break-system-packages
# au: sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod +x /usr/local/bin/yt-dlp
```

### 3. Pandisha faili za mradi kwenye VPS
Nakili folder nzima `wa-video-bot` kwenda VPS yako (kwa `scp` au kwa `nano` kama awali).

### 4. Sakinisha dependencies za Node
```bash
cd wa-video-bot
npm install
```

### 5. Anzisha bot na scan QR
```bash
node index.js
```
QR code itaonekana moja kwa moja kwenye terminal (ASCII art). Fungua **WhatsApp kwenye simu
yako** → **Settings → Linked Devices → Link a Device** → scan hiyo QR.

Ukiona `✅ Bot imeunganishwa na WhatsApp kikamilifu!` kwenye logs, imefanikiwa!

### 6. Jaribu
Tuma link ya video (YouTube/TikTok/n.k) kwa **namba hiyo ya WhatsApp** kutoka namba nyingine -
bot itajibu na kukurudishia video.

## Kuendesha 24/7 (systemd) - kama ulivyofanya kwa Telegram bot

```bash
sudo nano /etc/systemd/system/wabot.service
```
```ini
[Unit]
Description=WhatsApp Video Bot
After=network.target

[Service]
Type=simple
User=username
WorkingDirectory=/home/username/wa-video-bot
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable wabot
sudo systemctl start wabot
journalctl -u wabot -f   # kuona logs, ikiwemo QR code mara ya kwanza
```

**Muhimu**: Mara ya kwanza tu unahitaji kuona QR kwenye logs na kui-scan. Baada ya hapo, session
inahifadhiwa kwenye folder `auth_info/` na bot itaunganishwa yenyewe kila inapoanza (haihitaji
QR tena, isipokuwa uki-logout kutoka WhatsApp yako au ukifuta `auth_info/`).

## Kuhusu "Video ID" na Database

Kila video iliyoombwa inapata **video_id** ya kipekee (kwa mfano `a1b2c3d4e5f6`), inayohifadhiwa
kwenye jedwali `requests` la `wa_users.db` pamoja na: `jid` (namba ya mtumiaji), `url` aliyotuma,
`status` (success/failed/too_large), na wakati. Hii inakupa uwezo wa kuona historia ya maombi na
kutambua matumizi mabaya (abuse) baadaye ukihitaji.

## Rate limiting iliyowekwa

Kwa default, mtumiaji mmoja haruhusiwi zaidi ya **maombi 5 kwa dakika 10**. Unaweza kubadilisha
hii kwenye `index.js`:
```js
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 10;
```

## Vikwazo vinavyojulikana

- WhatsApp ina limit ya ukubwa wa video (~64-100MB kutegemea toleo la app) - videos kubwa
  zitakataliwa na bot itakuambia.
- Vikundi (`@g.us`) vime-ignore kwa makusudi ili kuepuka mtu kutumia bot ndani ya grupu bila
  ruhusa - unaweza kuondoa hicho kizuizi kwenye `index.js` ukitaka bot ifanye kazi kwenye vikundi
  pia, lakini hilo linaongeza hatari ya ban ukiwa na wanachama wengi wanaotuma link kwa wakati
  mmoja.
