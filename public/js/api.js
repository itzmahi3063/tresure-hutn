const Api = (() => {
  let sessionToken = null;

  function setSession(token) {
    sessionToken = token;
  }

  async function request(path, { method = 'GET', body, useInitData = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (useInitData) {
      headers['x-telegram-init-data'] = window.Telegram?.WebApp?.initData || '';
    } else if (sessionToken) {
      headers['x-session'] = sessionToken;
    }

    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  return {
    login: () => request('/api/auth', { method: 'POST', useInitData: true }),
    home: () => request('/api/home'),
    spinState: () => request('/api/spin'),
    spin: () => request('/api/spin', { method: 'POST' }),
    tasks: (section) => request(`/api/tasks?section=${encodeURIComponent(section)}`),
    completeTask: (taskId) => request('/api/tasks', { method: 'POST', body: { taskId } }),
    adSlots: () => request('/api/ads'),
    watchAd: (taskId, completionToken) => request('/api/ads', { method: 'POST', body: { taskId, completionToken } }),
    refer: () => request('/api/refer'),
    walletState: () => request('/api/wallet'),
    withdraw: (amountUsdt, walletAddress) =>
      request('/api/wallet', { method: 'POST', body: { action: 'withdraw', amountUsdt, walletAddress } }),
    convert: (diamondAmount) =>
      request('/api/wallet', { method: 'POST', body: { action: 'convert', diamondAmount } }),
    setSession,
  };
})();
