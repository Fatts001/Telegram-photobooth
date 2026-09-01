const http = require("http");
const path = require("path");
const fs = require("fs");

const { Telegraf, Markup } = require("telegraf");
const sharp = require("sharp");

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 8401116235;

// ===============================
// WEB SERVER ABASTHAN
// ===============================

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Telegram Photobooth Bot is running!");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Web server aktif di port " + PORT);
});

// ===============================
// TOKEN
// ===============================

if (!TOKEN) {
    console.error("BOT_TOKEN belum ditemukan!");
    process.exit(1);
}

// ===============================
// BOT
// ===============================

const bot = new Telegraf(TOKEN);
const sessions = new Map();

// ===============================
// BACKGROUND
// ===============================

const backgrounds = {
    bunga: {
        name: "🌸 Bunga",
        file: "bunga.jpg"
    },

    florel: {
        name: "🌷 Florel",
        file: "florel.jpg"
    },

    mawar: {
        name: "🌹 Mawar",
        file: "mawar.jpg"
    },

    stars: {
        name: "⭐ Stars",
        file: "stars.jpg"
    },

    sakuraa: {
        name: "🌸 Sakura",
        file: "sakuraa.jpg"
    },

    kupukupu: {
        name: "🦋 Kupu-kupu",
        file: "kupukupu.jpg"
    }
};

// ===============================
// FILTER
// ===============================

const filters = {
    normal: "🌈 Normal",
    bw: "🖤 Hitam Putih",
    vintage: "📼 Vintage",
    bright: "☀️ Bright",
    dark: "🌙 Dark",
    soft: "🌸 Soft",
    film: "🎞️ Film",
    warm: "🔥 Warm",
    cool: "❄️ Cool"
};

// ===============================
// DEKORASI
// ===============================

const decorations = {
    none: "❌ Tanpa Dekorasi",
    sparkle: "✨ Sparkle",
    hearts: "❤️ Hearts",
    flowers: "🌸 Flowers",
    butterflies: "🦋 Butterflies",
    stars: "⭐ Stars",
    cute: "🎀 Cute"
};

// ===============================
// AUDIO
// ===============================

async function sendAudio(ctx, fileName) {
    const filePath = path.join(__dirname, fileName);

    if (!fs.existsSync(filePath)) {
        console.log("Audio tidak ditemukan: " + fileName);
        return;
    }

    try {
        await ctx.replyWithAudio({
            source: filePath
        });
    } catch (error) {
        console.error("Gagal mengirim audio:", error.message);
    }
}

// ===============================
// MENU JUMLAH FOTO
// ===============================

function countKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("2️⃣ 2 Foto", "count_2"),
            Markup.button.callback("3️⃣ 3 Foto", "count_3")
        ],
        [
            Markup.button.callback("4️⃣ 4 Foto", "count_4"),
            Markup.button.callback("5️⃣ 5 Foto", "count_5")
        ],
        [
            Markup.button.callback("6️⃣ 6 Foto", "count_6")
        ]
    ]);
}

// ===============================
// MENU BACKGROUND
// ===============================

function backgroundKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("🌸 Bunga", "bg_bunga"),
            Markup.button.callback("🌷 Florel", "bg_florel")
        ],
        [
            Markup.button.callback("🌹 Mawar", "bg_mawar"),
            Markup.button.callback("⭐ Stars", "bg_stars")
        ],
        [
            Markup.button.callback("🌸 Sakura", "bg_sakuraa"),
            Markup.button.callback("🦋 Kupu-kupu", "bg_kupukupu")
        ]
    ]);
}

// ===============================
// MENU FILTER
// ===============================

function filterKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("🌈 Normal", "filter_normal"),
            Markup.button.callback("🖤 B&W", "filter_bw")
        ],
        [
            Markup.button.callback("📼 Vintage", "filter_vintage"),
            Markup.button.callback("☀️ Bright", "filter_bright")
        ],
        [
            Markup.button.callback("🌙 Dark", "filter_dark"),
            Markup.button.callback("🌸 Soft", "filter_soft")
        ],
        [
            Markup.button.callback("🎞️ Film", "filter_film"),
            Markup.button.callback("🔥 Warm", "filter_warm")
        ],
        [
            Markup.button.callback("❄️ Cool", "filter_cool")
        ]
    ]);
}

// ===============================
// MENU DEKORASI
// ===============================

function decorationKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("❌ Tanpa Dekorasi", "decor_none")
        ],
        [
            Markup.button.callback("✨ Sparkle", "decor_sparkle"),
            Markup.button.callback("❤️ Hearts", "decor_hearts")
        ],
        [
            Markup.button.callback("🌸 Flowers", "decor_flowers"),
            Markup.button.callback("🦋 Butterflies", "decor_butterflies")
        ],
        [
            Markup.button.callback("⭐ Stars", "decor_stars"),
            Markup.button.callback("🎀 Cute", "decor_cute")
        ]
    ]);
}

// ===============================
// START
// ===============================

bot.start(async (ctx) => {

    sessions.set(ctx.from.id, {
        count: null,
        background: null,
        filter: "normal",
        decoration: "none",
        title: "",
        waitingTitle: false,
        photos: []
    });

    await ctx.reply(
        "📸 PHOTOBOOTH\n\n" +
        "Selamat datang kak! ✨\n\n" +
        "Berapa foto yang mau dibuat?",
        countKeyboard()
    );

    await sendAudio(ctx, "start.mp3");
});

// ===============================
// JUMLAH FOTO
// ===============================

bot.action(/^count_(2|3|4|5|6)$/, async (ctx) => {

    const userId = ctx.from.id;
    const count = Number(ctx.match[1]);

    if (!sessions.has(userId)) {
        await ctx.answerCbQuery("Ketik /start dulu.");
        return;
    }

    const session = sessions.get(userId);

    session.count = count;
    session.photos = [];

    await ctx.answerCbQuery("Jumlah foto dipilih!");

    await ctx.editMessageText(
        "✅ Jumlah foto: " + count + "\n\n" +
        "Sekarang pilih background 🎨",
        backgroundKeyboard()
    );
});

// ===============================
// BACKGROUND
// ===============================

bot.action(/^bg_(.+)$/, async (ctx) => {

    const userId = ctx.from.id;
    const selected = ctx.match[1];

    if (!backgrounds[selected]) {
        await ctx.answerCbQuery("Background tidak ditemukan.");
        return;
    }

    if (!sessions.has(userId)) {
        await ctx.answerCbQuery("Ketik /start dulu.");
        return;
    }

    const filePath = path.join(
        __dirname,
        backgrounds[selected].file
    );

    if (!fs.existsSync(filePath)) {

        await ctx.answerCbQuery("File tidak ditemukan.");

        await ctx.reply(
            "❌ File " +
            backgrounds[selected].file +
            " belum ada di repository."
        );

        return;
    }

    const session = sessions.get(userId);

    session.background = selected;

    await ctx.answerCbQuery(
        backgrounds[selected].name + " dipilih!"
    );

    await ctx.editMessageText(
        "🎨 Background: " +
        backgrounds[selected].name +
        "\n\n" +
        "Pilih filter foto 🎞️",
        filterKeyboard()
    );

    await sendAudio(ctx, "background.mp3");
});

// ===============================
// FILTER
// ===============================

bot.action(/^filter_(.+)$/, async (ctx) => {

    const userId = ctx.from.id;
    const selected = ctx.match[1];

    if (!filters[selected]) {
        await ctx.answerCbQuery("Filter tidak ditemukan.");
        return;
    }

    if (!sessions.has(userId)) {
        await ctx.answerCbQuery("Ketik /start dulu.");
        return;
    }

    const session = sessions.get(userId);

    session.filter = selected;

    await ctx.answerCbQuery(
        filters[selected] + " dipilih!"
    );

    await ctx.editMessageText(
        "🎞️ Filter: " +
        filters[selected] +
        "\n\n" +
        "Sekarang pilih dekorasi ✨",
        decorationKeyboard()
    );
});

// ===============================
// DEKORASI
// ===============================

bot.action(/^decor_(.+)$/, async (ctx) => {

    const userId = ctx.from.id;
    const selected = ctx.match[1];

    if (!decorations[selected]) {
        await ctx.answerCbQuery("Dekorasi tidak ditemukan.");
        return;
    }

    if (!sessions.has(userId)) {
        await ctx.answerCbQuery("Ketik /start dulu.");
        return;
    }

    const session = sessions.get(userId);

    session.decoration = selected;
    session.waitingTitle = true;

    await ctx.answerCbQuery(
        decorations[selected] + " dipilih!"
    );

    await ctx.editMessageText(
        "✨ Dekorasi: " +
        decorations[selected] +
        "\n\n" +
        "✍️ Sekarang kirim judul photobooth.\n\n" +
        "Contoh:\n" +
        "HAPPY BIRTHDAY 🎂\n" +
        "RARA & FRIENDS 💕\n" +
        "MY PHOTO DAY ✨\n\n" +
        "Kalau tidak mau judul, ketik:\n" +
        "TANPA JUDUL"
    );
});

