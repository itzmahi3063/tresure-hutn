const BASE = () => `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

async function tgCall(method, params = {}) {
  const res = await fetch(`${BASE()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  return data;
}

/** Server-side, 100% authoritative membership check - never trust the client. */
async function isChatMember(chatUsername, telegramUserId) {
  const data = await tgCall('getChatMember', {
    chat_id: chatUsername.startsWith('@') ? chatUsername : `@${chatUsername}`,
    user_id: telegramUserId,
  });
  if (!data.ok) return { verified: false, botIsAdmin: null, reason: data.description };
  const status = data.result.status;
  const isMember = ['creator', 'administrator', 'member', 'restricted'].includes(status);
  return { verified: isMember, status };
}

/** Used by the admin "Verify now" check when adding a channel/group task. */
async function isBotAdminInChat(chatUsername) {
  const me = await tgCall('getMe');
  if (!me.ok) return false;
  const data = await tgCall('getChatMember', {
    chat_id: chatUsername.startsWith('@') ? chatUsername : `@${chatUsername}`,
    user_id: me.result.id,
  });
  if (!data.ok) return false;
  return ['administrator', 'creator'].includes(data.result.status);
}

async function sendMessage(chatId, text) {
  return tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}

module.exports = { tgCall, isChatMember, isBotAdminInChat, sendMessage };
