/*
 * © 2026 SeXyxeon (VOIDSEC)
 *
 * ⚠️ COPYRIGHT NOTICE
 * This source code is protected under copyright law.
 * Any form of re-uploading, recoding, modification,
 * selling, or redistribution WITHOUT explicit permission
 * from the original author is strictly prohibited.
 *
 * ❌ NO CREDIT = NO PERMISSION
 * ❌ DO NOT CLAIM THIS CODE AS YOUR OWN
 *
 * ✔️ Usage or modification is allowed ONLY
 * with prior permission and proper credit.
 *
 * OFFICIAL LINKS (ONLY):
 * YouTube   : https://youtube.com/@voidsec7718
 * Instagram : sabir._7718
 * Telegram  : https://t.me/SABIR7718
 * GitHub    : https://github.com/SABIR7718
 * WhatsApp  : +91 73650 85213
 *
 * Violations may result in DMCA takedown
 * or termination of the Telegram bot.
 */

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage, Raw } = require("telegram/events");
let EditedMessage;
try {
  EditedMessage = require("telegram/events/EditedMessage").EditedMessage;
} catch (_) {
  EditedMessage = null;
}
const { Api } = require("telegram");
const express = require("express");
const readline = require("readline");
require("dotenv").config();

const { log } = require("@sabir7718/log");

const app = express();
app.use(express.json());

const API_ID = parseInt(process.env.API_ID, 10);
const API_HASH = process.env.API_HASH;
const PORT = process.env.PORT || 3000;
const BOT_USERNAME = (process.env.BOT_USERNAME || "TumNahiHo").replace(/^@/, "");
const SESSION = new StringSession(process.env.SESSION_STRING || "");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const client = new TelegramClient(SESSION, API_ID, API_HASH, {
  connectionRetries: 5,
});

let active = null;
const queue = [];
let locked = false;

/* ─── helpers ─────────────────────────────────────────────── */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getBotEntity() {
  return client.getEntity(BOT_USERNAME);
}

async function sendCommand(cmd) {
  const entity = await getBotEntity();
  await client.sendMessage(entity, { message: cmd });
}

async function clickButton(message, buttonText) {
  if (!message || !message.replyMarkup || !message.replyMarkup.rows) return false;

  for (const row of message.replyMarkup.rows) {
    for (const btn of row.buttons) {
      const text = (btn.text || "").toLowerCase();
      if (text.includes(buttonText.toLowerCase())) {
        try {
          await client.invoke(
            new Api.messages.GetBotCallbackAnswer({
              peer: await getBotEntity(),
              msgId: message.id,
              data: btn.data,
            })
          );
          return true;
        } catch (e) {
          log("warn", "BTN", e.message);
          return true;
        }
      }
    }
  }
  return false;
}

function buttonLabels(message) {
  if (!message || !message.replyMarkup || !message.replyMarkup.rows) return [];
  const labels = [];
  for (const row of message.replyMarkup.rows) {
    for (const btn of row.buttons) {
      if (btn.text) labels.push(btn.text);
    }
  }
  return labels;
}

function isSearchingMessage(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return (
    /searching/i.test(t) ||
    /please\s*wait/i.test(t) ||
    /looking\s*up/i.test(t) ||
    /fetching/i.test(t) ||
    (/[⏳🔍🔎]/.test(text) && t.length < 80 && !/\d{6,}/.test(text))
  );
}

function isNotFoundMessage(text) {
  if (!text) return false;
  return (
    /not\s*found/i.test(text) ||
    /no\s*result/i.test(text) ||
    /no\s*data/i.test(text) ||
    /nothing\s*found/i.test(text) ||
    /could\s*not\s*find/i.test(text) ||
    /\bfailed\b/i.test(text) ||
    /does\s*not\s*exist/i.test(text) ||
    /user\s*not\s*found/i.test(text)
  );
}

/* ─── parsers ─────────────────────────────────────────────── */

function safeMatch(text, patterns) {
  if (!text) return null;
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1] != null) return String(m[1]).trim();
  }
  return null;
}

