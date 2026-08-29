import { unstable_cache } from 'next/cache'
import type { GoogleReview } from '@/types'

/**
 * Reviews from the shop's Google Business Profile, via the Places API (New).
 *
 * Two hard limits from Google's side, not something fixable here:
 *  - the API returns at most 5 reviews — Google's own "most relevant" picks,
 *    not the full list, and there is no parameter to request more or to page
 *    through them.
 *  - Google's ToS caps how long review content may be cached (30 days); a
 *    24h revalidate keeps this comfortably inside that and reasonably fresh.
 *
 * Fails soft to an empty result — same convention as the rest of this file —
 * so a missing/invalid key never breaks the pages that render this.
 */

export const GOOGLE_REVIEWS_TAG = 'google-reviews'

export interface GooglePlaceReviews {
  reviews: GoogleReview[]
  rating: number | null
  totalReviews: number | null
  mapsUrl: string | null
}

const EMPTY: GooglePlaceReviews = { reviews: [], rating: null, totalReviews: null, mapsUrl: null }

interface PlacesApiResponse {
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  reviews?: {
    rating: number
    text?: { text: string }
    authorAttribution?: { displayName?: string; photoUri?: string }
    relativePublishTimeDescription?: string
    publishTime?: string
  }[]
}

export const getGoogleReviews = unstable_cache(
  async (): Promise<GooglePlaceReviews> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    const placeId = process.env.GOOGLE_PLACE_ID
    if (!apiKey || !placeId) return EMPTY

    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews',
        },
      })
      if (!res.ok) return EMPTY

      const data: PlacesApiResponse = await res.json()

      const reviews: GoogleReview[] = (data.reviews ?? []).map((r, i) => ({
        id: `${r.publishTime ?? i}-${i}`,
        authorName: r.authorAttribution?.displayName || 'Google User',
        authorPhotoUrl: r.authorAttribution?.photoUri || null,
        rating: r.rating,
        text: r.text?.text ?? '',
        relativeTime: r.relativePublishTimeDescription ?? '',
        time: r.publishTime ? new Date(r.publishTime).getTime() : 0,
      }))

      return {
        reviews,
        rating: data.rating ?? null,
        totalReviews: data.userRatingCount ?? null,
        mapsUrl: data.googleMapsUri ?? null,
      }
    } catch {
      return EMPTY
    }
  },
  ['google-reviews'],
  { revalidate: 60 * 60 * 24, tags: [GOOGLE_REVIEWS_TAG] }
)
