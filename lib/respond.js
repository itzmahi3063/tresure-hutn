function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function ok(res, data) {
  sendJson(res, 200, { ok: true, ...data });
}

function fail(res, status, message) {
  sendJson(res, status, { ok: false, error: message });
}

/** Wraps a Vercel Node function handler so thrown AuthErrors and generic
 * errors always produce a clean JSON response instead of a raw 500 page. */
function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const status = err.statusCode || 500;
      if (status === 500) {
        console.error(err);
      }
      fail(res, status, err.message || 'Internal server error');
    }
  };
}

/** Reads and JSON-parses the request body for Node's raw (req, res) handlers. */
async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

/** Vercel's plain Node ("Other") runtime does not populate req.query like
 * Express does - parse it ourselves from the raw URL. */
function getQuery(req) {
  const url = new URL(req.url, 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

module.exports = { ok, fail, sendJson, withErrorHandling, readJsonBody, getQuery };