// ===============================
// TEKS JUDUL
// ===============================

bot.on("text", async (ctx) => {

    const userId = ctx.from.id;

    if (!sessions.has(userId)) {
        return;
    }

    const session = sessions.get(userId);

    if (!session.waitingTitle) {
        return;
    }

    const text = ctx.message.text.trim();

    if (text.toLowerCase() === "tanpa judul") {
        session.title = "";
    } else {
        session.title = text.substring(0, 40);
    }

    session.waitingTitle = false;

    await ctx.reply(
        "✅ Judul berhasil disimpan!\n\n" +
        "✍️ " +
        (session.title || "Tanpa Judul") +
        "\n\n" +
        "📸 Sekarang kirim " +
        session.count +
        " foto satu per satu."
    );
});

// ===============================
// /BACKGROUND
// ===============================

bot.command("background", async (ctx) => {

    if (!sessions.has(ctx.from.id)) {

        sessions.set(ctx.from.id, {
            count: 4,
            background: null,
            filter: "normal",
            decoration: "none",
            title: "",
            waitingTitle: false,
            photos: []
        });
    }

    await ctx.reply(
        "🎨 Pilih background:",
        backgroundKeyboard()
    );
});

// ===============================
// /CANCEL
// ===============================

bot.command("cancel", async (ctx) => {

    sessions.delete(ctx.from.id);

    await ctx.reply(
        "❌ Photobooth dibatalkan.\n\n" +
        "Ketik /start untuk mulai lagi."
    );
});

// ===============================
// /SARAN
// ===============================

bot.command("saran", async (ctx) => {

    const text = ctx.message.text
        .replace(/^\/saran(@\w+)?/i, "")
        .trim();

    if (!text) {

        await ctx.reply(
            "💡 Cara mengirim saran:\n\n" +
            "/saran Tambahin background baru dong"
        );

        return;
    }

    const userId = ctx.from.id;
    const name = ctx.from.first_name || "Tidak diketahui";

    const username = ctx.from.username
        ? "@" + ctx.from.username
        : "Tidak ada username";

    try {

        await bot.telegram.sendMessage(
            ADMIN_ID,

            "💡 SARAN BARU\n\n" +
            "👤 Nama: " + name + "\n" +
            "🔹 Username: " + username + "\n" +
            "🆔 ID: " + userId + "\n\n" +
            "💬 Saran:\n" +
            text
        );

        await ctx.reply(
            "✅ Saran berhasil dikirim ke admin!\n\n" +
            "Makasih sudah kasih masukan ❤️"
        );

    } catch (error) {

        console.error(
            "ERROR SARAN:",
            error.message
        );

        await ctx.reply(
            "❌ Saran gagal dikirim."
        );
    }
});

// ===============================
// FILTER FOTO
// ===============================

async function applyFilter(buffer, filter) {

    let image = sharp(buffer);

    if (filter === "bw") {

        image = image
            .grayscale()
            .modulate({
                brightness: 1.05,
                saturation: 0
            });

    } else if (filter === "vintage") {

        image = image
            .modulate({
                brightness: 1.05,
                saturation: 0.75
            });

    } else if (filter === "bright") {

        image = image
            .modulate({
                brightness: 1.25,
                saturation: 1.1
            });

    } else if (filter === "dark") {

        image = image
            .modulate({
                brightness: 0.72,
                saturation: 0.95
            });

    } else if (filter === "soft") {

        image = image
            .modulate({
                brightness: 1.08,
                saturation: 0.85
            });

    } else if (filter === "film") {

        image = image
            .modulate({
                brightness: 0.95,
                saturation: 1.2
            });

    } else if (filter === "warm") {

        image = image
            .modulate({
                brightness: 1.05,
                saturation: 1.1
            })
            .tint({
                r: 255,
                g: 225,
                b: 190
            });

    } else if (filter === "cool") {

        image = image
            .modulate({
                brightness: 1.02,
                saturation: 0.95
            })
            .tint({
                r: 190,
                g: 220,
                b: 255
            });
    }

    return image
        .resize(780, 780, {
            fit: "cover",
            position: "centre"
        })
        .jpeg({
            quality: 95
        })
        .toBuffer();
}

// ===============================
// DEKORASI
// ===============================

