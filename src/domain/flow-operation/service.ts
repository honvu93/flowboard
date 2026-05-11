import { sendCommand } from '../flow-bridge/service.js';
import { buildApiUrl } from '../flow-model/endpoints.js';
import { getVideoModelKey, getUpscaleModelKey, IMAGE_MODELS } from '../flow-model/models.js';
import { R2V_MAX_REFS, R2V_ENTITY_PRIORITY, LANDSCAPE_ENTITY_TYPES } from '../flow-model/constants.js';
import { extractOperations, extractMediaId, extractOutputUrl, isError, isUuid, extractUuidFromUrl } from './extract.js';
import { pollOperations } from './poll.js';
import { randomUUID } from 'node:crypto';

function buildClientContext(projectId, tier = 'PAYGATE_TIER_TWO') {
  return { projectId, recaptchaContext: { applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB', token: '' }, sessionId: ';' + Date.now(), tool: 'PINHOLE', userPaygateTier: tier };
}

function refAspect(entityType) { return LANDSCAPE_ENTITY_TYPES.has(entityType) ? 'IMAGE_ASPECT_RATIO_LANDSCAPE' : 'IMAGE_ASPECT_RATIO_PORTRAIT'; }

export async function generateReferenceImage(userId, char, projectId, tier = 'PAYGATE_TIER_TWO') {
  const entityType = char.entityType || 'character';
  // Fast path: has URL but no mediaId — upload only
  if (char.referenceImageUrl && !char.mediaId) {
    const uploadMid = await uploadCharImage(userId, char.name, char.referenceImageUrl, projectId);
    if (uploadMid) return { mediaId: uploadMid };
    const u = extractUuidFromUrl(char.referenceImageUrl); if (u) return { mediaId: u };
    return { error: 'Upload retry failed' };
  }
  const prompt = char.imagePrompt || 'Character reference: ' + char.name + '. ' + (char.description || '');
  const body = { clientContext: buildClientContext(projectId, tier), mediaGenerationContext: { batchId: randomUUID() }, requests: [{ clientContext: { ...buildClientContext(projectId, tier), sessionId: ';' + Date.now() }, seed: Date.now() % 1000000, structuredPrompt: { parts: [{ text: prompt }] }, imageAspectRatio: refAspect(entityType), imageModelName: IMAGE_MODELS.NANO_BANANA_PRO }], useV2ModelConfig: true };
  const resp = await sendCommand('api_request', { url: buildApiUrl('generateImages', { projectId }), method: 'POST', body, captchaAction: 'IMAGE_GENERATION' }, 'generateImages');
  if (!resp.ok) return { error: 'Generate ref failed: ' + resp.status };
  if (isError(resp.data)) return { error: 'Generate ref returned error' };
  const outputUrl = extractOutputUrl(resp.data, 'GENERATE_CHARACTER_IMAGE');
  if (outputUrl) {
    const directMid = extractMediaId(resp.data, 'GENERATE_CHARACTER_IMAGE');
    if (directMid && isUuid(directMid)) return { mediaId: directMid, outputUrl };
    const uploadMid = await uploadCharImage(userId, char.name, outputUrl, projectId);
    if (uploadMid) return { mediaId: uploadMid, outputUrl };
  }
  return { error: 'Could not get mediaId' };
}

async function uploadCharImage(userId, name, imageUrl, projectId) {
  try {
    const resp = await fetch(imageUrl); if (!resp.ok) return null;
    const bytes = Buffer.from(await resp.arrayBuffer());
    const ct = resp.headers.get('content-type') || 'image/jpeg';
    const mime = ct.includes('png') ? 'image/png' : ct.includes('gif') ? 'image/gif' : 'image/jpeg';
    const encoded = bytes.toString('base64');
    const result = await sendCommand('api_request', { url: buildApiUrl('uploadImage'), method: 'POST', body: { imageBytes: encoded, isHidden: false, isUserUploaded: true, mimeType: mime, clientContext: buildClientContext(projectId), mediaGenerationContext: { batchId: randomUUID() }, fileName: name + '.' + mime.split('/')[1] } }, 'uploadImage');
    if (!result.ok) return null;
    return result.data?.data?.media?.name || null;
  } catch { return null; }
}

export async function generateSceneImage(userId, scene, projectId, orientation, tier = 'PAYGATE_TIER_TWO', characterMediaIds) {
  const aspect = orientation === 'VERTICAL' ? 'IMAGE_ASPECT_RATIO_PORTRAIT' : 'IMAGE_ASPECT_RATIO_LANDSCAPE';
  const prompt = scene.imagePrompt || scene.prompt || '';
  const req = { clientContext: { ...buildClientContext(projectId, tier), sessionId: ';' + Date.now() }, seed: Date.now() % 1000000, structuredPrompt: { parts: [{ text: prompt }] }, imageAspectRatio: aspect, imageModelName: IMAGE_MODELS.NANO_BANANA_PRO };
  if (characterMediaIds?.length) req.characterMediaIds = characterMediaIds;
  const body = { clientContext: buildClientContext(projectId, tier), mediaGenerationContext: { batchId: randomUUID() }, requests: [req], useV2ModelConfig: true };
  const resp = await sendCommand('api_request', { url: buildApiUrl('generateImages', { projectId }), method: 'POST', body, captchaAction: 'IMAGE_GENERATION' }, 'generateImages');
  if (!resp.ok) return { error: 'Generate scene image failed: ' + resp.status };
  if (isError(resp.data)) return { error: 'Scene image returned error' };
  const mediaId = extractMediaId(resp.data, 'GENERATE_IMAGE');
  if (!mediaId) return { error: 'No mediaId' };
  return { mediaId, outputUrl: extractOutputUrl(resp.data, 'GENERATE_IMAGE') };
}

export async function generateSceneVideo(userId, scene, imageMediaId, endMediaId, orientation, tier = 'PAYGATE_TIER_TWO') {
  const pid = scene._project_id || '';
  const aspect = orientation === 'VERTICAL' ? 'VIDEO_ASPECT_RATIO_PORTRAIT' : 'VIDEO_ASPECT_RATIO_LANDSCAPE';
  const hasEnd = Boolean(endMediaId);
  const genType = hasEnd ? 'start_end_frame_2_video' : 'frame_2_video';
  const modelKey = getVideoModelKey(tier, genType, aspect);
  if (!modelKey) return { error: 'No video model for tier=' + tier + ' type=' + genType };
  const endpointKey = hasEnd ? 'generateVideoStartEnd' : 'generateVideo';
  const prompt = scene.videoPrompt || scene.prompt || '';
  const req = { aspectRatio: aspect, seed: Math.floor(Date.now() / 1000) % 10000, textInput: { structuredPrompt: { parts: [{ text: prompt }] } }, videoModelKey: modelKey, startImage: { mediaId: imageMediaId }, metadata: { sceneId: scene.id } };
  if (hasEnd) req.endImage = { mediaId: endMediaId };
  const body = { clientContext: buildClientContext(pid, tier), mediaGenerationContext: { batchId: randomUUID() }, requests: [req], useV2ModelConfig: true };
  const resp = await sendCommand('api_request', { url: buildApiUrl(endpointKey), method: 'POST', body, captchaAction: 'VIDEO_GENERATION' }, endpointKey);
  if (!resp.ok) return { error: 'Video submit failed: ' + resp.status };
  if (isError(resp.data)) return { error: 'Video submit returned error' };
  const operations = extractOperations(resp.data); if (!operations.length) return { error: 'No operations' };
  const opName = operations[0]?.operation?.name ?? '';
  const status = operations[0]?.status ?? '';
  if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') return { operationName: opName, videoUri: extractOutputUrl(resp.data, 'GENERATE_VIDEO') };
  if (status === 'MEDIA_GENERATION_STATUS_FAILED') return { error: 'Video failed immediately' };
  console.log('[flow-op] Video submitted, polling ' + operations.length + ' ops...');
  const results = await pollOperations(userId, operations);
  return results[0]?.status === 'SUCCEEDED' ? { operationName: opName, videoUri: results[0].videoUri } : { operationName: opName, error: results[0]?.error || 'Poll failed' };
}

export async function generateSceneVideoRefs(userId, scene, entities, endMediaId, orientation, tier = 'PAYGATE_TIER_TWO') {
  const pid = scene._project_id || '';
  const aspect = orientation === 'VERTICAL' ? 'VIDEO_ASPECT_RATIO_PORTRAIT' : 'VIDEO_ASPECT_RATIO_LANDSCAPE';
  const charNames = Array.isArray(scene.characterNames) ? scene.characterNames : [];
  const refIds = [], seen = new Set();
  if (endMediaId && !seen.has(endMediaId)) { refIds.push(endMediaId); seen.add(endMediaId); }
  const charNameSet = new Set(charNames.map(n => n.toLowerCase().trim()));
  for (const etype of R2V_ENTITY_PRIORITY) {
    if (refIds.length >= R2V_MAX_REFS) break;
    for (const e of entities) {
      if (refIds.length >= R2V_MAX_REFS) break;
      if (e.entityType !== etype || LANDSCAPE_ENTITY_TYPES.has(e.entityType)) continue;
      if (!charNameSet.has(e.slug?.toLowerCase()) && !charNameSet.has(e.name?.toLowerCase())) continue;
      if (e.mediaId && !seen.has(e.mediaId)) { refIds.push(e.mediaId); seen.add(e.mediaId); }
    }
  }
  if (!refIds.length) return { error: 'No valid refs for r2v' };
  const modelKey = getVideoModelKey(tier, 'reference_frame_2_video', aspect);
  if (!modelKey) return { error: 'No r2v model' };
  const prompt = scene.videoPrompt || scene.prompt || '';
  const req = { aspectRatio: aspect, seed: Math.floor(Date.now() / 1000) % 10000, textInput: { structuredPrompt: { parts: [{ text: prompt }] } }, videoModelKey: modelKey, referenceImages: refIds.map(mid => ({ mediaId: mid, imageUsageType: 'IMAGE_USAGE_TYPE_ASSET' })), metadata: {} };
  const body = { clientContext: buildClientContext(pid, tier), mediaGenerationContext: { batchId: randomUUID() }, requests: [req], useV2ModelConfig: true };
  const resp = await sendCommand('api_request', { url: buildApiUrl('generateVideoReferences'), method: 'POST', body, captchaAction: 'VIDEO_GENERATION' }, 'generateVideoReferences');
  if (!resp.ok) return { error: 'R2V submit failed: ' + resp.status };
  const operations = extractOperations(resp.data); if (!operations.length) return { error: 'No operations' };
  const opName = operations[0]?.operation?.name ?? '';
  const status = operations[0]?.status ?? '';
  if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') return { operationName: opName, videoUri: extractOutputUrl(resp.data, 'GENERATE_VIDEO_REFS') };
  if (status === 'MEDIA_GENERATION_STATUS_FAILED') return { error: 'R2V failed immediately' };
  console.log('[flow-op] R2V submitted, polling...');
  const results = await pollOperations(userId, operations);
  return results[0]?.status === 'SUCCEEDED' ? { operationName: opName, videoUri: results[0].videoUri } : { operationName: opName, error: results[0]?.error || 'Poll failed' };
}

export async function generateSceneVideoText(userId, scene, projectId, orientation, tier = 'PAYGATE_TIER_TWO') {
  const aspect = orientation === 'VERTICAL' ? 'VIDEO_ASPECT_RATIO_PORTRAIT' : 'VIDEO_ASPECT_RATIO_LANDSCAPE';
  const modelKey = getVideoModelKey(tier, 'text_2_video', aspect);
  if (!modelKey) return { error: 'No t2v model' };
  const body = { clientContext: buildClientContext(projectId, tier), mediaGenerationContext: { batchId: randomUUID() }, requests: [{ aspectRatio: aspect, seed: Math.floor(Date.now() / 1000) % 10000, textInput: { structuredPrompt: { parts: [{ text: scene.prompt }] } }, videoModelKey: modelKey, metadata: { sceneId: scene.id } }], useV2ModelConfig: true };
  return sendCommand('api_request', { url: buildApiUrl('generateVideoText'), method: 'POST', body, captchaAction: 'VIDEO_GENERATION' }, 'generateVideoText');
}
