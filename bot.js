const http = require("http");
const path = require("path");
const fs = require("fs");

console.log("=== BOT.JS BERHASIL DIBACA ===");
console.log("Node:", process.version);
console.log("PORT:", process.env.PORT);
console.log("TOKEN ADA:", !!process.env.BOT_TOKEN);

const { Telegraf, Markup } = require("telegraf");
const sharp = require("sharp");
