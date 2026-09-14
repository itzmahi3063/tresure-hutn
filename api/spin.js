const { connectDB } = require('../lib/db');
const { authenticateRequest } = require('../lib/auth');
const { ok, fail, withErrorHandling } = require('../lib/respond');
const User = require('../models/User');

// Wheel segments - weight controls odds, currency/amount is what gets credited.
// This table lives server-side only; the client never gets to pick or influence it.
const SEGMENTS = [
  { label: '50 Gems', currency: 'gems', amount: 50, weight: 28 },
  { label: '100 Gems', currency: 'gems', amount: 100, weight: 20 },
  { label: '500 Gems', currency: 'gems', amount: 500, weight: 8 },
  { label: '$0.05 USDT', currency: 'usdt', amount: 0.05, weight: 16 },
  { label: '$0.10 USDT', currency: 'usdt', amount: 0.1, weight: 6 },
  { label: '2 Spins', currency: 'spins', amount: 2, weight: 12 },
  { label: '1 Key', currency: 'keys', amount: 1, weight: 8 },
  { label: '1000 Gems', currency: 'gems', amount: 1000, weight: 2 },
];

function pickSegment() {
  const totalWeight = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < SEGMENTS.length; i++) {
    roll -= SEGMENTS[i].weight;
    if (roll <= 0) return { index: i, segment: SEGMENTS[i] };
  }
  return { index: SEGMENTS.length - 1, segment: SEGMENTS[SEGMENTS.length - 1] };
}

module.exports = withErrorHandling(async (req, res) => {
  await connectDB();
  const { telegramId } = authenticateRequest(req);
  const user = await User.findOne({ telegramId });
  if (!user) return fail(res, 404, 'User not found');

  if (req.method === 'GET') {
    return ok(res, {
      segments: SEGMENTS.map((s) => s.label),
      spinsLeft: user.balances.spins,
      balances: user.balances,
    });
  }

  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  if (user.balances.spins <= 0) return fail(res, 400, 'No spins left');

  const { index, segment } = pickSegment();

  // Atomic: only decrement spins if the user still has at least one at write time,
  // preventing a double-submit race from spending a spin they don't have.
  const updated = await User.findOneAndUpdate(
    { telegramId, 'balances.spins': { $gt: 0 } },
    {
      $inc: {
        'balances.spins': -1,
        [`balances.${segment.currency}`]: segment.amount,
      },
    },
    { new: true }
  );

  if (!updated) return fail(res, 400, 'No spins left');

  ok(res, {
    resultIndex: index,
    resultLabel: segment.label,
    balances: updated.balances,
  });
});
