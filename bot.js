const http = require("http");
const path = require("path");
const fs = require("fs");

const { Telegraf, Markup } = require("telegraf");
const sharp = require("sharp");

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 8401116235;

// ===============================
// WEB SERVER DULU
// ===============================

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Telegram Photobooth Bot is running!");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Web server aktif di port ${PORT}`);
});

// ===============================
// CEK TOKEN
// ===============================

if (!TOKEN) {
    console.error("❌ BOT_TOKEN TIDAK DITEMUKAN!");
    console.error("⚠️ Tambahkan BOT_TOKEN di Environment Variables Abasthan.");
    return;
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
// KEYBOARD BACKGROUND
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
// START
// ===============================

bot.start(async (ctx) => {

    sessions.set(ctx.from.id, {
        photos: [],
        background: null
    });

    await ctx.reply(
        "📸 PHOTOBOOTH\n\n" +
        "Selamat datang! ✨\n\n" +
        "Pilih background terlebih dahulu 👇\n\n" +
        "Setelah itu kirim 4 foto satu per satu.",
        backgroundKeyboard()
    );
});

// ===============================
// PILIH BACKGROUND
// ===============================

bot.action(/^bg_(.+)$/, async (ctx) => {

    try {

        const userId = ctx.from.id;
        const selected = ctx.match[1];

        if (!backgrounds[selected]) {
            await ctx.answerCbQuery("❌ Background tidak ditemukan.");
            return;
        }

        const backgroundPath = path.join(
            __dirname,
            backgrounds[selected].file
        );

        if (!fs.existsSync(backgroundPath)) {

            console.error(
                `❌ File tidak ditemukan: ${backgroundPath}`
            );

            await ctx.answerCbQuery(
                "❌ File background belum ada."
            );

            await ctx.reply(
                `❌ File ${backgrounds[selected].file} tidak ditemukan di server.\n\n` +
                "Pastikan file sudah ada di repository GitHub."
            );

            return;
        }

        if (!sessions.has(userId)) {
            sessions.set(userId, {
                photos: [],
                background: null
            });
        }

        const session = sessions.get(userId);

        session.background = selected;
        session.photos = [];

        await ctx.answerCbQuery(
            `${backgrounds[selected].name} dipilih!`
        );

        await ctx.editMessageText(
            "✅ BACKGROUND DIPILIH!\n\n" +
            `🎨 ${backgrounds[selected].name}\n\n` +
            "Sekarang kirim 4 foto 📸\n\n" +
            "1️⃣ Foto pertama\n" +
            "2️⃣ Foto kedua\n" +
            "3️⃣ Foto ketiga\n" +
            "4️⃣ Foto keempat\n\n" +
            "Foto ke-4 akan langsung dibuat menjadi photobooth ✨"
        );

    } catch (error) {

        console.error("❌ ERROR BACKGROUND:", error);

    }
});

// ===============================
// BACKGROUND COMMAND
// ===============================

bot.command("background", async (ctx) => {

    if (!sessions.has(ctx.from.id)) {
        sessions.set(ctx.from.id, {
            photos: [],
            background: null
        });
    }

    await ctx.reply(
        "🎨 Pilih background:",
        backgroundKeyboard()
    );
});

// ===============================
// CANCEL
// ===============================

bot.command("cancel", async (ctx) => {

    sessions.delete(ctx.from.id);

    await ctx.reply(
        "❌ Sesi dibatalkan.\n\n" +
        "Ketik /start untuk mulai lagi."
    );
});

// ===============================
// SARAN
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
        ? `@${ctx.from.username}`
        : "Tidak ada username";

    try {

        await bot.telegram.sendMessage(
            ADMIN_ID,

            "💡 SARAN BARU\n\n" +
            `👤 Nama: ${name}\n` +
            `🔹 Username: ${username}\n` +
            `🆔 ID: ${userId}\n\n` +
            `💬 Saran:\n${text}`
        );

        await ctx.reply(
            "✅ Saran berhasil dikirim!\n\n" +
            "Makasih sudah membantu mengembangkan bot ini ❤️"
        );

    } catch (error) {

        console.error("❌ ERROR SARAN:", error);

        await ctx.reply(
            "❌ Saran gagal dikirim."
        );
    }
});

// ===============================
// FOTO
// ===============================

