import { env } from "@/lib/env";

export type TelegramButton = { text: string; url?: string; callback_data?: string };

export type TelegramResult = { ok: boolean; detail: string };

/**
 * Sends a message through the Telegram Bot API.
 *
 * A raw REST wrapper is used on purpose: the Bot API surface is small and
 * this avoids pulling an SDK into the server bundle.
 */
export async function sendTelegramMessage(
  text: string,
  options: { chatId?: string; buttons?: TelegramButton[] } = {},
): Promise<TelegramResult> {
  const chatId = options.chatId || env.telegramChatId;
  if (!env.telegramBotToken || !chatId) {
    return { ok: false, detail: "Telegram is not configured (bot token or chat id missing)." };
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: false,
  };

  if (options.buttons && options.buttons.length > 0) {
    body.reply_markup = {
      inline_keyboard: [
        options.buttons.map((button) =>
          button.url ? { text: button.text, url: button.url } : { text: button.text, callback_data: button.callback_data ?? "" },
        ),
      ],
    };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { ok?: boolean; description?: string };
    if (!response.ok || !data.ok) {
      return { ok: false, detail: data.description ?? `Telegram responded ${response.status}` };
    }
    return { ok: true, detail: "Message delivered." };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Telegram request failed" };
  }
}