function decorationSVG(type, width, height) {

    let items = "";

    if (type === "sparkle") {
        items = `
        <text x="30" y="75" font-size="55">✨</text>
        <text x="${width - 85}" y="75" font-size="55">✨</text>
        <text x="30" y="${height - 30}" font-size="55">✨</text>
        <text x="${width - 85}" y="${height - 30}" font-size="55">✨</text>
        `;
    }

    if (type === "hearts") {
        items = `
        <text x="30" y="75" font-size="55">❤️</text>
        <text x="${width - 90}" y="75" font-size="55">❤️</text>
        <text x="30" y="${height - 30}" font-size="55">❤️</text>
        <text x="${width - 90}" y="${height - 30}" font-size="55">❤️</text>
        `;
    }

    if (type === "flowers") {
        items = `
        <text x="25" y="75" font-size="55">🌸</text>
        <text x="${width - 90}" y="75" font-size="55">🌷</text>
        <text x="25" y="${height - 30}" font-size="55">🌸</text>
        <text x="${width - 90}" y="${height - 30}" font-size="55">🌷</text>
        `;
    }

    if (type === "butterflies") {
        items = `
        <text x="25" y="75" font-size="55">🦋</text>
        <text x="${width - 90}" y="75" font-size="55">🦋</text>
        <text x="25" y="${height - 30}" font-size="55">🦋</text>
        <text x="${width - 90}" y="${height - 30}" font-size="55">🦋</text>
        `;
    }

    if (type === "stars") {
        items = `
        <text x="25" y="75" font-size="55">⭐</text>
        <text x="${width - 90}" y="75" font-size="55">⭐</text>
        <text x="25" y="${height - 30}" font-size="55">⭐</text>
        <text x="${width - 90}" y="${height - 30}" font-size="55">⭐</text>
        `;
    }

    if (type === "cute") {
        items = `
        <text x="25" y="75" font-size="55">🎀</text>
        <text x="${width - 90}" y="75" font-size="55">💗</text>
        <text x="25" y="${height - 30}" font-size="55">🎀</text>
        <text x="${width - 90}" y="${height - 30}" font-size="55">💗</text>
        `;
    }

    return `
    <svg width="${width}" height="${height}">
        ${items}
    </svg>
    `;
}

// ===============================
// FOTO
// ===============================

