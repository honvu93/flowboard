export const GOOGLE_FLOW_API = 'https://aisandbox-pa.googleapis.com';
export const GOOGLE_API_KEY = 'AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY';
export const IMAGE_MODELS = { NANO_BANANA_PRO: 'GEM_PIX_2', NANO_BANANA_2: 'NARWHAL' } as const;
export const VIDEO_MODELS = {
  PAYGATE_TIER_TWO: {
    frame_2_video: { VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_i2v_lite_low_priority', VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_i2v_lite_low_priority', VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_i2v_lite_low_priority' },
    start_end_frame_2_video: { VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_i2v_lite_low_priority', VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_i2v_lite_low_priority', VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_i2v_lite_low_priority' },
    reference_frame_2_video: { VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_r2v_fast_landscape_ultra_relaxed', VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_r2v_fast_landscape_ultra_relaxed', VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_r2v_fast_landscape_ultra_relaxed' },
    text_2_video: { VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_t2v_fast_ultra_relaxed', VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_t2v_fast_ultra_relaxed', VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_t2v_fast_ultra_relaxed' },
  },
  PAYGATE_TIER_ONE: {
    frame_2_video: { VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_i2v_s_fast', VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_i2v_s_fast_portrait', VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_i2v_s_fast' },
    start_end_frame_2_video: { VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_i2v_s_fast_fl', VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_i2v_s_fast_portrait_fl', VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_i2v_s_fast_fl' },
    reference_frame_2_video: { VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_r2v_fast', VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_r2v_fast_portrait', VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_r2v_fast' },
    text_2_video: { VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_t2v_fast', VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_t2v_fast', VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_t2v_fast' },
  },
} as const;
export const UPSCALE_MODELS = { VIDEO_RESOLUTION_4K: 'veo_3_1_upsampler_4k', VIDEO_RESOLUTION_1080P: 'veo_3_1_upsampler_1080p' } as const;

export type PaygateTier = keyof typeof VIDEO_MODELS;
export type VideoGenType = keyof typeof VIDEO_MODELS['PAYGATE_TIER_TWO'];
export type VideoAspectRatio = 'VIDEO_ASPECT_RATIO_LANDSCAPE' | 'VIDEO_ASPECT_RATIO_PORTRAIT' | 'VIDEO_ASPECT_RATIO_SQUARE';
export type VideoResolution = keyof typeof UPSCALE_MODELS;

export function getVideoModelKey(tier: PaygateTier, genType: VideoGenType, ratio: VideoAspectRatio): string | null {
  const t = VIDEO_MODELS[tier] as Record<string, Record<string, string>> | undefined;
  return t?.[genType]?.[ratio] ?? null;
}
export function getUpscaleModelKey(resolution: VideoResolution): string { return UPSCALE_MODELS[resolution]; }
