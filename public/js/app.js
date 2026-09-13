const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// --- Bottom nav screen switching ---
const navButtons = document.querySelectorAll(".bottom-nav__item");
const screens = document.querySelectorAll(".screen");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.screen;

    navButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
    screens.forEach((s) =>
      s.classList.toggle("is-active", s.id === `screen-${target}`)
    );

    if (target === "task") loadTasks();
    if (target === "profile") loadProfile();
    if (target === "refer") loadRefer();
  });
});

// --- Auth: send Telegram initData with every API call ---
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": tg?.initData || "",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

// --- Home: load real balance ---
async function loadBalance() {
  try {
    const data = await api("/api/user/me");
    document.getElementById("diamond-balance").textContent = data.diamondBalance ?? 0;
  } catch (e) {
    console.error(e);
  }
}

// --- Task screen: fetch tasks per tab, render cards ---
async function loadTasks(section = "daily") {
  const container = document.getElementById("screen-task");
  container.innerHTML = `<p>Loading tasks…</p>`;
  try {
    const tasks = await api(`/api/tasks?section=${section}`);
    container.innerHTML = tasks
      .map(
        (t) => `
        <div class="task-card">
          <img src="${t.imageUrl || ""}" alt="" />
          <div>
            <div class="task-card__title">${t.title}</div>
            <div class="task-card__reward">💎 +${t.rewardDiamonds}</div>
          </div>
          <button data-task-id="${t._id}">Go</button>
        </div>`
      )
      .join("");
  } catch (e) {
    container.innerHTML = `<p>Couldn't load tasks.</p>`;
  }
}

// --- Profile screen: real Telegram name + photo, balances at 0 until earned ---
async function loadProfile() {
  const container = document.getElementById("screen-profile");
  const user = tg?.initDataUnsafe?.user;
  try {
    const data = await api("/api/user/me");
    container.innerHTML = `
      <div class="profile-card">
        <img src="${user?.photo_url || ""}" alt="" />
        <div>${user?.first_name || ""} ${user?.username ? "@" + user.username : ""}</div>
        <div>💎 ${data.diamondBalance} &nbsp; USDT ${data.usdtBalance}</div>
      </div>`;
  } catch (e) {
    container.innerHTML = `<p>Couldn't load profile.</p>`;
  }
}

async function loadRefer() {
  const container = document.getElementById("screen-refer");
  try {
    const data = await api("/api/refer/me");
    container.innerHTML = `
      <div>Total referrals: ${data.totalReferrals}</div>
      <div>Referral link: ${data.referralLink}</div>`;
  } catch (e) {
    container.innerHTML = `<p>Couldn't load referral info.</p>`;
  }
}

loadBalance();
