/**
 * index.js - WhatsApp Video Downloader Bot (Baileys / @whiskeysockets)
 *
 * Jinsi ya kutumia:
 * 1. npm install
 * 2. Hakikisha yt-dlp na ffmpeg zimesakinishwa kwenye mfumo (PATH)
 * 3. node index.js
 * 4. QR code itaonekana kwenye terminal -> fungua WhatsApp yako -> Linked Devices -> Link a Device
 * 5. Scan QR - bot itaunganishwa na akaunti yako ya WhatsApp
 *
 * MUHIMU KUHUSU USALAMA WA AKAUNTI:
 * - Hii ni njia isiyo rasmi (unofficial). WhatsApp inaweza kugundua automation na ku-ban namba.
 * - Tumia namba isiyo ya thamani kubwa kwako mwanzoni (siyo namba yako kuu binafsi/biashara).
 * - Kodi hii ina delays za kibinadamu (typing indicator, muda wa nasibu) na rate-limiting
 *   kupunguza hatari, lakini haiondoi hatari kabisa.
 */

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const db = require('./db');
const { downloadVideo, cleanup, MAX_WHATSAPP_SIZE_BYTES } = require('./downloader');
const { simulateTyping, humanPause } = require('./humanBehavior');

const logger = pino({ level: 'info' });

const URL_REGEX = /https?:\/\/\S+/;

// Rate limit: mtumiaji mmoja asizidi maombi X ndani ya dakika Y (kupunguza spam-like behavior)
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 10;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }), // logs za ndani za baileys - "silent" ili terminal ibaki safi
    printQRInTerminal: true, // itaonyesha QR moja kwa moja kwenye terminal
    browser: ['VideoBot', 'Chrome', '1.0.0'], // jina litakaloonekana kwenye "Linked Devices"
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn(`Muunganiko umefungwa. Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) {
        startBot();
      } else {
        logger.error('Umetolewa nje (logged out). Futa folder "auth_info" na uanze upya na QR mpya.');
      }
    } else if (connection === 'open') {
      logger.info('✅ Bot imeunganishwa na WhatsApp kikamilifu!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;
      //if (jid.endsWith('@g.us')) continue; // puuza vikundi (groups) - bot ya link tu ya binafsi

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      if (!text) continue;

      db.upsertUser(jid);
      handleIncomingText(sock, jid, text).catch((e) =>
        logger.error(e, 'Hitilafu kwenye handleIncomingText')
      );
    }
  });
}

async function handleIncomingText(sock, jid, text) {
  const match = text.match(URL_REGEX);

  if (!match) {
    // Sio link - jibu kwa upole tu, bila haraka (kama binadamu anavyosoma kwanza)
    await simulateTyping(sock, jid, 1000, 2500);
    await sock.sendMessage(jid, {
      text:
        'Habari! Nitumie link ya video (YouTube, TikTok, Instagram, n.k) ' +
        'nami nitakudownloadia. 🎬',
    });
    return;
  }

  const url = match[0];

  // Rate limiting - kama mtumiaji kazidi maombi mengi kwa muda mfupi
  const recentRequests = db.requestsInLastMinutes(jid, RATE_LIMIT_WINDOW_MINUTES);
  if (recentRequests >= RATE_LIMIT_MAX_REQUESTS) {
    await simulateTyping(sock, jid);
    await sock.sendMessage(jid, {
      text: `⏳ Umefikia limit ya maombi (${RATE_LIMIT_MAX_REQUESTS} kwa dakika ${RATE_LIMIT_WINDOW_MINUTES}). Subiri kidogo kisha jaribu tena.`,
    });
    return;
  }

  await simulateTyping(sock, jid, 1500, 3000);
  await sock.sendMessage(jid, { text: '⏳ Ninapakua video, subiri kidogo...' });

  let downloadResult;
  try {
    downloadResult = await downloadVideo(url);
  } catch (err) {
    logger.error(err, 'Download error');
    db.logRequest(jid, url, null, 'failed');
    await humanPause();
    await sock.sendMessage(jid, { text: `❌ Kuna hitilafu: ${err.message}` });
    return;
  }

  const { filePath, videoId, sizeBytes, outDir } = downloadResult;

  try {
    if (sizeBytes > MAX_WHATSAPP_SIZE_BYTES) {
      db.logRequest(jid, url, videoId, 'too_large');
      await sock.sendMessage(jid, {
        text: `⚠️ Video ni kubwa (${(sizeBytes / 1024 / 1024).toFixed(1)}MB) kuliko limit ya WhatsApp. Jaribu ubora wa chini.`,
      });
      return;
    }

    db.logRequest(jid, url, videoId, 'success');
    await simulateTyping(sock, jid, 800, 1600);

    const videoBuffer = fs.readFileSync(filePath);
    await sock.sendMessage(jid, {
      video: videoBuffer,
      caption: `✅ Hii hapa video yako\n🆔 ID: ${videoId}`,
      mimetype: 'video/mp4',
    });
  } finally {
    cleanup(outDir);
  }
}

startBot();
