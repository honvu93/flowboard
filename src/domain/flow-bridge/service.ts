import { randomBytes } from 'node:crypto';
const pendingRequests = new Map();
let extensionState = { connected: false, userId: '', flowKey: null, connectedAt: 0, connectCount: 0, disconnectCount: 0 };

export function sendCommand(method, params, endpointKey, timeoutMs = 60000) {
  if (!extensionState.connected) return Promise.resolve({ ok: false, status: 503, data: null, error: 'Extension not connected' });
  const id = randomBytes(16).toString('hex');
  return new Promise((resolve) => {
    const timer = setTimeout(() => { pendingRequests.delete(id); resolve({ ok: false, status: 408, data: null, error: 'timeout' }); }, timeoutMs);
    pendingRequests.set(id, { resolve, timer, createdAt: Date.now() });
    extensionState._ws?.send(JSON.stringify({ id, method, params }));
  });
}

export function registerExtension(userId, ws) {
  extensionState = { connected: true, userId, flowKey: extensionState.flowKey, connectedAt: Date.now(), connectCount: extensionState.connectCount + 1, disconnectCount: extensionState.disconnectCount, _ws: ws };
}

export function updateFlowKey(userId, flowKey) { if (extensionState.userId === userId) extensionState.flowKey = flowKey; }

export function handleCallback(id, status, data) {
  const pending = pendingRequests.get(id);
  if (!pending) return false;
  clearTimeout(pending.timer);
  pendingRequests.delete(id);
  pending.resolve({ ok: status >= 200 && status < 300, status, data, error: status >= 400 ? 'HTTP ' + status : null });
  return true;
}

export function disconnectExtension(userId) {
  if (extensionState.userId === userId) { extensionState.connected = false; extensionState.disconnectCount++; }
  for (const [id, p] of pendingRequests) { clearTimeout(p.timer); p.resolve({ ok: false, status: 502, data: null, error: 'Extension disconnected' }); pendingRequests.delete(id); }
}

export function getExtensionState() { return { ...extensionState, _ws: undefined }; }
export function getPendingCount() { return pendingRequests.size; }
