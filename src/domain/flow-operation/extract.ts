const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s) => typeof s === 'string' && UUID_RE.test(s);
export const extractUuidFromUrl = (url) => { if (typeof url !== 'string') return ''; const m = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i); return m ? m[0] : ''; };
export const isError = (r) => { if (!r || typeof r !== 'object') return false; const d = r; if (typeof d.error === 'string' && d.error) return true; if (typeof d.status === 'number' && d.status >= 400) return true; const dd = d.data; if (dd && typeof dd === 'object' && typeof dd.error === 'string' && dd.error) return true; return false; };

// Port of flowkit operations.py:100-138 — dual schema extraction
export function extractOperations(result) {
  if (!result || typeof result !== 'object') return [];
  const data = result.data || result;

  // OLD schema
  const ops = data.operations;
  if (Array.isArray(ops) && ops.length > 0) { for (const op of ops) { const name = op.operation?.name; if (!name) console.warn('[flow-op] Operation missing name'); } return ops; }

  // NEW workflow schema
  const workflows = data.workflows;
  const mediaList = data.media;
  if (!Array.isArray(workflows) || !Array.isArray(mediaList) || !workflows.length || !mediaList.length) return [];

  const mediaById = new Map();
  for (const m of mediaList) { if (typeof m?.name === 'string' && m.name) mediaById.set(m.name, m); }

  const synthesized = [];
  for (const wf of workflows) {
    const wfName = wf?.name, meta = wf?.metadata, primaryMediaId = meta?.primaryMediaId;
    if (typeof wfName !== 'string' || !wfName || typeof primaryMediaId !== 'string' || !primaryMediaId) continue;
    synthesized.push({ operation: { name: wfName, metadata: { video: { mediaId: primaryMediaId } } }, status: 'MEDIA_GENERATION_STATUS_PENDING', _workflow_mode: true, _primary_media_id: primaryMediaId });
  }
  if (synthesized.length) console.log('[flow-op] Detected workflow-schema: ' + synthesized.length + ' workflow(s)');
  return synthesized;
}

export function extractMediaId(result, reqType) {
  if (!result || typeof result !== 'object') return null;
  const src = result.data || result;
  if (reqType.includes('VIDEO')) {
    const ops = src.operations;
    if (Array.isArray(ops) && ops.length > 0) {
      const fifeUrl = ops[0]?.operation?.metadata?.video?.fifeUrl;
      if (typeof fifeUrl === 'string') { const u = extractUuidFromUrl(fifeUrl); if (u) return u; }
    }
  }
  const media = src.media;
  if (Array.isArray(media) && media.length > 0) {
    const f = media[0];
    if (typeof f?.name === 'string' && isUuid(f.name)) return f.name;
    const gi = f?.image?.generatedImage; if (gi) { if (typeof gi.mediaId === 'string' && isUuid(gi.mediaId)) return gi.mediaId; if (typeof gi.fifeUrl === 'string') { const u = extractUuidFromUrl(gi.fifeUrl); if (u) return u; } }
  }
  return null;
}

export function extractOutputUrl(result, reqType) {
  if (!result || typeof result !== 'object') return '';
  const src = result.data || result;
  if (reqType.includes('VIDEO')) {
    const ops = src.operations;
    if (Array.isArray(ops) && ops.length > 0) { const fu = ops[0]?.operation?.metadata?.video?.fifeUrl; if (typeof fu === 'string' && fu) return fu; }
  }
  const media = src.media;
  if (Array.isArray(media) && media.length > 0) {
    const gi = media[0]?.image?.generatedImage; if (gi) { if (typeof gi.fifeUrl === 'string' && gi.fifeUrl) return gi.fifeUrl; if (typeof gi.imageUri === 'string' && gi.imageUri) return gi.imageUri; if (typeof gi.encodedImage === 'string' && gi.encodedImage) return 'data:image/png;base64,' + gi.encodedImage; }
  }
  return '';
}

export function extractInnerApiError(data) {
  if (!data || typeof data !== 'object') return null;
  const err = data.error; if (!err) return null;
  const details = err.details; if (Array.isArray(details) && details.length > 0) { const reason = details[0]?.reason; if (typeof reason === 'string' && reason) return reason; }
  const msg = err.message; if (typeof msg === 'string' && msg) return msg;
  return null;
}