function parseNumText(text) {
  if (!text) return [];
  const records = [];

  const blocks = text.split(
    /📰\s*R[ᴇe][ᴄc][ᴏo][ʀr][ᴅd]\s*\d+\s*\/\s*\d+|RECORD\s*\d+\s*\/\s*\d+/i
  ).slice(1);

  for (const block of blocks) {
    if (!block) continue;

    const mobile =
      safeMatch(block, [
        /Nᴜᴍʙᴇʀ\s*:\s*(.+?)(?:\n|$)/i,
        /Number\s*:\s*(.+?)(?:\n|$)/i,
        /NUMBER\s*:\s*(.+?)(?:\n|$)/i,
        /MOBILE\s*:\s*(.+?)(?:\n|$)/i,
      ]) || "N/A";

    const name =
      safeMatch(block, [
        /Nᴀᴍᴇ\s*:\s*(.+?)(?:\n|$)/i,
        /Name\s*:\s*(.+?)(?:\n|$)/i,
        /NAME\s*:\s*(.+?)(?:\n|$)/i,
      ]) || "N/A";

    const father =
      safeMatch(block, [
        /Fᴀᴛʜᴇʀ\s*:\s*(.+?)(?:\n|$)/i,
        /Father\s*:\s*(.+?)(?:\n|$)/i,
        /FATHER\s*:\s*(.+?)(?:\n|$)/i,
      ]) || "N/A";

    const alt =
      safeMatch(block, [
        /Aʟᴛ\s*Nᴜᴍ\s*:\s*(.+?)(?:\n|$)/i,
        /Alt\s*Num\s*:\s*(.+?)(?:\n|$)/i,
        /ALT\s*NUM\s*:\s*(.+?)(?:\n|$)/i,
        /Alternate\s*:\s*(.+?)(?:\n|$)/i,
      ]) || "N/A";

    const circle =
      safeMatch(block, [
        /Cɪʀᴄʟᴇ\s*:\s*(.+?)(?:\n|$)/i,
        /Circle\s*:\s*(.+?)(?:\n|$)/i,
        /CIRCLE\s*:\s*(.+?)(?:\n|$)/i,
      ]) || "N/A";

    const address =
      safeMatch(block, [
        /Aᴅᴅʀᴇꜱꜱ\s*:\s*(.+?)(?:\n|$)/i,
        /Address\s*:\s*(.+?)(?:\n|$)/i,
        /ADDRESS\s*:\s*(.+?)(?:\n|$)/i,
      ]) || "N/A";

    const id =
      safeMatch(block, [
        /Iᴅ\s*:\s*(.+?)(?:\n|$)/i,
        /Id\s*:\s*(.+?)(?:\n|$)/i,
        /ID\s*:\s*(.+?)(?:\n|$)/i,
        /Aadhaar\s*:\s*(.+?)(?:\n|$)/i,
      ]) || "N/A";

    if (name === "N/A" && mobile === "N/A") continue;

    records.push({
      mobile,
      name,
      father_name: father,
      address,
      circle,
      alternate: alt,
      id,
      email: "N/A",
    });
  }
  return records;
}

function parseTgText(text) {
  if (!text) return null;

  const idMatch =
    text.match(/TG\s*ID\s*:?\s*(\d{6,15})/i) ||
    text.match(/🆔\s*TG\s*ID\s*:?\s*(\d{6,15})/i) ||
    text.match(/telegram[_\s]?id\s*:?\s*(\d{6,15})/i) ||
    text.match(/TGID\s*:?\s*(\d{6,15})/i);

  const phoneMatch =
    text.match(/Pʜᴏɴᴇ\s*:?\s*(\+?\d{8,15})/i) ||
    text.match(/PHONE\s*:?\s*(\+?\d{8,15})/i) ||
    text.match(/Phone\s*:?\s*(\+?\d{8,15})/i);

  const countryMatch =
    text.match(/Cᴏᴜɴᴛʀʏ\s*:?\s*(.+?)(?:\n|$)/i) ||
    text.match(/COUNTRY\s*:?\s*(.+?)(?:\n|$)/i) ||
    text.match(/Country\s*:?\s*(.+?)(?:\n|$)/i);

  const codeMatch =
    text.match(/Cᴏᴜɴᴛʀʏ\s*Cᴏᴅᴇ\s*:?\s*(\+?\d+)/i) ||
    text.match(/COUNTRY\s*CODE\s*:?\s*(\+?\d+)/i) ||
    text.match(/Country\s*Code\s*:?\s*(\+?\d+)/i);

  if (!idMatch) return null;

  return {
    status: "success",
    query_type: "tg",
    input: active ? active.input : null,
    telegram_info: {
      telegram_id: idMatch[1],
      phone: phoneMatch ? phoneMatch[1] : "N/A",
      country: countryMatch ? countryMatch[1].trim() : "N/A",
      country_code: codeMatch ? codeMatch[1] : "N/A",
      username: "N/A",
    },
    total_records: 0,
    records: [],
    owner: "SABIR7718",
  };
}

