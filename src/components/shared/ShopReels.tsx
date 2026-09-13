'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Clapperboard, Play, Sparkles, X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import type { ShopReel } from '@/types'

/**
 * Without a poster the browser has nothing to paint until the video loads, so
 * the card would sit blank. Seeking a hair past the start makes it decode and
 * show frame one while still only fetching metadata.
 */
function cardSource(reel: ShopReel) {
  return reel.poster_url ? reel.video_url : `${reel.video_url}#t=0.1`
}

export function ShopReels({ items }: { items: ShopReel[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef(new Map<string, HTMLVideoElement>())
  const visibleIds = useRef(new Set<string>())
  const [active, setActive] = useState<ShopReel | null>(null)

  /** Cards play only while scrolled into view — never all of them at once. */
  const syncPlayback = useCallback((paused = false) => {
    videoRefs.current.forEach((video, id) => {
      if (!paused && visibleIds.current.has(id)) {
        // Autoplay can still be refused (data saver, battery saver); the
        // poster frame simply stays put, which is a fine resting state.
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }, [])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.reelId
          if (!id) continue
          if (entry.isIntersecting) visibleIds.current.add(id)
          else visibleIds.current.delete(id)
        }
        syncPlayback()
      },
      { threshold: 0.6 }
    )

    const videos = videoRefs.current
    videos.forEach((video) => observer.observe(video))
    return () => observer.disconnect()
  }, [items, syncPlayback])

  // The dialog copy plays with sound; the muted cards behind it would keep
  // burning bandwidth for a strip nobody can see.
  useEffect(() => {
    syncPlayback(Boolean(active))
  }, [active, syncPlayback])

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector('[data-reel-card]')
    const step = card instanceof HTMLElement ? card.offsetWidth + 20 : track.clientWidth * 0.8
    track.scrollBy({ left: step * direction, behavior: 'smooth' })
  }

  if (items.length === 0) return null

  return (
    <section className="bg-cream py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        {/* Same loud maroon-and-gold treatment as the dashboard feedback card:
            a distinct block that reads as "look at this", not another row of
            product tiles. */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-maroon to-maroon-light p-5 shadow-lg md:p-8">
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-gold/10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-gold/10"
            aria-hidden="true"
          />

          <div className="relative flex flex-col items-center text-center">
            <span className="animate-status-glow flex h-12 w-12 items-center justify-center rounded-full bg-gold text-maroon">
              <Clapperboard className="h-5 w-5" />
            </span>
            <h2 className="mt-3 flex items-center gap-1.5 font-gujarati text-2xl font-bold text-cream md:text-3xl">
              અમારી દુકાનની ઝલક
              <Sparkles className="h-4 w-4 text-gold" />
            </h2>
            <p className="mt-1 text-sm text-gold/90">
              Fresh from our kitchen — tap any reel to watch with sound
            </p>
            <OrnamentalDivider size="sm" className="!mt-3 !mb-0" />
          </div>

          <div className="relative mt-6">
            {/* Arrows are a desktop nicety; touch devices just swipe. */}
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => scrollByCard(-1)}
                  aria-label="Previous reels"
                  className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-cream text-maroon shadow-md transition-colors hover:bg-gold md:flex"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByCard(1)}
                  aria-label="More reels"
                  className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-cream text-maroon shadow-md transition-colors hover:bg-gold md:flex"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <div
              ref={trackRef}
              className="scrollbar-thin flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2"
            >
              {items.map((reel) => (
                <button
                  key={reel.id}
                  type="button"
                  data-reel-card
                  onClick={() => setActive(reel)}
                  aria-label={`Play reel: ${reel.title}`}
                  className="group relative aspect-9/16 w-40 shrink-0 snap-center overflow-hidden rounded-2xl bg-maroon-dark ring-2 ring-gold/30 transition-transform hover:scale-[1.02] hover:ring-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:w-44 md:w-48"
                >
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current.set(reel.id, el)
                      else videoRefs.current.delete(reel.id)
                    }}
                    data-reel-id={reel.id}
                    src={cardSource(reel)}
                    poster={reel.poster_url ?? undefined}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    tabIndex={-1}
                    className="h-full w-full object-cover"
                  />

                  {/* Keeps the caption legible over a bright frame. */}
                  <span
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent"
                    aria-hidden="true"
                  />

                  <span
                    className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream/90 text-maroon">
                      <Play className="h-5 w-5 fill-maroon" />
                    </span>
                  </span>

                  <span className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-left">
                    <span className="line-clamp-2 block font-serif text-sm font-bold leading-tight text-cream">
                      {reel.title}
                    </span>
                    {reel.caption && (
                      <span className="mt-0.5 line-clamp-1 block text-[11px] text-cream/70">
                        {reel.caption}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        {/* The stock close button is a ghost button in the default dark
            foreground colour — invisible against this maroon popup — so it is
            replaced with one that reads on it. */}
        <DialogContent showCloseButton={false} className="border-0 bg-maroon-dark p-3 sm:max-w-md">
          <DialogClose
            aria-label="Close video"
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-cream/15 text-gold transition-colors hover:bg-cream/25"
          >
            <X className="h-4 w-4" />
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="font-serif text-base text-gold">{active?.title}</DialogTitle>
            {active?.caption ? (
              <DialogDescription className="text-cream/70">{active.caption}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">
                Video from Patel Farsan
              </DialogDescription>
            )}
          </DialogHeader>
          {active && (
            <video
              // Keyed by reel so switching reels remounts the player instead
              // of leaving the previous clip's buffered state behind.
              key={active.id}
              src={active.video_url}
              poster={active.poster_url ?? undefined}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[70vh] w-full rounded-xl bg-black object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
