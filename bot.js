const http = require("http");
const path = require("path");
const fs = require("fs");

const { Telegraf, Markup } = require("telegraf");
const sharp = require("sharp");

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;

// ID Telegram admin
const ADMIN_ID = 8401116235;

// ===============================
// CEK TOKEN
// ===============================

if (!TOKEN) {
    console.error("❌ BOT_TOKEN belum diatur di Environment Variables!");
    process.exit(1);
}

// ===============================
// WEB SERVER UNTUK ABASTHAN
// ===============================

http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Telegram Photobooth Bot is running!");
}).listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server berjalan di port ${PORT}`);
});

// ===============================
// BOT
// ===============================

const bot = new Telegraf(TOKEN);

// Simpan sesi pengguna
const sessions = new Map();

// ===============================
// DAFTAR BACKGROUND
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
// /START
// ===============================

bot.start(async (ctx) => {

    sessions.set(ctx.from.id, {
        photos: [],
        background: null
    });

    await ctx.reply(
        "📸 *PHOTOBOOTH*\n\n" +
        "Selamat datang! ✨\n\n" +
        "Sebelum mulai, pilih background yang lu mau 👇\n\n" +
        "Setelah memilih background, kirim 4 foto satu per satu.",
        {
            parse_mode: "Markdown",
            ...backgroundKeyboard()
        }
    );
});

// ===============================
// PILIH BACKGROUND
// ===============================

bot.action(/^bg_(.+)$/, async (ctx) => {

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

    // Cek file ada atau tidak
    if (!fs.existsSync(backgroundPath)) {

        await ctx.answerCbQuery(
            "❌ File background belum ada di server."
        );

        await ctx.reply(
            `❌ Background ${backgrounds[selected].name} belum ditemukan.\n\n` +
            `Pastikan file:\n` +
            \`${backgrounds[selected].file}\`\n\n` +
            `sudah ada di repository GitHub.`,
            {
                parse_mode: "Markdown"
            }
        );

        return;
    }

    // Kalau belum ada sesi, buat
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
        "✅ *Background berhasil dipilih!*\n\n" +
        `🎨 Background: ${backgrounds[selected].name}\n\n` +
        "Sekarang kirim *4 foto* satu per satu 📸\n\n" +
        "1️⃣ Foto pertama\n" +
        "2️⃣ Foto kedua\n" +
        "3️⃣ Foto ketiga\n" +
        "4️⃣ Foto keempat\n\n" +
        "Setelah foto ke-4, photobooth otomatis dibuat ✨",
        {
            parse_mode: "Markdown"
        }
    );
});

// ===============================
// /BACKGROUND
// ===============================

bot.command("background", async (ctx) => {

    const userId = ctx.from.id;

    if (!sessions.has(userId)) {
        sessions.set(userId, {
            photos: [],
            background: null
        });
    }

    await ctx.reply(
        "🎨 *Pilih background baru:*",
        {
            parse_mode: "Markdown",
            ...backgroundKeyboard()
        }
    );
});

// ===============================
// /CANCEL
// ===============================

bot.command("cancel", async (ctx) => {

    sessions.delete(ctx.from.id);

    await ctx.reply(
        "❌ Sesi photobooth dibatalkan.\n\n" +
        "Ketik /start kalau mau mulai lagi 📸"
    );
});

// ===============================
// /SARAN
// ===============================

bot.command("saran", async (ctx) => {

    const userId = ctx.from.id;
    const username = ctx.from.username
        ? `@${ctx.from.username}`
        : "Tidak ada username";

    const name = ctx.from.first_name || "Tidak diketahui";

    const text = ctx.message.text
        .replace("/saran", "")
        .trim();

    // Kalau /saran langsung tanpa isi
    if (!text) {

        await ctx.reply(
            "💡 *Fitur Saran*\n\n" +
            "Ketik saran lu setelah command `/saran`.\n\n" +
            "Contoh:\n" +
            "`/saran Tambahin background warna pink dong`",
            {
                parse_mode: "Markdown"
            }
        );

        return;
    }

    // Kirim saran ke admin
    try {

        await bot.telegram.sendMessage(
            ADMIN_ID,

            "💡 *SARAN BARU*\n\n" +
            `👤 Nama: ${name}\n` +
            `🔹 Username: ${username}\n` +
            `🆔 ID: ${userId}\n\n` +
            `💬 Saran:\n${text}`,

            {
                parse_mode: "Markdown"
            }
        );

        await ctx.reply(
            "✅ Saran lu sudah dikirim ke admin!\n\n" +
            "Makasih udah bantu bikin bot ini makin bagus ❤️"
        );

    } catch (error) {

        console.error("❌ Gagal mengirim saran:", error);

        await ctx.reply(
            "❌ Saran gagal dikirim. Coba lagi nanti."
        );
    }
});

