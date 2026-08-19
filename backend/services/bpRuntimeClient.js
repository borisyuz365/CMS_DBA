// Notify the public BP runtime microservice to reload its in-memory cache
// after a CMS promotion write. Fire-and-forget — logs on failure, never blocks CMS.

async function notifyBpRuntimeInvalidate() {
  const url = process.env.BP_RUNTIME_INVALIDATE_URL;
  if (!url) return;

  const secret = process.env.BP_INVALIDATE_SECRET;
  const headers = { 'Content-Type': 'application/json' };
  if (secret) headers['X-BP-Invalidate-Secret'] = secret;

  try {
    const res = await fetch(url, { method: 'POST', headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[bpRuntimeClient] invalidate HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn('[bpRuntimeClient] invalidate failed:', err.message);
  }
}

module.exports = { notifyBpRuntimeInvalidate };
