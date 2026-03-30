const { Client, GatewayIntentBits, Partials } = require("discord.js");

const APPROVAL_CHANNEL_ID = "1488142332477050880";
const APPROVAL_EMOJI = "👍";

const JAPANESE_WEBHOOK = process.env.JAPANESE_WEBHOOK;
const OSUSUME_WEBHOOK = process.env.OSUSUME_WEBHOOK;

if (!process.env.DISCORD_BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN is not set");
  process.exit(1);
}
if (!JAPANESE_WEBHOOK) {
  console.error("JAPANESE_WEBHOOK is not set");
  process.exit(1);
}
if (!OSUSUME_WEBHOOK) {
  console.error("OSUSUME_WEBHOOK is not set");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageReactionAdd", async (reaction, user) => {
  // ボット自身のリアクションは無視
  if (user.bot) return;

  // ✅ 以外のリアクションは無視
  if (reaction.emoji.name !== APPROVAL_EMOJI) return;

  // 承認チャンネル以外は無視
  if (reaction.message.channelId !== APPROVAL_CHANNEL_ID) return;

  // Partial の場合はフェッチ
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (err) {
      console.error("Failed to fetch reaction:", err);
      return;
    }
  }

  let message = reaction.message;
  if (message.partial) {
    try {
      message = await message.fetch();
    } catch (err) {
      console.error("Failed to fetch message:", err);
      return;
    }
  }

  const content = message.content || "";
  console.log(`👍 reaction detected. Message content: ${content}`);

  // 転送先を判定
  let webhookUrl = null;
  let channelLabel = "";

  if (content.includes("案1️⃣") || content.includes("案2️⃣") || content.includes("案3️⃣")) {
    webhookUrl = JAPANESE_WEBHOOK;
    channelLabel = "日本語で話そう";
  } else if (content.includes("案4️⃣") || content.includes("案5️⃣") || content.includes("案6️⃣")) {
    webhookUrl = OSUSUME_WEBHOOK;
    channelLabel = "おすすめ";
  } else {
    console.log("No matching case pattern found. Skipping.");
    return;
  }

  // Webhook に転送
  try {
    const fetch = (await import("node-fetch")).default;

    // 添付ファイルの URL を収集
    const attachmentUrls = message.attachments.map((a) => a.url).join("\n");

    const body = {
      content: content + (attachmentUrls ? "\n" + attachmentUrls : ""),
      username: message.author?.username ?? "転送Bot",
      avatar_url: message.author?.displayAvatarURL() ?? undefined,
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Webhook error (${res.status}): ${text}`);
    } else {
      console.log(`Forwarded to [${channelLabel}] webhook successfully.`);
    }
  } catch (err) {
    console.error("Failed to send webhook:", err);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
