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
const { NewMessage } = require("telegram/events");
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
  if (!message.replyMarkup || !message.replyMarkup.rows) return false;

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
          return false;
        }
      }
    }
  }
  return false;
}

function hasButtons(message) {
  return !!(message.replyMarkup && message.replyMarkup.rows);
}

function buttonLabels(message) {
  if (!hasButtons(message)) return [];
  const labels = [];
  for (const row of message.replyMarkup.rows) {
    for (const btn of row.buttons) {
      if (btn.text) labels.push(btn.text);
    }
  }
  return labels;
}

/* ─── parsers ─────────────────────────────────────────────── */

function parseNumText(text) {
  const records = [];
  const blocks = text.split(/📰\s*Rᴇᴄᴏʀᴅ\s*\d+\/\d+|📰\s*RECORD\s*\d+\/\d+/i).slice(1);

  for (const block of blocks) {
    const get = (label) => {
      const re = new RegExp(label + "\\s*:\\s*(.+?)(?:\\n|$)", "i");
      const m = block.match(re);
      return m ? m[1].trim() : "N/A";
    };

    const mobile = get("Nᴜᴍʙᴇʀ|Number|MOBILE");
    const name = get("Nᴀᴍᴇ|Name");
    const father = get("Fᴀᴛʜᴇʀ|Father");
    const alt = get("Aʟᴛ\\s*Nᴜᴍ|Alt");
    const circle = get("Cɪʀᴄʟᴇ|Circle");
    const address = get("Aᴅᴅʀᴇꜱꜱ|Address");
    const id = get("Iᴅ|ID|Aadhaar");

    if (name === "N/A" && mobile === "N/A") continue;

    records.push({
      mobile: mobile || "N/A",
      name: name || "N/A",
      father_name: father || "N/A",
      address: address || "N/A",
      circle: circle || "N/A",
      alternate: alt || "N/A",
      id: id || "N/A",
      email: "N/A",
    });
  }
  return records;
}