function normalizeJsonRecords(raw) {
  if (!raw || !Array.isArray(raw.records)) return null;

  return {
    status: "success",
    query_type: "num",
    input: raw.number || (active ? active.input : null),
    total_records: raw.total || raw.records.length,
    records: raw.records.map((r, i) => ({
      record_no: r.record_no || i + 1,
      mobile: r.mobile || r.number || "N/A",
      name: r.name || "N/A",
      truecaller_name: r.truecaller_name || "N/A",
      father_name: r.father_name || r.father || "N/A",
      address: r.address || "N/A",
      circle: r.circle || "N/A",
      alternate: r.alternate || r.alt_number || "N/A",
      id: r.id || r.aadhaar || "N/A",
      email: r.email || "N/A",
    })),
    owner: "SABIR7718",
  };
}

/* ─── finish helpers ──────────────────────────────────────── */

function finishOk(payload) {
  if (!active) return;
  try {
    clearTimeout(active.timeout);
  } catch (_) {}
  try {
    active.res.json(payload);
  } catch (_) {}
  active = null;
  locked = false;
  processQueue();
}

function finishErr(status, body) {
  if (!active) return;
  try {
    clearTimeout(active.timeout);
  } catch (_) {}
  try {
    active.res.status(status).json(body);
  } catch (_) {}
  active = null;
  locked = false;
  processQueue();
}

/* ─── queue processor ─────────────────────────────────────── */

async function processQueue() {
  if (locked || queue.length === 0) return;
  locked = true;

  active = queue.shift();
  active.replies = [];
  active.rawMessages = [];
  active.stage = "waiting_first";

  log("info", "QUEUE", `Processing ${active.input} (${active.type})`);

  try {
    await sendCommand(active.command);
  } catch (e) {
    log("error", "SEND", e.message);
    finishErr(500, {
      status: "error",
      message: "failed to send command to bot",
    });
    return;
  }

  active.timeout = setTimeout(() => {
    if (!active) return;
    log("warn", "TIMEOUT", active.input);
    log(
      "warn",
      "TIMEOUT_REPLIES",
      JSON.stringify(active.replies || []).slice(0, 600)
    );

    const allText = (active.replies || []).join("\n");

    if (active.type === "num") {
      const scraped = parseNumText(allText);
      if (scraped.length) {
        finishOk({
          status: "success",
          query_type: "num",
          input: active.input,
          total_records: scraped.length,
          records: scraped,
          owner: "SABIR7718",
          note: "partial (timeout before full json)",
        });
      } else {
        finishErr(404, {
          status: "error",
          error: "not_found",
          message: `No result for ${active.input}`,
        });
      }
    } else {
      const tg = parseTgText(allText);
      if (tg) finishOk(tg);
      else
        finishErr(404, {
          status: "error",
          error: "not_found",
          message: `No result for ${active.input}`,
        });
    }
  }, 60000);
}

/* ─── message handler ─────────────────────────────────────── */