bot.on("photo", async (ctx) => {

    const userId = ctx.from.id;

    if (!sessions.has(userId)) {

        await ctx.reply(
            "⚠️ Ketik /start dulu untuk memulai."
        );

        return;
    }

    const session = sessions.get(userId);

    if (!session.count) {

        await ctx.reply(
            "⚠️ Pilih jumlah foto terlebih dahulu."
        );

        return;
    }

    if (!session.background) {

        await ctx.reply(
            "⚠️ Pilih background terlebih dahulu."
        );

        return;
    }

    if (session.waitingTitle) {

        await ctx.reply(
            "✍️ Masukkan judul terlebih dahulu."
        );

        return;
    }

    if (session.photos.length >= session.count) {
        return;
    }

    try {

        const number = session.photos.length + 1;

        await ctx.reply(
            "⏳ Memproses foto " +
            number +
            "/" +
            session.count +
            "..."
        );

        const telegramPhotos = ctx.message.photo;
        const photo = telegramPhotos[
            telegramPhotos.length - 1
        ];

        const fileLink = await ctx.telegram.getFileLink(
            photo.file_id
        );

        const response = await fetch(
            fileLink.href
        );

        if (!response.ok) {
            throw new Error("Gagal mengambil foto.");
        }

        const buffer = Buffer.from(
            await response.arrayBuffer()
        );

        session.photos.push(buffer);

        if (session.photos.length < session.count) {

            await ctx.reply(
                "✅ Foto " +
                session.photos.length +
                "/" +
                session.count +
                " diterima!\n\n" +
                "📸 Kirim foto ke-" +
                (session.photos.length + 1) +
                "."
            );

            return;
        }

        await ctx.reply(
            "✨ Semua foto sudah lengkap!\n\n" +
            "🖼️ Membuat photobooth..."
        );

        // ===========================
        // UKURAN
        // ===========================

        const photoWidth = 780;
        const photoHeight = 780;

        const padding = 50;
        const gap = 30;

        const columns = 2;
        const rows = Math.ceil(
            session.count / columns
        );

        const footerHeight = 220;

        const canvasWidth =
            padding * 2 +
            photoWidth * columns +
            gap * (columns - 1);

        const canvasHeight =
            padding * 2 +
            photoHeight * rows +
            gap * (rows - 1) +
            footerHeight;

        // ===========================
        // BACKGROUND
        // ===========================

        const bgPath = path.join(
            __dirname,
            backgrounds[session.background].file
        );

        const background = await sharp(bgPath)
            .resize(
                canvasWidth,
                canvasHeight,
                {
                    fit: "cover",
                    position: "centre"
                }
            )
            .jpeg({
                quality: 95
            })
            .toBuffer();

        // ===========================
        // FOTO
        // ===========================

        const processedPhotos = [];

        for (const image of session.photos) {

            const processed = await applyFilter(
                image,
                session.filter
            );

            processedPhotos.push(processed);
        }

        // ===========================
        // COMPOSITE
        // ===========================

        const composite = [];

        for (
            let i = 0;
            i < processedPhotos.length;
            i++
        ) {

            const row = Math.floor(
                i / columns
            );

            const column = i % columns;

            const left =
                padding +
                column *
                (photoWidth + gap);

            const top =
                padding +
                row *
                (photoHeight + gap);

            composite.push({
                input: processedPhotos[i],
                left: left,
                top: top
            });
        }

        // ===========================
        // TANGGAL + JAM
        // ===========================

        const now = new Date();

        const date = now.toLocaleDateString(
            "id-ID",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                timeZone: "Asia/Jakarta"
            }
        );

        const time = now.toLocaleTimeString(
            "id-ID",
            {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Jakarta"
            }
        );

        // ===========================
        // FOOTER
        // ===========================

        const footerTop =
            padding * 2 +
            photoHeight * rows +
            gap * (rows - 1);

        const safeTitle =
            escapeXml(session.title || "");

        const footer = `
        <svg
            width="${canvasWidth}"
            height="${footerHeight}">

            <style>

                .title {
                    fill: white;
                    font-size: 46px;
                    font-family: Arial;
                    font-weight: bold;
                }

                .info {
                    fill: white;
                    font-size: 25px;
                    font-family: Arial;
                }

            </style>

            ${
                safeTitle
                    ? `
                    <text
                        x="50%"
                        y="65"
                        text-anchor="middle"
                        class="title">
                        ${safeTitle}
                    </text>
                    `
                    : ""
            }

            <text
                x="50%"
                y="${safeTitle ? 120 : 75}"
                text-anchor="middle"
                class="info">
                ${date} • ${time}
            </text>

            <text
                x="50%"
                y="${safeTitle ? 165 : 120}"
                text-anchor="middle"
                class="info">
                ${backgrounds[session.background].name}
            </text>

        </svg>
        `;

        composite.push({
            input: Buffer.from(footer),
            left: 0,
            top: footerTop
        });

        // ===========================
        // DEKORASI
        // ===========================

        if (
            session.decoration !== "none"
        ) {

            const decoration =
                decorationSVG(
                    session.decoration,
                    canvasWidth,
                    canvasHeight
                );

            composite.push({
                input: Buffer.from(
                    decoration
                ),
                left: 0,
                top: 0
            });
        }

        // ===========================
        // HASIL AKHIR
        // ===========================

        const result = await sharp(
            background
        )
            .composite(composite)
            .jpeg({
                quality: 95
            })
            .toBuffer();

        // ===========================
        // KIRIM HASIL
        // ===========================

        await ctx.replyWithPhoto(
            {
                source: result
            },
            {
                caption:
                    "📸 Photobooth lu sudah jadi! ✨\n\n" +
                    "🎨 " +
                    backgrounds[session.background].name +
                    "\n" +
                    "🎞️ " +
                    filters[session.filter] +
                    "\n" +
                    "✨ " +
                    decorations[session.decoration]
            }
        );

        // ===========================
        // SUARA SELESAI
        // ===========================

        await sendAudio(
            ctx,
            "selesai.mp3"
        );

        sessions.delete(userId);

    } catch (error) {

        console.error(
            "❌ ERROR PHOTOBOOTH:",
            error
        );

        sessions.delete(userId);

        await ctx.reply(
            "❌ Gagal membuat photobooth.\n\n" +
            "Ketik /start lalu coba lagi."
        );
    }
});

// ===============================
// ESCAPE XML
// ===============================

function escapeXml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// ===============================
// ERROR HANDLER
// ===============================

bot.catch((error) => {

    console.error(
        "❌ TELEGRAM ERROR:",
        error
    );

});

// ===============================
// START BOT
// ===============================

bot.launch()
    .then(() => {

        console.log(
            "🤖 Telegram Photobooth Bot aktif!"
        );

    })
    .catch((error) => {

        console.error(
            "❌ BOT GAGAL START:",
            error
        );

    });

// ===============================
// SHUTDOWN
// ===============================

process.once(
    "SIGINT",
    () => bot.stop("SIGINT")
);

process.once(
    "SIGTERM",
    () => bot.stop("SIGTERM")
);
