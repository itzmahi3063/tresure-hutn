(() => {
  const tg = window.Telegram?.WebApp;
  const $ = (sel) => document.querySelector(sel);

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2600);
  }

  let sessionToken = null;

  async function adminRequest(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionToken) headers['x-session'] = sessionToken;
    const res = await fetch(path, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  function renderShell() {
    document.title = 'Treasure Hunt — Admin';
    $('#admin-root').innerHTML = `
      <h1 class="screen-title">🗝️ Admin Panel</h1>
      <div class="tabs" id="admin-tabs">
        <button class="tab active" data-tab="add-task">Add Task</button>
        <button class="tab" data-tab="add-balance">Add Balance</button>
        <button class="tab" data-tab="check-user">Check User</button>
        <button class="tab" data-tab="broadcast">Broadcast</button>
      </div>
      <div id="admin-content"></div>`;

    $('#admin-tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      document.querySelectorAll('#admin-tabs .tab').forEach((b) => b.classList.toggle('active', b === btn));
      renderTab(btn.dataset.tab);
    });

    renderTab('add-task');
  }

  function renderTab(tab) {
    const content = $('#admin-content');
    if (tab === 'add-task') return renderAddTask(content);
    if (tab === 'add-balance') return renderAddBalance(content);
    if (tab === 'check-user') return renderCheckUser(content);
    if (tab === 'broadcast') return renderBroadcast(content);
  }

  function renderAddTask(content) {
    content.innerHTML = `
      <div class="card">
        <div class="form-row"><label>Section</label>
          <select id="t-section" class="admin-select"><option value="daily">Daily</option><option value="social">Social</option><option value="exclusive">Exclusive</option><option value="partner">Partner</option></select>
        </div>
        <div class="form-row"><label>Type</label>
          <select id="t-type" class="admin-select"><option value="channel_group">Channel/Group</option><option value="bot_website">Bot/Website</option><option value="ad">Ad slot (Daily only)</option></select>
        </div>
        <div class="form-row"><label>Title</label><input id="t-title" placeholder="e.g. Join our channel" /></div>
        <div class="form-row"><label>Subtitle (optional)</label><input id="t-subtitle" placeholder="e.g. Get map updates" /></div>
        <div class="form-row"><label>Icon (emoji or URL)</label><input id="t-icon" placeholder="🧭" /></div>

        <div id="t-channel-fields">
          <div class="form-row"><label>Channel/Group @username</label><input id="t-chat" placeholder="@yourchannel" /></div>
          <div class="form-row"><button class="btn-secondary" id="t-verify-btn" type="button">Verify now</button><div id="t-verify-result" class="form-note"></div></div>
        </div>
        <div id="t-url-fields" class="hidden">
          <div class="form-row"><label>Target URL</label><input id="t-url" placeholder="https://..." /></div>
        </div>
        <div id="t-ad-fields" class="hidden">
          <div class="form-row"><label>Ad network</label><input id="t-adnetwork" placeholder="adsgram / monetag" /></div>
          <div class="form-row"><label>Daily limit</label><input id="t-adlimit" type="number" value="10" /></div>
          <div class="form-row"><label><input type="checkbox" id="t-hidden" /> Hide from everyone</label></div>
        </div>

        <div class="form-row"><label>Reward currency</label>
          <select id="t-currency" class="admin-select"><option value="gems">Gems</option><option value="usdt">USDT</option></select>
        </div>
        <div class="form-row"><label>Reward amount</label><input id="t-amount" type="number" step="0.0001" placeholder="100" /></div>
        <div class="form-row"><label>Completion cap (0 = unlimited)</label><input id="t-cap" type="number" value="0" /></div>

        <button class="btn-primary" id="t-publish">Publish</button>
      </div>`;

    const typeSel = $('#t-type');
    typeSel.addEventListener('change', () => {
      $('#t-channel-fields').classList.toggle('hidden', typeSel.value !== 'channel_group');
      $('#t-url-fields').classList.toggle('hidden', typeSel.value !== 'bot_website');
      $('#t-ad-fields').classList.toggle('hidden', typeSel.value !== 'ad');
    });

    $('#t-verify-btn').addEventListener('click', async () => {
      const chat = $('#t-chat').value.trim();
      if (!chat) return toast('Enter a channel/group username first');
      try {
        const data = await adminRequest(`/api/admin?action=verify-chat-admin&chatUsername=${encodeURIComponent(chat)}`);
        $('#t-verify-result').textContent = data.botIsAdmin
          ? '✅ Bot is an admin in this chat.'
          : '⚠️ Add the bot as admin in this channel/group to continue.';
      } catch (e) { toast(e.message); }
    });

    $('#t-publish').addEventListener('click', async () => {
      try {
        const body = {
          action: 'add-task',
          section: $('#t-section').value,
          type: typeSel.value,
          title: $('#t-title').value.trim(),
          subtitle: $('#t-subtitle').value.trim(),
          icon: $('#t-icon').value.trim(),
          targetChatUsername: $('#t-chat').value.trim(),
          targetUrl: $('#t-url').value.trim(),
          adNetwork: $('#t-adnetwork').value.trim(),
          adDailyLimit: Number($('#t-adlimit').value) || 10,
          hiddenFromEveryone: $('#t-hidden').checked,
          rewardCurrency: $('#t-currency').value,
          rewardAmount: parseFloat($('#t-amount').value),
          completionCap: Number($('#t-cap').value) || 0,
        };
        await adminRequest('/api/admin', { method: 'POST', body: JSON.stringify(body) });
        toast('Task published!');
      } catch (e) { toast(e.message); }
    });
  }

  function renderAddBalance(content) {
    content.innerHTML = `
      <div class="card">
        <div class="form-row"><label>Telegram User ID</label><input id="b-id" placeholder="123456789" /></div>
        <div class="form-row"><label>Currency</label>
          <select id="b-currency" class="admin-select"><option value="gems">Gems</option><option value="usdt">USDT</option><option value="diamond">Diamond</option><option value="spins">Spins</option><option value="keys">Keys</option></select>
        </div>
        <div class="form-row"><label>Amount (use negative to deduct)</label><input id="b-amount" type="number" step="0.0001" placeholder="100" /></div>
        <button class="btn-primary" id="b-submit">Apply</button>
      </div>`;

    $('#b-submit').addEventListener('click', async () => {
      try {
        const body = { action: 'add-user-balance', telegramId: $('#b-id').value.trim(), currency: $('#b-currency').value, amount: parseFloat($('#b-amount').value) };
        const data = await adminRequest('/api/admin', { method: 'POST', body: JSON.stringify(body) });
        toast('Balance updated!');
        console.log(data.balances);
      } catch (e) { toast(e.message); }
    });
  }

  function renderCheckUser(content) {
    content.innerHTML = `
      <div class="card">
        <div class="form-row"><label>Telegram User ID</label><input id="c-id" placeholder="123456789" /></div>
        <button class="btn-primary" id="c-submit">Check</button>
        <div id="c-result" style="margin-top:14px;font-size:13px;white-space:pre-wrap;color:var(--text-dim)"></div>
      </div>`;
    $('#c-submit').addEventListener('click', async () => {
      try {
        const id = $('#c-id').value.trim();
        const data = await adminRequest(`/api/admin?action=check-user&telegramId=${encodeURIComponent(id)}`);
        $('#c-result').textContent = JSON.stringify(data.user, null, 2);
      } catch (e) { toast(e.message); }
    });
  }

  function renderBroadcast(content) {
    content.innerHTML = `
      <div class="card">
        <div class="form-row"><label>Message</label><textarea id="bc-msg" rows="5" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--card-border);background:#0c1626;color:var(--text)"></textarea></div>
        <button class="btn-primary" id="bc-submit">Send Broadcast</button>
      </div>`;
    $('#bc-submit').addEventListener('click', async () => {
      try {
        const data = await adminRequest('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'broadcast', message: $('#bc-msg').value }) });
        toast(`Sent to ${data.successCount}/${data.targetCount} users`);
      } catch (e) { toast(e.message); }
    });
  }

  async function boot() {
    tg?.ready();
    tg?.expand();
    try {
      const headers = { 'Content-Type': 'application/json', 'x-telegram-init-data': tg?.initData || '' };
      const res = await fetch('/api/auth', { method: 'POST', headers, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.isAdmin) {
        // Deliberately blank - no hint that an admin panel exists here.
        document.body.innerHTML = '';
        return;
      }
      sessionToken = data.session;
      renderShell();
    } catch (e) {
      document.body.innerHTML = '';
    }
  }

  boot();
})();