bot.on("photo", async (ctx) => {

    const userId = ctx.from.id;

    if (!sessions.has(userId)) {

        await ctx.reply(
            "⚠️ Lu belum mulai photobooth.\n\n" +
            "Ketik /start dulu."
        );

        return;
    }

    const session = sessions.get(userId);

    if (!session.background) {

        await ctx.reply(
            "⚠️ Pilih background dulu.\n\n" +
            "Ketik /background."
        );

        return;
    }

    if (session.photos.length >= 4) {
        return;
    }

    try {

        const number = session.photos.length + 1;

        await ctx.reply(
            `⏳ Memproses foto ${number}/4...`
        );

        const photos = ctx.message.photo;

        const photo = photos[photos.length - 1];

        const fileLink = await ctx.telegram.getFileLink(
            photo.file_id
        );

        const response = await fetch(fileLink.href);

        if (!response.ok) {
            throw new Error("Gagal mengambil foto.");
        }

        const buffer = Buffer.from(
            await response.arrayBuffer()
        );

        session.photos.push(buffer);

        if (session.photos.length < 4) {

            await ctx.reply(
                `✅ Foto ${session.photos.length}/4 diterima!\n\n` +
                `📸 Kirim foto ke-${session.photos.length + 1}.`
            );

            return;
        }

        await ctx.reply(
            "✨ 4 foto sudah lengkap!\n\n" +
            "🎨 Membuat photobooth..."
        );

        // ===============================
        // UKURAN
        // ===============================

        const photoWidth = 780;
        const photoHeight = 780;

        const padding = 45;
        const gap = 30;
        const footerHeight = 170;

        const canvasWidth =
            padding +
            photoWidth +
            gap +
            photoWidth +
            padding;

        const canvasHeight =
            padding +
            photoHeight +
            gap +
            photoHeight +
            footerHeight +
            padding;

        // ===============================
        // BACKGROUND
        // ===============================

        const backgroundPath = path.join(
            __dirname,
            backgrounds[session.background].file
        );

        const background = await sharp(backgroundPath)
            .resize(canvasWidth, canvasHeight, {
                fit: "cover",
                position: "centre"
            })
            .jpeg({
                quality: 95
            })
            .toBuffer();

        // ===============================
        // RESIZE FOTO
        // ===============================

        const resizedPhotos = [];

        for (const image of session.photos) {

            const resized = await sharp(image)
                .resize(photoWidth, photoHeight, {
                    fit: "cover",
                    position: "centre"
                })
                .jpeg({
                    quality: 95
                })
                .toBuffer();

            resizedPhotos.push(resized);
        }

        // ===============================
        // FOOTER
        // ===============================

        const selectedName =
            backgrounds[session.background].name;

        const date = new Date().toLocaleDateString(
            "id-ID",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                timeZone: "Asia/Jakarta"
            }
        );

        const footer = `
        <svg width="${canvasWidth}" height="${footerHeight}">
            <style>
                .title {
                    fill: white;
                    font-size: 42px;
                    font-family: Arial;
                    font-weight: bold;
                }

                .sub {
                    fill: white;
                    font-size: 25px;
                    font-family: Arial;
                }
            </style>

            <text
                x="50%"
                y="60"
                text-anchor="middle"
                class="title">
                PHOTOBOOTH
            </text>

            <text
                x="50%"
                y="105"
                text-anchor="middle"
                class="sub">
                ${selectedName}
            </text>

            <text
                x="50%"
                y="145"
                text-anchor="middle"
                class="sub">
                ${date}
            </text>
        </svg>
        `;

        // ===============================
        // GABUNG
        // ===============================

        const result = await sharp(background)
            .composite([

                {
                    input: resizedPhotos[0],
                    left: padding,
                    top: padding
                },

                {
                    input: resizedPhotos[1],
                    left: padding + photoWidth + gap,
                    top: padding
                },

                {
                    input: resizedPhotos[2],
                    left: padding,
                    top: padding + photoHeight + gap
                },

                {
                    input: resizedPhotos[3],
                    left: padding + photoWidth + gap,
                    top: padding + photoHeight + gap
                },

                {
                    input: Buffer.from(footer),
                    left: 0,
                    top:
                        padding +
                        photoHeight * 2 +
                        gap * 2
                }

            ])
            .jpeg({
                quality: 95
            })
            .toBuffer();

        // ===============================
        // KIRIM HASIL
        // ===============================

        await ctx.replyWithPhoto(
            {
                source: result
            },
            {
                caption:
                    "📸 Photobooth lu sudah jadi! ✨\n\n" +
                    `🎨 ${selectedName}`
            }
        );

        sessions.delete(userId);

    } catch (error) {

        console.error(
            "❌ ERROR MEMBUAT PHOTOBOOTH:",
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
// ERROR HANDLER
// ===============================

bot.catch((error) => {
    console.error("❌ TELEGRAM ERROR:", error);
});

// ===============================
// START BOT
// ===============================

bot.launch()
    .then(() => {
        console.log("🤖 Telegram Photobooth Bot aktif!");
    })
    .catch((error) => {
        console.error("❌ BOT GAGAL START:", error);
    });

// ===============================
// STOP
// ===============================

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