async function onMessage(event) {
  const msg = event.message;
  if (!msg || msg.out || !active) return;

  try {
    const text = msg.message || "";

    // log EVERY incoming message while a request is active
    log(
      "info",
      "RAW",
      `doc=${!!msg.document} len=${text.length} | ${text
        .slice(0, 120)
        .replace(/\n/g, " \\n ")}`
    );

    if (isSearchingMessage(text)) {
      log("info", "MSG", "searching (ignored)");
      return;
    }

    if (text) {
      active.replies.push(text);
      active.rawMessages.push(msg);
    }

    // ── TG lookup ──
    if (active.type === "tg") {
      const combined = active.replies.join("\n");

      if (isNotFoundMessage(combined) && !/TG\s*ID|\d{9,}/i.test(combined)) {
        log("info", "TG", "not found");
        finishErr(404, {
          status: "error",
          error: "not_found",
          message: `No result for ${active.input}`,
        });
        return;
      }

      if (/TG\s*ID/i.test(combined)) {
        const parsed = parseTgText(combined);
        if (parsed) {
          log("info", "TG", `parsed id=${parsed.telegram_info.telegram_id}`);
          finishOk(parsed);
          return;
        }
        log("warn", "TG", "TG ID present but parse failed");
      }
      return;
    }

    // ── NUM lookup ──
    if (active.type !== "num") return;

    if (
      isNotFoundMessage(text) &&
      !msg.document &&
      !/RECORD|NUMBER/i.test(text)
    ) {
      log("info", "NUM", "not found");
      finishErr(404, {
        status: "error",
        error: "not_found",
        message: `No result for ${active.input}`,
      });
      return;
    }

    if (msg.document) {
      try {
        const buffer = await client.downloadMedia(msg, {});
        let fileName = "";
        try {
          const attr = (msg.document.attributes || []).find(
            (a) =>
              a.className === "DocumentAttributeFilename" ||
              a.fileName
          );
          fileName = (
            (attr && (attr.fileName || attr.file_name)) ||
            ""
          ).toLowerCase();
        } catch (_) {}

        log("info", "FILE", `Received: ${fileName || "unnamed"}`);

        const queryDigits = String(active.input).replace(/\D/g, "");
        const nameOk =
          !fileName ||
          fileName.includes(queryDigits) ||
          fileName.endsWith(".json") ||
          fileName.includes("result") ||
          fileName.includes("record") ||
          fileName.includes("num");

        if (!nameOk) {
          log("warn", "FILE", "Filename mismatch, ignoring");
          return;
        }

        const body = buffer.toString("utf-8");
        let raw;
        try {
          raw = JSON.parse(body);
        } catch (e) {
          log("error", "FILE", "Invalid JSON: " + e.message);
          return;
        }

        const normalized = normalizeJsonRecords(raw);
        if (normalized) {
          finishOk(normalized);
        } else {
          finishErr(404, {
            status: "error",
            error: "not_found",
            message: `No result for ${active.input}`,
          });
        }
      } catch (err) {
        log("error", "FILE", err.message);
      }
      return;
    }

    const isReport =
      /NUMBER\s*INFO|Nᴜᴍʙᴇʀ\s*Iɴꜰᴏ|RECORD\s*\d|Rᴇᴄᴏʀᴅ\s*\d|Records\s*:|Rᴇᴄᴏʀᴅꜱ/i.test(
        text
      );

    if (isReport && active.stage === "waiting_first") {
      log("info", "BOT", "First report received");
      active.stage = "navigating";

      (async () => {
        try {
          let safety = 0;
          while (active && safety < 10) {
            safety++;
            await sleep(900);

            const history = await client.getMessages(await getBotEntity(), {
              limit: 5,
            });
            const latest =
              history.find((m) => !m.out && m.replyMarkup) ||
              history.find((m) => !m.out) ||
              history[0];

            if (!latest) continue;

            const labels = buttonLabels(latest).map((l) =>
              (l || "").toLowerCase()
            );
            log("info", "BTN", `labels: ${labels.join(" | ")}`);

            if (
              labels.some(
                (l) => l.includes("download") || l.includes("json")
              )
            ) {
              const ok =
                (await clickButton(latest, "download")) ||
                (await clickButton(latest, "json"));
              if (ok) {
                active.stage = "waiting_json";
                log("info", "BOT", "Clicked Download Json, waiting for file");
              }
              break;
            }

            if (labels.some((l) => l.includes("next"))) {
              await clickButton(latest, "next");
              log("info", "BOT", "Clicked Next");
              await sleep(1100);
              continue;
            }

            if (
              labels.some((l) =>
                /^\d+\s*\/\s*\d+$/.test(l.replace(/\s/g, ""))
              )
            ) {
              await sleep(800);
              continue;
            }

            break;
          }
        } catch (e) {
          log("error", "NAV", e.message);
        }
      })();
    }
  } catch (err) {
    log("error", "HANDLER", err.message);
  }
}

