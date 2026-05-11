import { prisma } from '../infrastructure/db/prisma-client.js';
import { generateReferenceImage, generateSceneImage, generateSceneVideo, generateSceneVideoRefs } from '../domain/flow-operation/service.js';
import { POLL_INTERVAL_S, MAX_CONCURRENT_REQUESTS, MAX_RETRIES } from '../domain/flow-model/constants.js';

const TYPE_PRIORITY = { GENERATE_CHARACTER_IMAGE: 0, REGENERATE_CHARACTER_IMAGE: 0, EDIT_CHARACTER_IMAGE: 0, GENERATE_IMAGE: 1, REGENERATE_IMAGE: 1, EDIT_IMAGE: 1, GENERATE_VIDEO: 2, REGENERATE_VIDEO: 2, GENERATE_VIDEO_REFS: 2, GENERATE_VIDEO_TEXT: 2, UPSCALE_VIDEO: 3 };
const activeIds = new Set(); let shutdown = false;

async function main() {
  console.log('[flow-worker] Started');
  const staleCutoff = new Date(Date.now() - 600000);
  const stale = await prisma.flowRequest.findMany({ where: { status: 'PROCESSING', updatedAt: { lt: staleCutoff } } });
  for (const r of stale) { await prisma.flowRequest.update({ where: { id: r.id }, data: { status: 'PENDING', errorMessage: 'reset: stale' } }); }
  if (stale.length) console.log('[flow-worker] Reset ' + stale.length + ' stale');

  while (!shutdown) {
    try {
      const slots = MAX_CONCURRENT_REQUESTS - activeIds.size;
      if (slots <= 0) { await sleep(POLL_INTERVAL_S * 1000); continue; }
      const pending = await prisma.flowRequest.findMany({ where: { status: 'PENDING', id: { notIn: Array.from(activeIds) }, OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] }, orderBy: { createdAt: 'asc' }, take: slots });
      pending.sort((a, b) => (TYPE_PRIORITY[a.type] ?? 99) - (TYPE_PRIORITY[b.type] ?? 99));
      if (pending.length) console.log('[flow-worker] ' + pending.length + ' actionable, ' + activeIds.size + ' active');
      for (const req of pending) { activeIds.add(req.id); processOne(req).finally(() => activeIds.delete(req.id)); }
    } catch (e) { console.error('[flow-worker] Loop error:', e.message); }
    await sleep(POLL_INTERVAL_S * 1000);
  }
}

async function processOne(req) {
  try {
    await prisma.flowRequest.update({ where: { id: req.id }, data: { status: 'PROCESSING' } });
    const userId = 'system'; let result = {};
    if (req.type === 'GENERATE_CHARACTER_IMAGE' || req.type === 'REGENERATE_CHARACTER_IMAGE') {
      const ch = await prisma.flowCharacter.findUnique({ where: { id: req.characterId } });
      result = ch ? await generateReferenceImage(userId, ch, req.projectId) : { error: 'Character not found' };
      if (result.mediaId) await prisma.flowCharacter.update({ where: { id: req.characterId }, data: { mediaId: result.mediaId, referenceImageUrl: result.outputUrl || null } });
    } else if (req.type === 'GENERATE_IMAGE' || req.type === 'REGENERATE_IMAGE') {
      const sc = await prisma.flowScene.findUnique({ where: { id: req.sceneId } });
      if (!sc) result = { error: 'Scene not found' };
      else {
        const charNames = (sc.characterNames || []);
        const chars = await prisma.flowCharacter.findMany({ where: { projectId: req.projectId } });
        const mediaIds = chars.filter(c => charNames.some(n => n.toLowerCase() === c.slug?.toLowerCase() || n.toLowerCase() === c.name?.toLowerCase())).map(c => c.mediaId).filter(Boolean);
        result = await generateSceneImage(userId, sc, req.projectId, req.orientation || 'VERTICAL', 'PAYGATE_TIER_TWO', mediaIds);
      }
      if (result.mediaId) { const pfx = req.orientation === 'HORIZONTAL' ? 'horizontal' : 'vertical'; await prisma.flowScene.update({ where: { id: req.sceneId }, data: { [pfx + 'ImageMediaId']: result.mediaId, [pfx + 'ImageUrl']: result.outputUrl || null } }); }
    } else if (req.type === 'GENERATE_VIDEO' || req.type === 'REGENERATE_VIDEO') {
      const sc = await prisma.flowScene.findUnique({ where: { id: req.sceneId } });
      if (!sc) result = { error: 'Scene not found' };
      else {
        const pfx = req.orientation === 'HORIZONTAL' ? 'horizontal' : 'vertical';
        const imgMid = sc[pfx + 'ImageMediaId'];
        result = imgMid ? await generateSceneVideo(userId, { ...sc, _project_id: req.projectId }, imgMid, sc[pfx + 'EndSceneMediaId'] || null, req.orientation || 'VERTICAL') : { error: 'No image for scene' };
      }
    } else if (req.type === 'GENERATE_VIDEO_REFS') {
      const sc = await prisma.flowScene.findUnique({ where: { id: req.sceneId } });
      const entities = await prisma.flowCharacter.findMany({ where: { projectId: req.projectId } });
      result = sc ? await generateSceneVideoRefs(userId, { ...sc, _project_id: req.projectId }, entities, sc[(req.orientation === 'HORIZONTAL' ? 'horizontal' : 'vertical') + 'EndSceneMediaId'] || null, req.orientation || 'VERTICAL') : { error: 'Scene not found' };
    } else { result = { error: 'Unknown type: ' + req.type }; }

    if (result.error) {
      const nextRetry = req.retryCount + 1 < MAX_RETRIES ? new Date(Date.now() + Math.min(Math.pow(2, req.retryCount) * 10000, 300000)) : null;
      await prisma.flowRequest.update({ where: { id: req.id }, data: { status: nextRetry ? 'PENDING' : 'FAILED', errorMessage: result.error, retryCount: req.retryCount + 1, nextRetryAt: nextRetry } });
      console.warn('[flow-worker] FAILED ' + req.id.slice(0, 8) + ': ' + result.error);
    } else {
      await prisma.flowRequest.update({ where: { id: req.id }, data: { status: 'COMPLETED', mediaId: result.mediaId || result.videoUri || null, outputUrl: result.videoUri || result.outputUrl || null } });
      console.log('[flow-worker] COMPLETED ' + req.id.slice(0, 8));
    }
  } catch (e) { console.error('[flow-worker] Exception:', e.message); await prisma.flowRequest.update({ where: { id: req.id }, data: { status: 'FAILED', errorMessage: e.message } }); }
}
process.on('SIGTERM', () => { shutdown = true; });
process.on('SIGINT', () => { shutdown = true; });
main();
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
