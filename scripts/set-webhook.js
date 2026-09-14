// Run once after deploying: node scripts/set-webhook.js
// Requires BOT_TOKEN and APP_URL in your environment (e.g. `source .env` first,
// or `env $(cat .env | xargs) node scripts/set-webhook.js`).

async function main() {
  const token = process.env.BOT_TOKEN;
  const appUrl = process.env.APP_URL;
  const secret = process.env.WEBHOOK_SECRET || '';

  if (!token || !appUrl) {
    console.error('Set BOT_TOKEN and APP_URL in your environment first.');
    process.exit(1);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${appUrl}/api/webhook`,
      secret_token: secret || undefined,
    }),
  });
  const data = await res.json();
  console.log(data);
}

main();
