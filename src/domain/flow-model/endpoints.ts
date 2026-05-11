export const ENDPOINTS: Record<string, string> = {
  generateImages: '/v1/projects/{projectId}/flowMedia:batchGenerateImages',
  generateVideo: '/v1/video:batchAsyncGenerateVideoStartImage',
  generateVideoStartEnd: '/v1/video:batchAsyncGenerateVideoStartAndEndImage',
  generateVideoReferences: '/v1/video:batchAsyncGenerateVideoReferenceImages',
  generateVideoText: '/v1/video:batchAsyncGenerateVideoText',
  upscaleVideo: '/v1/video:batchAsyncGenerateVideoUpsampleVideo',
  uploadImage: '/v1/flow/uploadImage',
  checkVideoStatus: '/v1/video:batchCheckAsyncVideoGenerationStatus',
  getCredits: '/v1/credits',
  getMedia: '/v1/media/{mediaId}',
};
import { GOOGLE_FLOW_API, GOOGLE_API_KEY } from './models.js';
export function buildApiUrl(endpointKey: string, params?: { projectId?: string; mediaId?: string }): string {
  let path = ENDPOINTS[endpointKey];
  if (!path) throw new Error('Unknown endpoint: ' + endpointKey);
  if (params?.projectId) path = path.replace('{projectId}', params.projectId);
  if (params?.mediaId) path = path.replace('{mediaId}', params.mediaId);
  const sep = path.includes('?') ? '&' : '?';
  return GOOGLE_FLOW_API + path + sep + 'key=' + GOOGLE_API_KEY;
}
