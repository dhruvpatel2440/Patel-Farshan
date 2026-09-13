/**
 * Upload limits for shop reels, shared by the admin uploader and the route
 * that mints signed upload URLs.
 *
 * These are a courtesy check so the admin gets a clear message before a long
 * upload, not the security boundary — the bucket itself pins the same size
 * and MIME list (see 0019_shop_reels.sql), because the browser uploads
 * straight to storage and states its own content type.
 */

export const REEL_VIDEO_TYPES = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
} as const

export const REEL_POSTER_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

export const REEL_VIDEO_MAX_SIZE = 50 * 1024 * 1024
export const REEL_POSTER_MAX_SIZE = 2 * 1024 * 1024

export const REEL_VIDEO_ACCEPT = Object.keys(REEL_VIDEO_TYPES).join(',')
export const REEL_POSTER_ACCEPT = Object.keys(REEL_POSTER_TYPES).join(',')

export const REEL_BUCKET = 'shop-reels'

export type ReelUploadKind = 'video' | 'poster'

/** Same message in the browser and from the server, so they can't drift. */
export const REEL_VIDEO_TYPE_MESSAGE =
  'Please choose an MP4 video. (Videos from WhatsApp, Instagram and most phones already are.)'
export const REEL_POSTER_TYPE_MESSAGE = 'The cover image must be a JPEG, PNG or WebP.'
