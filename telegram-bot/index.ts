import TelegramBot from "node-telegram-bot-api";

import config from "./config";
import handler from "./handlers";
import { about, start } from "./commands";
import { PrismaClient } from "@prisma/client";
import { LRUCache } from "lru-cache";

const { BOT_TOKEN, BOT_NAME } = process.env;
const bot = new TelegramBot(BOT_TOKEN as string, config.bot);

const prisma = new PrismaClient();
const lruCache = new LRUCache({
  max: config.cache.max,
  ttl: config.cache.ttl,
});

async function main() {
  bot.onText(/\/start/, start(bot));
  bot.onText(/about$/i, about(bot));

  // Handlers
  bot.on("callback_query", handler.callbackQuery(bot));
  bot.on("polling_error", handler.botError);
  bot.on("error", handler.botError);

  console.info(`${BOT_NAME} started successfully`);

  // Graceful exit on process termination
  process.on("SIGINT", async () => {
    console.info("Shutting down...");
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("An error occurred during bot initialization:", error);
  process.exit(1);
});

export { bot, prisma, lruCache };
