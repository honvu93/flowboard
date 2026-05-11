import { sendCommand } from '../flow-bridge/service.js';
import { buildApiUrl } from '../flow-model/endpoints.js';
import { VIDEO_POLL_INTERVAL_S, VIDEO_POLL_TIMEOUT_S } from '../flow-model/constants.js';
import { extractOutputUrl, extractUuidFromUrl } from './extract.js';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const WORKFLOW_OUTPUT_DIR = 'output/_workflow_videos';

async function pollWorkflows(userId, operations, timeoutS) {
  const completed = new Map(); let elapsed = 0;
  while (elapsed < timeoutS) {
    await sleep(VIDEO_POLL_INTERVAL_S * 1000); elapsed += VIDEO_POLL_INTERVAL_S;
    for (const op of operations) {
      const mid = op._primary_media_id; if (!mid || completed.has(mid)) continue;
      const resp = await sendCommand('api_request', { url: buildApiUrl('getMedia', { mediaId: mid }), method: 'GET' }, 'getMedia', 15000);
      if (!resp.ok) continue;
      const encoded = resp.data?.video?.encodedVideo; if (!encoded) continue;
      try {
        const binary = Buffer.from(encoded, 'base64');
        const isMp4 = binary.length >= 12 && binary[4] === 0x66 && binary[5] === 0x74 && binary[6] === 0x79 && binary[7] === 0x70;
        if (!isMp4) { console.log('[flow-op] Workflow media ' + mid.slice(0, 8) + ' still generating (' + binary.length + ' bytes)'); continue; }
        await mkdir(WORKFLOW_OUTPUT_DIR, { recursive: true });
        const outPath = path.join(WORKFLOW_OUTPUT_DIR, mid + '.mp4');
        await writeFile(outPath, binary); completed.set(mid, { path: outPath, size: binary.length });
        console.log('[flow-op] Workflow media ' + mid.slice(0, 8) + ' ready: ' + binary.length + ' bytes');
      } catch (e) { console.warn('[flow-op] Workflow decode failed: ' + e.message); }
    }
    if (completed.size === operations.length) {
      console.log('[flow-op] All ' + operations.length + ' workflow(s) completed after ' + elapsed + 's');
      return operations.map(op => { const mid = op._primary_media_id; const wfName = op.operation?.name ?? ''; const local = completed.get(mid); return { operationName: wfName, status: 'SUCCEEDED', videoUri: local ? 'file://' + path.resolve(local.path) : '' }; });
    }
  }
  return operations.map(op => ({ operationName: op.operation?.name ?? '', status: 'FAILED', error: 'Workflow polling timeout after ' + timeoutS + 's' }));
}

export async function pollOperations(userId, operations, timeoutS = VIDEO_POLL_TIMEOUT_S) {
  if (!operations?.length) return [{ operationName: '', status: 'FAILED', error: 'No operations' }];
  if (operations.every(op => op._workflow_mode === true)) return pollWorkflows(userId, operations, timeoutS);

  let elapsed = 0, currentOps = operations;
  while (elapsed < timeoutS) {
    await sleep(VIDEO_POLL_INTERVAL_S * 1000); elapsed += VIDEO_POLL_INTERVAL_S;
    const resp = await sendCommand('api_request', { url: buildApiUrl('checkVideoStatus'), method: 'POST', body: { operations: currentOps } }, 'checkVideoStatus', 30000);
    if (!resp.ok) { console.warn('[flow-op] Poll ' + elapsed + 's: status=' + resp.status); continue; }
    const ops = resp.data?.operations; if (!Array.isArray(ops) || !ops.length) continue;
    currentOps = ops; let allDone = true;
    for (const op of ops) {
      const status = String(op.status ?? '');
      if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') continue;
      if (status === 'MEDIA_GENERATION_STATUS_FAILED') {
        const opName = op.operation?.name ?? '?';
        return [{ operationName: String(opName), status: 'FAILED', error: 'Operation failed: ' + opName }];
      }
      const fifeUrl = op.operation?.metadata?.video?.fifeUrl;
      if (typeof fifeUrl === 'string' && extractUuidFromUrl(fifeUrl)) continue;
      allDone = false;
    }
    if (allDone) {
      console.log('[flow-op] All ' + ops.length + ' ops completed after ' + elapsed + 's');
      return ops.map(op => ({ operationName: op.operation?.name ?? '', status: 'SUCCEEDED', videoUri: extractOutputUrl({ data: { operations: [op] } }, 'GENERATE_VIDEO') || undefined }));
    }
    const done = ops.filter(o => o.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL').length;
    console.log('[flow-op] Poll ' + elapsed + 's/' + timeoutS + 's: ' + done + '/' + ops.length + ' done');
  }
  return currentOps.map(op => ({ operationName: op.operation?.name ?? '', status: 'FAILED', error: 'Polling timeout after ' + timeoutS + 's' }));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
