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

const {
    TelegramClient
} = require("telegram");
const {
    StringSession
} = require("telegram/sessions");
const {
    NewMessage
} = require("telegram/events");
const express = require("express");
const readline = require("readline");
require("dotenv").config();

const {
    log
} = require("@sabir7718/log");

const S7HaTeSY_APP = express();
S7HaTeSY_APP.use(express.json());

const S7_API_ID = parseInt(process.env.API_ID);
const S7_API_HASH = process.env.API_HASH;
const S7_PORT = process.env.PORT || 3000;

const S7_TARGET_BOT = process.env.BOT_USERNAME;

const SYHaTe_SESSION = new StringSession(process.env.SESSION_STRING || "");

const HaTe_READLINE = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const SABIR7718_CLIENT = new TelegramClient(
    SYHaTe_SESSION,
    S7_API_ID,
    S7_API_HASH, {
        connectionRetries: 5,
    }
);

let S7_ACTIVE_REQUEST = null;

const SABIR7718_QUEUE = [];

let S7_QUEUE_LOCK = false;

function SYHaTe_PARSE_RESPONSE(S7_REPLY_1, S7_REPLY_2, S7_TYPE, S7_INPUT) {

    const HaTe_COMBINED_TEXT =
        (S7_REPLY_1 || "") +
        "\n" +
        (S7_REPLY_2 || "");

    if (S7_TYPE === "tg") {
        const tgMatch = HaTe_COMBINED_TEXT.match(
            /📄\s*Result\s*:\s*[\s\n]*(\d{8,15})/i
        );

        if (tgMatch) {
            return {
                status: "success",
                query_type: S7_TYPE,
                input: S7_INPUT,
                telegram_info: {
                    telegram_id: tgMatch[1].trim(),
                    username: "N/A",
                    phone: "N/A",
                },
                total_records: 0,
                records: [],
                owner: "SABIR7718",
            };
        }

        const fallback = HaTe_COMBINED_TEXT.match(
            /Result\s*:[\s\S]*?(\d{8,15})/i
        );
        if (fallback) {
            return {
                status: "success",
                query_type: S7_TYPE,
                input: S7_INPUT,
                telegram_info: {
                    telegram_id: fallback[1].trim(),
                    username: "N/A",
                    phone: "N/A",
                },
                total_records: 0,
                records: [],
                owner: "SABIR7718",
            };
        }

        return null;
    }

    if (S7_TYPE === "num") {
        const SABIR7718_RECORDS = [];
        
        const resultSection = HaTe_COMBINED_TEXT.match(
            /📄\s*Result\s*:([\s\S]*?)(?:└|👑|⚠️|$)/i
        );

        if (!resultSection) return null;

        let raw = resultSection[1].trim();
        
        raw = raw
            .replace(/,\s*$/, "")
            .replace(/\n\s*,\s*\n/g, ",\n")
            .trim();
            
        if (!raw.startsWith("[")) {
            raw = "[" + raw + "]";
        }

        try {
            raw = raw
                .replace(/,\s*,/g, ",")
                .replace(/,\s*]/g, "]")
                .replace(/\[\s*,/g, "[");

            const parsed = JSON.parse(raw);

            const items = Array.isArray(parsed) ? parsed : [parsed];

            for (const item of items) {
                if (!item || typeof item !== "object") continue;

                let rawId = (item.id || "").toString().trim();
                let maskedAadhaar = "N/A";
                if (rawId && /^\d+$/.test(rawId) && rawId.length === 12) {
                    maskedAadhaar = "XXXX-XXXX-" + rawId.slice(-4);
                } else if (rawId) {
                    maskedAadhaar = rawId;
                }

                SABIR7718_RECORDS.push({
                    name: (item.name || "").trim() || "N/A",
                    father_name: (item.fname || "").trim() || "N/A",
                    address: (item.address || "")
                        .toString()
                        .trim()
                        .replace(/!+/g, ", ")
                        .replace(/^,\s*/, "")
                        .replace(/,\s*,/g, ",")
                        .trim() || "N/A",
                    circle: (item.circle || "").trim() || "N/A",
                    alt_number: (item.alt || "").trim() || "N/A",
                    aadhaar_masked: maskedAadhaar,
                    email: (item.email || "").trim() || "N/A",
                    mobile: (item.mobile || "").trim() || "N/A",
                });
            }
        } catch (e) {
            const blocks = raw.split(/},\s*{/);
            for (let block of blocks) {
                block = block.replace(/^[{\s]*/, "").replace(/[}\s]*$/, "");

                const get = (key) => {
                    const m = block.match(
                        new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`, "i")
                    );
                    return m ? m[1].trim() : "";
                };

                const name = get("name");
                if (!name && !get("id") && !get("address")) continue;

                let rawId = get("id");
                let maskedAadhaar = "N/A";
                if (rawId && /^\d+$/.test(rawId) && rawId.length === 12) {
                    maskedAadhaar = "XXXX-XXXX-" + rawId.slice(-4);
                } else if (rawId) {
                    maskedAadhaar = rawId;
                }

                SABIR7718_RECORDS.push({
                    name: name || "N/A",
                    father_name: get("fname") || "N/A",
                    address: (get("address") || "N/A")
                        .replace(/!+/g, ", ")
                        .replace(/^,\s*/, "")
                        .replace(/,\s*,/g, ",")
                        .trim(),
                    circle: get("circle") || "N/A",
                    alt_number: get("alt") || "N/A",
                    aadhaar_masked: maskedAadhaar,
                    email: get("email") || "N/A",
                    mobile: get("mobile") || "N/A",
                });
            }
        }

        if (SABIR7718_RECORDS.length === 0) return null;

        return {
            status: "success",
            query_type: S7_TYPE,
            input: S7_INPUT,
            telegram_info: null,
            total_records: SABIR7718_RECORDS.length,
            records: SABIR7718_RECORDS,
            owner: "SABIR7718",
        };
    }

    return null;
}



async function S7_PROCESS_QUEUE() {

    if (
        S7_QUEUE_LOCK ||
        SABIR7718_QUEUE.length === 0
    ) {
        return;
    }

    S7_QUEUE_LOCK = true;

    const SYHaTe_CURRENT =
        SABIR7718_QUEUE.shift();

    S7_ACTIVE_REQUEST = SYHaTe_CURRENT;

    log(
        "info",
        "QUEUE",
        `Processing -> ${SYHaTe_CURRENT.command}`
    );

    SYHaTe_CURRENT.timeout = setTimeout(() => {

        if (
            S7_ACTIVE_REQUEST &&
            S7_ACTIVE_REQUEST.id === SYHaTe_CURRENT.id
        ) {

            SYHaTe_CURRENT.res.status(504).json({
                status: "error",
                error: "timeout",
                message: "Bot response timeout",
            });

            S7_ACTIVE_REQUEST = null;

            S7_QUEUE_LOCK = false;

            S7_PROCESS_QUEUE();
        }

    }, 25000);

    try {

        await SABIR7718_CLIENT.sendMessage(
            S7_TARGET_BOT, {
                message: SYHaTe_CURRENT.command,
            }
        );

    } catch (S7_ERROR) {

        log(
            "error",
            "TELEGRAM",
            S7_ERROR.message
        );

        clearTimeout(SYHaTe_CURRENT.timeout);

        SYHaTe_CURRENT.res.status(500).json({
            status: "error",
            error: "telegram_error",
            message: "Failed to contact telegram bot",
        });

        S7_ACTIVE_REQUEST = null;

        S7_QUEUE_LOCK = false;

        S7_PROCESS_QUEUE();
    }
}

(async () => {

    log(
        "info",
        "SYSTEM",
        "Connecting Telegram Client..."
    );

    await SABIR7718_CLIENT.start({

        phoneNumber: async () =>
            new Promise((resolve) =>
                HaTe_READLINE.question(
                    "Enter Number : ",
                    resolve
                )
            ),

        password: async () =>
            new Promise((resolve) =>
                HaTe_READLINE.question(
                    "Enter 2FA Password : ",
                    resolve
                )
            ),

        phoneCode: async () =>
            new Promise((resolve) =>
                HaTe_READLINE.question(
                    "Enter OTP : ",
                    resolve
                )
            ),

        onError: (S7_ERROR) => {
            log(
                "error",
                "LOGIN",
                S7_ERROR.message
            );
        },
    });

    log(
        "info",
        "SYSTEM",
        "Telegram Client Connected"
    );

    SABIR7718_CLIENT.addEventHandler(

        async (S7_EVENT) => {

                const SYHaTe_MESSAGE =
                    S7_EVENT.message;

                if (
                    !SYHaTe_MESSAGE.out &&
                    SYHaTe_MESSAGE.peerId &&
                    S7_ACTIVE_REQUEST
                ) {

                    try {

                        const S7_SENDER =
                            await SABIR7718_CLIENT.getEntity(
                                SYHaTe_MESSAGE.peerId
                            );

                        if (
                            S7_SENDER.username &&
                            S7_SENDER.username.toLowerCase() ===
                            S7_TARGET_BOT.toLowerCase()
                        ) {

                            const HaTe_TEXT =
                                SYHaTe_MESSAGE.message;

                            S7_ACTIVE_REQUEST.replies.push(
                                HaTe_TEXT
                            );

                            if (
                                S7_ACTIVE_REQUEST.replies.length >= 2
                            ) {

                                clearTimeout(
                                    S7_ACTIVE_REQUEST.timeout
                                );

                                const S7_FORMATTED =
                                    SYHaTe_PARSE_RESPONSE(
                                        S7_ACTIVE_REQUEST.replies.join("\n"),
                                        "",
                                        S7_ACTIVE_REQUEST.type,
                                        S7_ACTIVE_REQUEST.input
                                    );

                                if (S7_FORMATTED) {

                                    S7_ACTIVE_REQUEST.res.json(
                                        S7_FORMATTED
                                    );

                                } else {

                                    S7_ACTIVE_REQUEST.res.status(404).json({
                                        status: "error",
                                        error: "not_found",
                                        message: `No result for ${S7_ACTIVE_REQUEST.input}`,
                                    });
                                }

                                S7_ACTIVE_REQUEST = null;

                                S7_QUEUE_LOCK = false;

                                S7_PROCESS_QUEUE();
                            }
                        }

                    } catch (S7_ERROR) {

                        log(
                            "error",
                            "HANDLER",
                            S7_ERROR.message
                        );
                    }
                }

            },

            new NewMessage({})
    );

    S7HaTeSY_APP.get("/search", (req, res) => {

        const {
            type,
            query,
        } = req.query;

        if (!type || !query) {

            return res.status(400).json({
                status: "error",
                message: "Missing query params",
            });
        }

        let S7_COMMAND = "";

        if (type === "num") {

            S7_COMMAND = `/num ${query}`;

        } else if (type === "tg") {

            S7_COMMAND = `/tg ${query}`;

        } else {

            return res.status(400).json({
                status: "error",
                message: "Invalid type use num/tg",
            });
        }

        const SABIR7718_REQUEST_ID =
            Date.now() +
            "_" +
            Math.random()
            .toString(36)
            .slice(2, 7);

        SABIR7718_QUEUE.push({
            id: SABIR7718_REQUEST_ID,
            res,
            type,
            input: query,
            command: S7_COMMAND,
            replies: [],
            timeout: null,
        });

        log(
            "info",
            "API",
            `Queued -> ${query}`
        );

        S7_PROCESS_QUEUE();
    });

    S7HaTeSY_APP.listen(S7_PORT, () => {

        log(
            "info",
            "SERVER",
            `Running On Port ${S7_PORT}`
        );
    });

})();

const S7_START_TIME = Date.now();

S7HaTeSY_APP.get("/", async (req, res) => {

    const S7_UPTIME_SECONDS =
        Math.floor(
            (Date.now() - S7_START_TIME) / 1000
        );

    const S7_HOURS =
        Math.floor(S7_UPTIME_SECONDS / 3600);

    const S7_MINUTES =
        Math.floor(
            (S7_UPTIME_SECONDS % 3600) / 60
        );

    const S7_SECONDS =
        S7_UPTIME_SECONDS % 60;

    res.json({
        status: "online",

        service: "S7 Info Bridge",

        developer: {
            name: "SABIR7718"
        },

        uptime: {
            seconds: S7_UPTIME_SECONDS,
            formatted: `${S7_HOURS}h ${S7_MINUTES}m ${S7_SECONDS}s`,
        },

        usage: {
            number_lookup: "/search?type=num&query=919876543210",

            telegram_lookup: "/search?type=tg&query=username",
        },

        queue: {
            pending: SABIR7718_QUEUE.length,
            processing: S7_ACTIVE_REQUEST ?
                true : false,
        },

        server: {
            port: S7_PORT,
            node: process.version,
        }

    });

});

if (process.env.URL) {

    (async () => {
        try {
            const res = await fetch(process.env.URL);
            log('info', 'PING', `Pinged: ${process.env.URL} | Status: ${res.status}`);
        } catch (err) {
            log('error', 'PING', err.message);
        }
    })();

    setInterval(async () => {
        try {
            const res = await fetch(process.env.URL);
            log('info', 'PING', `Pinged: ${process.env.URL} | Status: ${res.status}`);
        } catch (err) {
            log('error', 'PING', err.message);
        }
    }, 5 * 60 * 1000);
}