const { Telegraf } = require("telegraf");
const sharp = require("sharp");

const bot = new Telegraf(process.env.BOT_TOKEN);

const sessions = new Map();

bot.start(async (ctx) => {
    sessions.delete(ctx.from.id);

    await ctx.reply(
        "📸 PHOTOBOOTH\n\n" +
        "Kirim 3 foto ke sini.\n" +
        "Setelah foto ketiga, bot akan otomatis membuat strip photobooth.\n\n" +
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
        const biggestPhoto = photos[photos.length - 1];

        await ctx.reply(
            `⏳ Foto ${session.length + 1}/3 sedang diproses...`
        );

        const fileLink = await ctx.telegram.getFileLink(
            biggestPhoto.file_id
        );

        const response = await fetch(fileLink.href);

        if (!response.ok) {
            throw new Error("Gagal mengambil foto dari Telegram");
        }

        const buffer = Buffer.from(
            await response.arrayBuffer()
        );

        session.push(buffer);

        if (session.length < 3) {
            await ctx.reply(
                `✅ Foto ${session.length}/3 diterima.\n\n` +
                `📸 Kirim foto ke-${session.length + 1}.`
            );

            return;
        }

        await ctx.reply("✨ Semua foto sudah diterima!\nMembuat photobooth...");

        const width = 900;
        const height = 900;
        const padding = 30;
        const gap = 20;
        const footerHeight = 140;

        const resizedPhotos = [];

        for (const photo of session) {
            const resized = await sharp(photo)
                .resize(width, height, {
                    fit: "cover",
                    position: "centre"
                })
                .jpeg({
                    quality: 90
                })
                .toBuffer();

            resizedPhotos.push(resized);
        }

        const finalWidth = width + padding * 2;

        const finalHeight =
            padding +
            height +
            gap +
            height +
            gap +
            height +
            footerHeight +
            padding;

        const footerSvg = `
        <svg width="${finalWidth}" height="${footerHeight}">
            <style>
                .title {
                    fill: black;
                    font-size: 42px;
                    font-family: Arial;
                    font-weight: bold;
                }

                .sub {
                    fill: #555;
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
                class="sub">
                Telegram Photobooth
            </text>
        </svg>
        `;

        const result = await sharp({
            create: {
                width: finalWidth,
                height: finalHeight,
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
                {
                    input: resizedPhotos[0],
                    left: padding,
                    top: padding
                },
                {
                    input: resizedPhotos[1],
                    left: padding,
                    top: padding + height + gap
                },
                {
                    input: resizedPhotos[2],
                    left: padding,
                    top: padding + (height + gap) * 2
                },
                {
                    input: Buffer.from(footerSvg),
                    left: 0,
                    top: padding + (height + gap) * 3
                }
            ])
            .jpeg({
                quality: 90
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
        console.error(error);

        sessions.delete(userId);

        await ctx.reply(
            "❌ Gagal membuat photobooth.\n\n" +
            "Coba ketik /start lalu kirim ulang 3 foto."
        );
    }
});

bot.catch((error) => {
    console.error("Telegram Bot Error:", error);
});

bot.launch();

console.log("🤖 Photobooth bot sedang berjalan...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
