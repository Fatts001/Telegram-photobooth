const http = require("http");
const { Telegraf } = require("telegraf");
const sharp = require("sharp");

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
    console.error("❌ BOT_TOKEN belum diatur!");
    process.exit(1);
}

// Web server untuk Abasthan
http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Telegram Photobooth Bot is running!");
}).listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server berjalan di port ${PORT}`);
});

const bot = new Telegraf(TOKEN);
const sessions = new Map();

bot.start(async (ctx) => {
    sessions.delete(ctx.from.id);

    await ctx.reply(
        "📸 PHOTOBOOTH\n\n" +
        "Kirim 4 foto satu per satu.\n\n" +
        "1️⃣ Foto pertama\n" +
        "2️⃣ Foto kedua\n" +
        "3️⃣ Foto ketiga\n" +
        "4️⃣ Foto keempat\n\n" +
        "Setelah foto ke-4, otomatis dibuat layout 2×2 ✨\n\n" +
        "Ketik /cancel untuk membatalkan."
    );
});

bot.command("cancel", async (ctx) => {
    sessions.delete(ctx.from.id);
    await ctx.reply("❌ Sesi photobooth dibatalkan.");
});

bot.on("photo", async (ctx) => {
    const userId = ctx.from.id;

    if (!sessions.has(userId)) {
        sessions.set(userId, []);
    }

    const session = sessions.get(userId);

    try {
        const photos = ctx.message.photo;
        const photo = photos[photos.length - 1];

        await ctx.reply(
            `⏳ Memproses foto ${session.length + 1}/4...`
        );

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

        session.push(buffer);

        if (session.length < 4) {
            await ctx.reply(
                `✅ Foto ${session.length}/4 diterima.\n` +
                `📸 Kirim foto ke-${session.length + 1}.`
            );

            return;
        }

        await ctx.reply("✨ Semua foto diterima!\nMembuat photobooth...");

        const photoWidth = 800;
        const photoHeight = 800;

        const padding = 30;
        const gap = 20;
        const footerHeight = 150;

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

        const resizedPhotos = [];

        for (const image of session) {
            const resized = await sharp(image)
                .resize(photoWidth, photoHeight, {
                    fit: "cover",
                    position: "centre"
                })
                .jpeg({
                    quality: 92
                })
                .toBuffer();

            resizedPhotos.push(resized);
        }

        const now = new Date();

        const date = now.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "Asia/Jakarta"
        });

        const footer = `
        <svg width="${canvasWidth}" height="${footerHeight}">
            <style>
                .title {
                    fill: black;
                    font-size: 40px;
                    font-family: Arial;
                    font-weight: bold;
                }

                .date {
                    fill: #555;
                    font-size: 24px;
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
                y="100"
                text-anchor="middle"
                class="date">
                ${date}
            </text>
        </svg>
        `;

        const result = await sharp({
            create: {
                width: canvasWidth,
                height: canvasHeight,
                channels: 4,
                background: {
                    r: 255,
                    g: 255,
                    b: 255,
                    alpha: 1
                }
            }
        })
            .composite([
                // FOTO 1 — kiri atas
                {
                    input: resizedPhotos[0],
                    left: padding,
                    top: padding
                },

                // FOTO 2 — kanan atas
                {
                    input: resizedPhotos[1],
                    left: padding + photoWidth + gap,
                    top: padding
                },

                // FOTO 3 — kiri bawah
                {
                    input: resizedPhotos[2],
                    left: padding,
                    top: padding + photoHeight + gap
                },

                // FOTO 4 — kanan bawah
                {
                    input: resizedPhotos[3],
                    left: padding + photoWidth + gap,
                    top: padding + photoHeight + gap
                },

                // Footer
                {
                    input: Buffer.from(footer),
                    left: 0,
                    top: padding + photoHeight * 2 + gap * 2
                }
            ])
            .jpeg({
                quality: 92
            })
            .toBuffer();

        await ctx.replyWithPhoto(
            {
                source: result
            },
            {
                caption: "📸 Photobooth lu sudah jadi! ✨"
            }
        );

        sessions.delete(userId);

    } catch (error) {
        console.error("❌ ERROR:", error);

        sessions.delete(userId);

        await ctx.reply(
            "❌ Gagal membuat photobooth.\n\n" +
            "Ketik /start lalu coba lagi."
        );
    }
});

bot.catch((error) => {
    console.error("Telegram error:", error);
});

bot.launch();

console.log("🤖 Telegram Photobooth Bot aktif!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
