// POSTs one CEC key name to the server. Never throws: resolves to
// { ok: true } or { ok: false, message } with a message fit for a snackbar.
export async function sendKey(apiBase, key) {
  try {
    const res = await fetch(`${apiBase}/api/key`, {
      method: "POST",
      cache: "no-cache",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (res.ok) return { ok: true };
    console.error(`Key "${key}" failed: ${res.status}`);
    if (res.status === 503) {
      return { ok: false, message: "CEC not ready. The TV link is still starting." };
    }
    return { ok: false, message: `The TV did not respond (error ${res.status}).` };
  } catch (error) {
    console.error(`Key "${key}" failed`, error);
    return { ok: false, message: "Can't reach the TV Hub server." };
  }
}
