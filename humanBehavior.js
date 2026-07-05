// humanBehavior.js - Vitendo vidogo vinavyofanya bot ionekane zaidi "kama binadamu"
// ili kupunguza hatari ya WhatsApp kutambua na kuzuia (ban) akaunti.

function randomDelay(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Onyesha "typing..." kwa muda fulani kabla ya kujibu, kama binadamu anavyofanya.
 * @param {*} sock - Baileys socket
 * @param {*} jid - chat id
 * @param {number} minMs
 * @param {number} maxMs
 */
async function simulateTyping(sock, jid, minMs = 1200, maxMs = 3500) {
  try {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate('composing', jid);
    await randomDelay(minMs, maxMs);
    await sock.sendPresenceUpdate('paused', jid);
  } catch (e) {
    // presence si muhimu sana - kama ikishindikana, endelea tu
  }
}

/**
 * Subiri muda mfupi wa nasibu kati ya vitendo (mfano kabla ya kutuma ujumbe unaofuata
 * kwa mtumiaji mwingine kwenye broadcast), ili kuepuka mfululizo wa haraka usio wa kawaida.
 */
async function humanPause(minMs = 800, maxMs = 2500) {
  await randomDelay(minMs, maxMs);
}

module.exports = { randomDelay, simulateTyping, humanPause };
