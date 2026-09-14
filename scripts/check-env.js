const required = ['BOT_TOKEN', 'ADMIN_TELEGRAM_ID', 'MONGODB_URI', 'JWT_SECRET', 'APP_URL'];
const missing = required.filter((k) => !process.env[k]);

if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}
console.log('All required environment variables are set.');