/* ─── boot ────────────────────────────────────────────────── */

(async () => {
  await client.start({
    phoneNumber: async () =>
      new Promise((resolve) => rl.question("Enter Number : ", resolve)),
    password: async () =>
      new Promise((resolve) => rl.question("Enter 2FA Password : ", resolve)),
    phoneCode: async () =>
      new Promise((resolve) => rl.question("Enter OTP : ", resolve)),
    onError: (e) => log("error", "LOGIN", e.message),
  });

  log("info", "SYSTEM", "Telegram Client Connected");
  log("info", "SYSTEM", `Target bot/group user: @${BOT_USERNAME}`);

  client.addEventHandler(onMessage, new NewMessage({}));

  // bot edits the same "Searching..." message into the final result
  if (EditedMessage) {
    client.addEventHandler(onMessage, new EditedMessage({}));
    log("info", "SYSTEM", "EditedMessage handler attached");
  } else {
    // fallback: catch edit updates via Raw
    client.addEventHandler(async (update) => {
      try {
        if (
          update &&
          (update.className === "UpdateEditMessage" ||
            update.className === "UpdateEditChannelMessage") &&
          update.message
        ) {
          await onMessage({ message: update.message });
        }
      } catch (e) {
        log("error", "RAW_EDIT", e.message);
      }
    }, new Raw({}));
    log("info", "SYSTEM", "Raw edit handler attached (EditedMessage missing)");
  }

  app.get("/search", (req, res) => {
    const { type, query } = req.query;

    if (!type || !query) {
      return res.status(400).json({
        status: "error",
        message: "Missing query params",
      });
    }

    let command = "";
    if (type === "num") {
      command = `/num ${query}`;
    } else if (type === "tg") {
      command = `/tgid ${query}`;
    } else {
      return res.status(400).json({
        status: "error",
        message: "Invalid type — use num or tg",
      });
    }

    const id =
      Date.now() + "_" + Math.random().toString(36).slice(2, 7);

    queue.push({
      id,
      res,
      type,
      input: query,
      command,
      replies: [],
      rawMessages: [],
      timeout: null,
      stage: "waiting_first",
    });

    log("info", "API", `Queued -> ${query} (${type})`);
    processQueue();
  });

  app.listen(PORT, () => {
    log("info", "SERVER", `Running on port ${PORT}`);
  });
})();

/* ─── health + keep-alive ─────────────────────────────────── */

const START = Date.now();

app.get("/", (_req, res) => {
  const up = Math.floor((Date.now() - START) / 1000);
  const h = Math.floor(up / 3600);
  const m = Math.floor((up % 3600) / 60);
  const s = up % 60;

  res.json({
    status: "online",
    service: "S7 Info Bridge",
    developer: { name: "SABIR7718" },
    target: `@${BOT_USERNAME}`,
    uptime: {
      seconds: up,
      formatted: `${h}h ${m}m ${s}s`,
    },
    usage: {
      number_lookup: "/search?type=num&query=9002556353",
      telegram_lookup: "/search?type=tg&query=sabir7718",
    },
    queue: {
      pending: queue.length,
      processing: !!active,
    },
    server: {
      port: PORT,
      node: process.version,
    },
  });
});

if (process.env.URL) {
  const ping = async () => {
    try {
      const r = await fetch(process.env.URL);
      log("info", "PING", `Pinged ${process.env.URL} | ${r.status}`);
    } catch (e) {
      log("error", "PING", e.message);
    }
  };
  ping();
  setInterval(ping, 5 * 60 * 1000);
}