function parseTgText(text) {
  const idMatch =
    text.match(/TG\s*ID\s*:?\s*(\d{6,15})/i) ||
    text.match(/🆔\s*TG\s*ID\s*:?\s*(\d{6,15})/i) ||
    text.match(/telegram[_\s]?id\s*:?\s*(\d{6,15})/i);

  const phoneMatch =
    text.match(/Pʜᴏɴᴇ\s*:?\s*(\+?\d{8,15})/i) ||
    text.match(/Phone\s*:?\s*(\+?\d{8,15})/i);

  const countryMatch =
    text.match(/Cᴏᴜɴᴛʀʏ\s*:?\s*(.+?)(?:\n|$)/i) ||
    text.match(/Country\s*:?\s*(.+?)(?:\n|$)/i);

  const codeMatch =
    text.match(/Cᴏᴜɴᴛʀʏ\s*Cᴏᴅᴇ\s*:?\s*(\+?\d+)/i) ||
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

/* ─── queue processor ─────────────────────────────────────── */

async function processQueue() {
  if (locked || queue.length === 0) return;
  locked = true;

  active = queue.shift();
  active.replies = [];
  active.files = [];
  active.rawMessages = [];
  active.stage = "waiting_first";

  log("info", "QUEUE", `Processing ${active.input} (${active.type})`);

  try {
    await sendCommand(active.command);
  } catch (e) {
    log("error", "SEND", e.message);
    active.res.status(500).json({
      status: "error",
      message: "failed to send command to bot",
    });
    active = null;
    locked = false;
    processQueue();
    return;
  }

  active.timeout = setTimeout(() => {
    if (!active) return;
    log("warn", "TIMEOUT", active.input);

    const allText = active.replies.join("\n");
    if (active.type === "num") {
      const scraped = parseNumText(allText);
      if (scraped.length) {
        active.res.json({
          status: "success",
          query_type: "num",
          input: active.input,
          total_records: scraped.length,
          records: scraped,
          owner: "SABIR7718",
          note: "partial (timeout before full json)",
        });
      } else {
        active.res.status(404).json({
          status: "error",
          error: "timeout",
          message: `No result for ${active.input}`,
        });
      }
    } else {
      const tg = parseTgText(allText);
      if (tg) active.res.json(tg);
      else
        active.res.status(404).json({
          status: "error",
          error: "timeout",
          message: `No result for ${active.input}`,
        });
    }

    active = null;
    locked = false;
    processQueue();
  }, 45000);
}

/* ─── message handler ─────────────────────────────────────── */

async function onMessage(event) {
  const msg = event.message;
  if (!msg || msg.out || !active) return;

  try {
    const sender = await client.getEntity(msg.peerId);
    const uname = (sender.username || "").toLowerCase();
    if (uname !== BOT_USERNAME.toLowerCase()) return;

    if (msg.message) {
      active.replies.push(msg.message);
      active.rawMessages.push(msg);
    }

    // ── TG lookup ──
    if (active.type === "tg") {
      const combined = active.replies.join("\n");
      if (/TG\s*ID|telegram[_\s]?id|🆔/i.test(combined)) {
        clearTimeout(active.timeout);
        const parsed = parseTgText(combined);
        if (parsed) active.res.json(parsed);
        else
          active.res.status(404).json({
            status: "error",
            error: "not_found",
            message: `No result for ${active.input}`,
          });
        active = null;
        locked = false;
        processQueue();
      }
      return;
    }

    // ── NUM lookup ──
    if (active.type !== "num") return;

    const isReport =
      /NUMBER\s*INFO|Nᴜᴍʙᴇʀ\s*Iɴꜰᴏ|RECORD\s*\d|Rᴇᴄᴏʀᴅ\s*\d|Records\s*:/i.test(
        msg.message || ""
      );

    if (isReport && active.stage === "waiting_first") {
      log("info", "BOT", "First report received");

      let safety = 0;
      while (safety < 8) {
        safety++;
        await sleep(800);

        const history = await client.getMessages(await getBotEntity(), {
          limit: 3,
        });
        const latest = history.find((m) => !m.out) || history[0];
        if (!latest) break;

        const labels = buttonLabels(latest).map((l) => l.toLowerCase());
        log("info", "BTN", `labels: ${labels.join(" | ")}`);

        if (labels.some((l) => l.includes("download") || l.includes("json"))) {
          const clicked = await clickButton(latest, "download");
          if (!clicked) await clickButton(latest, "json");
          active.stage = "waiting_json";
          log("info", "BOT", "Clicked Download Json, waiting for file");
          break;
        }

        if (labels.some((l) => l.includes("next"))) {
          await clickButton(latest, "next");
          active.stage = "clicking_next";
          log("info", "BOT", "Clicked Next");
          await sleep(1200);
          continue;
        }

        break;
      }

      if (active.stage !== "waiting_json") {
        await sleep(1500);
        const scraped = parseNumText(active.replies.join("\n"));
        if (scraped.length) {
          clearTimeout(active.timeout);
          active.res.json({
            status: "success",
            query_type: "num",
            input: active.input,
            total_records: scraped.length,
            records: scraped,
            owner: "SABIR7718",
            note: "scraped (no download button)",
          });
          active = null;
          locked = false;
          processQueue();
        }
      }
      return;
    }

    // file arrived after Download click
    if (msg.document && active.stage === "waiting_json") {
      try {
        const buffer = await client.downloadMedia(msg, {});
        const fileName = (
          msg.document.attributes?.find(
            (a) => a.className === "DocumentAttributeFilename"
          )?.fileName || ""
        ).toLowerCase();

        log("info", "FILE", `Received: ${fileName || "unnamed"}`);

        const queryDigits = String(active.input).replace(/\D/g, "");
        const nameOk =
          !fileName ||
          fileName.includes(queryDigits) ||
          fileName.endsWith(".json") ||
          fileName.includes("record");

        if (!nameOk) {
          log("warn", "FILE", "Filename mismatch, ignoring");
          return;
        }

        const text = buffer.toString("utf-8");
        let raw;
        try {
          raw = JSON.parse(text);
        } catch {
          log("error", "FILE", "Invalid JSON in file");
          return;
        }

        const normalized = normalizeJsonRecords(raw);
        clearTimeout(active.timeout);

        if (normalized) {
          active.res.json(normalized);
        } else {
          active.res.status(404).json({
            status: "error",
            error: "parse_failed",
            message: `Could not parse file for ${active.input}`,
          });
        }

        active = null;
        locked = false;
        processQueue();
      } catch (err) {
        log("error", "FILE", err.message);
      }
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
      files: [],
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
