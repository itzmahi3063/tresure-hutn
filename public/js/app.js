(() => {
  const tg = window.Telegram?.WebApp;
  let state = { balances: { usdt: 0, gems: 0, spins: 0, keys: 0, diamond: 0 }, isAdmin: false };
  let currentTaskTab = 'daily';
  let wheelRotation = 0;

  const $ = (sel) => document.querySelector(sel);
  const $all = (sel) => Array.from(document.querySelectorAll(sel));

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  function fmtUsd(n) { return `$${Number(n || 0).toFixed(4).replace(/0+$/, '').replace(/\.$/, '.0')}`; }
  function fmtInt(n) { return Number(n || 0).toLocaleString(); }

  // ---------------- Screens ----------------
  function showScreen(name) {
    $all('.screen').forEach((s) => s.classList.add('hidden'));
    $(`#screen-${name}`).classList.remove('hidden');
    $all('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.screen === name));
    if (name === 'task') loadTaskTab(currentTaskTab);
    if (name === 'refer') loadRefer();
  }

  $all('.nav-btn').forEach((btn) => btn.addEventListener('click', () => showScreen(btn.dataset.screen)));
  $all('[data-action="go-task"]').forEach((el) => el.addEventListener('click', () => showScreen('task')));
  $all('[data-action="go-refer"]').forEach((el) => el.addEventListener('click', () => showScreen('refer')));
  $all('[data-action="go-profile"]').forEach((el) => el.addEventListener('click', () => showScreen('profile')));
  $all('[data-action="go-wallet"]').forEach((el) => el.addEventListener('click', openWallet));
  $all('[data-action="watch-ads"]').forEach((el) => el.addEventListener('click', () => { showScreen('task'); switchTaskTab('daily'); }));
  $all('[data-action="open-spin"]').forEach((el) => el.addEventListener('click', openSpin));
  $('#chest-btn').addEventListener('click', openSpin);
  $('#open-chest-btn').addEventListener('click', openSpin);

  // ---------------- Modals ----------------
  function openModal(id) { $(`#${id}`).classList.remove('hidden'); }
  function closeModal(id) { $(`#${id}`).classList.add('hidden'); }
  $all('[data-close]').forEach((btn) => btn.addEventListener('click', () => closeModal(btn.dataset.close)));

  // ================= HOME =================
  function renderHome() {
    const b = state.balances;
    $('#home-name').textContent = [state.user?.firstName, state.user?.lastName].filter(Boolean).join(' ') || 'Adventurer';
    $('#home-avatar').src = state.user?.photoUrl || '';
    $('#home-balance').textContent = fmtUsd(b.usdt);
    $('#stat-spins').textContent = fmtInt(b.spins);
    $('#stat-usdt').textContent = fmtUsd(b.usdt);
    $('#stat-gems').textContent = fmtInt(b.gems);
    $('#stat-refers').textContent = fmtInt(state.referrals || 0);
    $('#home-keys').textContent = fmtInt(b.keys);

    $('#profile-avatar').src = state.user?.photoUrl || '';
    $('#profile-name').textContent = [state.user?.firstName, state.user?.lastName].filter(Boolean).join(' ') || 'Adventurer';
    $('#profile-username').textContent = state.user?.username ? `@${state.user.username}` : '';
    $('#profile-usdt').textContent = fmtUsd(b.usdt);
    $('#profile-gems').textContent = fmtInt(b.gems);
    $('#profile-diamond').textContent = fmtInt(b.diamond);
    $('#profile-spins').textContent = fmtInt(b.spins);
    $('#profile-keys').textContent = fmtInt(b.keys);
  }

  async function refreshHome() {
    try {
      const data = await Api.home();
      state.balances = data.balances;
      state.user = data.user;
      state.referrals = data.referrals;
      renderHome();
    } catch (e) { console.error(e); }
  }

  // ================= TASKS =================
  $('#task-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    switchTaskTab(btn.dataset.tab);
  });

  function switchTaskTab(tab) {
    currentTaskTab = tab;
    $all('#task-tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    loadTaskTab(tab);
  }

  async function loadTaskTab(tab) {
    const content = $('#task-content');
    content.innerHTML = '<div class="card" style="text-align:center;color:var(--text-dim)">Loading…</div>';

    try {
      if (tab === 'daily') {
        const { slots } = await Api.adSlots();
        content.innerHTML = slots.length
          ? slots.map(renderAdSlot).join('')
          : '<div class="card empty-state"><div class="empty-emoji">📺</div><div class="empty-title">No ad slots yet</div></div>';
        content.querySelectorAll('[data-watch]').forEach((btn) => btn.addEventListener('click', () => watchAd(btn.dataset.watch)));
        return;
      }

      const { tasks } = await Api.tasks(tab);
      let html = '';

      if (tab === 'exclusive') {
        html += `
          <div class="card add-own-task" id="add-own-task-btn">
            <div>
              <div class="add-own-task-title">➕ Add your own task</div>
              <div class="add-own-task-sub">Get other adventurers to join your channel or visit your link</div>
            </div>
            <div>›</div>
          </div>
          <div class="section-toggle">
            <button class="active" data-scope="all">All tasks</button>
            <button data-scope="mine">My tasks</button>
          </div>`;
      }

      html += tasks.length
        ? `<div id="task-list">${tasks.map(renderTaskCard).join('')}</div>`
        : '<div class="card empty-state"><div class="empty-emoji">🧭</div><div class="empty-title">No tasks right now</div></div>';

      if (tab === 'social') {
        html += `<div class="card info-box"><b>How rewards land:</b> every task is checked on our server the moment you tap Go — channel joins are verified live with Telegram, so your treasure lands the instant the check passes, never before.</div>`;
      }

      content.innerHTML = html;

      if (tab === 'exclusive') {
        $('#add-own-task-btn').addEventListener('click', () => openModal('modal-add-task'));
        $all('.section-toggle button').forEach((b) =>
          b.addEventListener('click', () => {
            $all('.section-toggle button').forEach((x) => x.classList.remove('active'));
            b.classList.add('active');
            const list = $('#task-list');
            if (b.dataset.scope === 'mine') {
              const filtered = tasks.filter((t) => t.completed);
              list.innerHTML = filtered.length
                ? filtered.map(renderTaskCard).join('')
                : '<div class="card empty-state"><div class="empty-emoji">📭</div><div class="empty-title">You haven\'t completed any yet</div></div>';
            } else {
              list.innerHTML = tasks.map(renderTaskCard).join('');
            }
            wireTaskButtons();
          })
        );
      }

      wireTaskButtons();
    } catch (e) {
      content.innerHTML = `<div class="card" style="color:var(--danger)">${e.message}</div>`;
    }
  }

  function wireTaskButtons() {
    $all('[data-go-task]').forEach((btn) =>
      btn.addEventListener('click', () => goTask(btn.dataset.goTask, btn.dataset.url))
    );
  }

  function renderTaskCard(t) {
    const disabled = t.completed || t.capReached;
    const label = t.completed ? 'Done' : t.capReached ? 'Full' : 'Go ↗';
    return `
      <div class="card task-card">
        <div class="task-icon">${t.icon || '🎯'}</div>
        <div class="task-info">
          <div class="task-title">${t.title}</div>
          ${t.subtitle ? `<div class="task-sub">${t.subtitle}</div>` : ''}
          <div class="task-reward">+${t.rewardAmount} ${t.rewardCurrency === 'usdt' ? 'USDT' : 'Gems'}</div>
        </div>
        <button class="task-go-btn" ${disabled ? 'disabled' : ''} data-go-task="${t.id}" data-url="${t.targetUrl}">${label}</button>
      </div>`;
  }

  function renderAdSlot(s) {
    const full = s.doneToday >= s.dailyLimit;
    return `
      <div class="card task-card">
        <div class="task-icon">${s.icon || '📺'}</div>
        <div class="task-info">
          <div class="task-title">${s.title}</div>
          <div class="task-sub">${s.doneToday} of ${s.dailyLimit} done today</div>
          <div class="task-reward">+${s.rewardAmount} ${s.rewardCurrency === 'usdt' ? 'USDT' : 'Gems'} · watch a clip</div>
        </div>
        <button class="task-go-btn" ${full ? 'disabled' : ''} data-watch="${s.id}">${full ? 'Done' : 'Watch'}</button>
      </div>`;
  }

  async function goTask(taskId, url) {
    if (url && url !== 'undefined') window.open(url, '_blank');
    try {
      const res = await Api.completeTask(taskId);
      toast(`+${res.credited.amount} ${res.credited.currency === 'usdt' ? 'USDT' : 'Gems'} earned!`);
      refreshHome();
      loadTaskTab(currentTaskTab);
    } catch (e) {
      toast(e.message);
    }
  }

  async function watchAd(taskId) {
    // In production, this is where the ad network's SDK (Adsgram/Monetag) plays the
    // ad and hands back a reward token on its own completion callback. We only credit
    // once that token arrives - never on a bare button click.
    toast('Loading ad…');
    setTimeout(async () => {
      try {
        const fakeToken = `${taskId}-${Date.now()}`;
        const res = await Api.watchAd(taskId, fakeToken);
        toast(`+${res.credited.amount} ${res.credited.currency === 'usdt' ? 'USDT' : 'Gems'} earned!`);
        refreshHome();
        loadTaskTab('daily');
      } catch (e) {
        toast(e.message);
      }
    }, 1200);
  }

  // ================= REFER =================
  async function loadRefer() {
    try {
      const data = await Api.refer();
      $('#refer-total').textContent = fmtInt(data.totalReferrals);
      $('#refer-earnings').textContent = `${fmtInt(data.referralEarningsDiamond)} 💎`;
      $('#refer-commission-val').textContent = `${fmtInt(data.referralEarningsDiamond)} 💎 ≈ ${fmtUsd(data.referralEarningsUsd)}`;
      $('#share-bonus').textContent = `${fmtInt(data.bonusPerFriendDiamond)} 💎`;
      $('#share-link-text').textContent = data.shareLink;

      $('#refer-steps').innerHTML = data.bonusSteps
        .map(
          (s, i) => `
        <div class="step-row">
          <div class="step-num">${i + 1}</div>
          <div class="step-label">${s.label}</div>
          <div class="step-reward">
            <div class="step-chip">+${s.diamond}</div>
            <div class="step-usd">= ${fmtUsd(s.usd)}</div>
          </div>
        </div>`
        )
        .join('') + `
        <div class="step-row">
          <div class="step-num">💰</div>
          <div class="step-label">Every time they withdraw, after that</div>
          <div class="step-reward"><div class="step-chip">+${data.withdrawalCommissionPct}%</div></div>
        </div>`;

      const copy = () => {
        navigator.clipboard?.writeText(data.shareLink);
        toast('Link copied!');
      };
      $('#copy-link-btn').onclick = copy;
      $('#copy-link-btn2').onclick = copy;
      $('#share-now-btn').onclick = () => {
        if (tg?.openTelegramLink) {
          tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(data.shareLink)}&text=${encodeURIComponent('Join me on Treasure Hunt! 💎')}`);
        } else {
          copy();
        }
      };
    } catch (e) {
      console.error(e);
    }
  }

  // ================= SPIN =================
  const WHEEL_LABELS = ['50 Gems', '100 Gems', '500 Gems', '$0.05', '$0.10', '2 Spins', '1 Key', '1000 Gems'];

  async function openSpin() {
    openModal('modal-spin');
    SpinWheel.render($('#wheel-svg'), WHEEL_LABELS);
    try {
      const data = await Api.spinState();
      state.balances = data.balances;
      renderSpinStats();
    } catch (e) { toast(e.message); }
  }

  function renderSpinStats() {
    const b = state.balances;
    $('#spin-gems').textContent = fmtInt(b.gems);
    $('#spin-usdt').textContent = fmtUsd(b.usdt);
    $('#spin-keys').textContent = fmtInt(b.keys);
    $('#spin-left').textContent = fmtInt(b.spins);
    $('#spin-remaining-text').textContent = fmtInt(b.spins);
  }

  $('#spin-now-btn').addEventListener('click', async () => {
    if (state.balances.spins <= 0) return toast('No spins left');
    $('#spin-now-btn').disabled = true;
    try {
      const res = await Api.spin();
      wheelRotation = SpinWheel.spinTo($('#wheel-svg'), WHEEL_LABELS.length, res.resultIndex, wheelRotation);
      setTimeout(() => {
        toast(`🎉 You won ${res.resultLabel}!`);
        state.balances = res.balances;
        renderSpinStats();
        renderHome();
        $('#spin-now-btn').disabled = false;
      }, 3600);
    } catch (e) {
      toast(e.message);
      $('#spin-now-btn').disabled = false;
    }
  });

  // ================= WALLET =================
  function openWallet() {
    openModal('modal-wallet');
    renderWalletForm('withdraw');
  }
  $all('.wallet-option').forEach((btn) => btn.addEventListener('click', () => renderWalletForm(btn.dataset.wallet)));

  function renderWalletForm(kind) {
    $all('.wallet-option').forEach((b) => b.classList.toggle('active', b.dataset.wallet === kind));
    const form = $('#wallet-form');
    if (kind === 'withdraw') {
      form.innerHTML = `
        <div class="form-row"><label>Amount (USDT)</label><input type="number" id="wd-amount" min="0" step="0.0001" placeholder="0.00" /></div>
        <div class="form-row"><label>USDT Wallet Address</label><input type="text" id="wd-address" placeholder="Paste your address" /></div>
        <button class="btn-primary" id="wd-submit">Withdraw</button>`;
      $('#wd-submit').addEventListener('click', async () => {
        try {
          const amount = parseFloat($('#wd-amount').value);
          const address = $('#wd-address').value.trim();
          const res = await Api.withdraw(amount, address);
          toast('Withdrawal requested!');
          state.balances = res.balances;
          renderHome();
          closeModal('modal-wallet');
        } catch (e) { toast(e.message); }
      });
    } else {
      form.innerHTML = `
        <div class="form-row"><label>Amount (Diamond)</label><input type="number" id="cv-amount" min="0" step="1" placeholder="0" /></div>
        <div class="form-note">1 Diamond = $0.00004 USDT</div>
        <button class="btn-primary" id="cv-submit">Convert</button>`;
      $('#cv-submit').addEventListener('click', async () => {
        try {
          const amount = parseFloat($('#cv-amount').value);
          const res = await Api.convert(amount);
          toast(`Converted to ${fmtUsd(res.convertedUsdt)}!`);
          state.balances = res.balances;
          renderHome();
          closeModal('modal-wallet');
        } catch (e) { toast(e.message); }
      });
    }
  }

  // ================= BOOT =================
  async function boot() {
    try {
      tg?.ready();
      tg?.expand();
      const data = await Api.login();
      Api.setSession(data.session);
      state.isAdmin = data.isAdmin;
      state.user = data.user;
      state.balances = data.user.balances;
      renderHome();
      refreshHome();
    } catch (e) {
      console.error(e);
      toast('Could not connect — please open this app from Telegram.');
    }
  }

  boot();
})();