// ===============================
// FOTO
// ===============================

bot.on("photo", async (ctx) => {

    const userId = ctx.from.id;

    // Kalau belum /start
    if (!sessions.has(userId)) {

        await ctx.reply(
            "⚠️ Pilih background dulu ya.\n\n" +
            "Ketik /start untuk mulai 📸"
        );

        return;
    }

    const session = sessions.get(userId);

    // Belum pilih background
    if (!session.background) {

        await ctx.reply(
            "⚠️ Lu belum pilih background.\n\n" +
            "Ketik /background lalu pilih background dulu 🎨"
        );

        return;
    }

    // Maksimal 4 foto
    if (session.photos.length >= 4) {
        return;
    }

    try {

        const currentNumber = session.photos.length + 1;

        await ctx.reply(
            `⏳ Memproses foto ${currentNumber}/4...`
        );

        const photos = ctx.message.photo;

        // Ambil kualitas foto terbesar
        const photo = photos[photos.length - 1];

        const fileLink = await ctx.telegram.getFileLink(
            photo.file_id
        );

        const response = await fetch(fileLink.href);

        if (!response.ok) {
            throw new Error("Gagal mengambil foto dari Telegram.");
        }

        const buffer = Buffer.from(
            await response.arrayBuffer()
        );

        session.photos.push(buffer);

        // Belum 4 foto
        if (session.photos.length < 4) {

            await ctx.reply(
                `✅ Foto ${session.photos.length}/4 diterima!\n\n` +
                `📸 Kirim foto ke-${session.photos.length + 1}.`
            );

            return;
        }

        // ===============================
        // SEMUA FOTO SUDAH ADA
        // ===============================

        await ctx.reply(
            "✨ Semua foto sudah diterima!\n\n" +
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

        if (!fs.existsSync(backgroundPath)) {
            throw new Error(
                `Background tidak ditemukan: ${backgrounds[session.background].file}`
            );
        }

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

        const now = new Date();

        const date = now.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "Asia/Jakarta"
        });

        const footerTop =
            padding +
            photoHeight * 2 +
            gap * 2;

        const footer = `
        <svg width="${canvasWidth}" height="${footerHeight}">
            <style>
                .title {
                    fill: white;
                    font-size: 42px;
                    font-family: Arial;
                    font-weight: bold;
                }

                .subtitle {
                    fill: white;
                    font-size: 25px;
                    font-family: Arial;
                }

                .date {
                    fill: white;
                    font-size: 22px;
                    font-family: Arial;
                }
            </style>

            <text
                x="50%"
                y="55"
                text-anchor="middle"
                class="title">
                PHOTOBOOTH
            </text>

            <text
                x="50%"
                y="95"
                text-anchor="middle"
                class="subtitle">
                ${selectedName}
            </text>

            <text
                x="50%"
                y="135"
                text-anchor="middle"
                class="date">
                ${date}
            </text>
        </svg>
        `;

        // ===============================
        // GABUNGKAN
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
                    top: footerTop
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
                    "📸 *Photobooth lu sudah jadi!*\n\n" +
                    `🎨 ${selectedName}\n` +
                    "✨ Makasih sudah menggunakan bot ini!",
                parse_mode: "Markdown"
            }
        );

        // Hapus sesi
        sessions.delete(userId);

    } catch (error) {

        console.error("❌ ERROR PHOTObOOTH:", error);

        sessions.delete(userId);

        await ctx.reply(
            "❌ Gagal membuat photobooth.\n\n" +
            "Coba ketik /start lalu ulangi lagi."
        );
    }
});

// ===============================
// ERROR HANDLER
// ===============================

bot.catch((error) => {
    console.error("❌ Telegram error:", error);
});

// ===============================
// START BOT
// ===============================

bot.launch();

console.log("🤖 Telegram Photobooth Bot aktif!");

// ===============================
// STOP
// ===============================

process.once("SIGINT", () => {
    bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
    bot.stop("SIGTERM");
});
