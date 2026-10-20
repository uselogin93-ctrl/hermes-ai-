import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { sendTestNotification } from "@/lib/services/notifications";
import { getSettings } from "@/lib/services/settings";
import { ok, toErrorResponse } from "@/lib/api/response";

export async function POST() {
  try {
    await requireSession();
    const db = await getDb();
    const settings = await getSettings(db);
    const result = await sendTestNotification(db, {
      channel: settings.notification_channel,
      chatId: settings.telegram_chat_id,
      email: settings.user_name,
    });
    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
