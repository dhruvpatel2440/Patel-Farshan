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
import { cn } from '@/lib/utils'
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
  const [activeIndex, setActiveIndex] = useState(0)
  const [active, setActive] = useState<ShopReel | null>(null)

  /** Only the centred reel plays — never the half-visible ones beside it. */
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

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement
          const id = el.dataset.reelId
          if (!id) continue
          if (entry.isIntersecting) {
            visibleIds.current.add(id)
            // The neighbours only ever peek past the edges, so whatever
            // clears this threshold is the one sitting in the middle.
            setActiveIndex(Number(el.dataset.reelIndex))
          } else {
            visibleIds.current.delete(id)
          }
        }
        if (!reduceMotion) syncPlayback()
      },
      { threshold: 0.6 }
    )

    const videos = videoRefs.current
    videos.forEach((video) => observer.observe(video))
    return () => observer.disconnect()
  }, [items, syncPlayback])

  // The dialog copy plays with sound; the muted card behind it would keep
  // burning bandwidth for a strip nobody can see.
  useEffect(() => {
    syncPlayback(Boolean(active))
  }, [active, syncPlayback])

  function scrollToIndex(index: number) {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelectorAll('[data-reel-card]')[index]
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
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
              Fresh from our kitchen — tap to watch with sound
            </p>
            <OrnamentalDivider size="sm" className="!mt-3 !mb-0" />
          </div>

          <div className="relative mt-6">
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
                  disabled={activeIndex === 0}
                  aria-label="Previous reel"
                  className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream text-maroon shadow-md transition-colors hover:bg-gold disabled:opacity-30 md:flex"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToIndex(Math.min(activeIndex + 1, items.length - 1))}
                  disabled={activeIndex === items.length - 1}
                  aria-label="Next reel"
                  className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream text-maroon shadow-md transition-colors hover:bg-gold disabled:opacity-30 md:flex"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* One big reel at a time with its neighbours peeking past the
                edges, so it reads as a swipeable stack rather than a row of
                thumbnails. The negative margins let it run to the edge of the
                maroon block; the side padding is what lets the first and last
                reel still settle in the centre. */}
            <div
              ref={trackRef}
              className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[11vw] pb-1 md:-mx-8 md:gap-6 md:px-[calc(50%_-_11rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.map((reel, index) => (
                <button
                  key={reel.id}
                  type="button"
                  data-reel-card
                  onClick={() => setActive(reel)}
                  aria-label={`Play reel: ${reel.title}`}
                  className="group relative aspect-9/16 w-[78vw] max-w-[22rem] shrink-0 snap-center overflow-hidden rounded-2xl bg-maroon-dark ring-2 ring-gold/30 transition-shadow hover:ring-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold md:w-[22rem]"
                >
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current.set(reel.id, el)
                      else videoRefs.current.delete(reel.id)
                    }}
                    data-reel-id={reel.id}
                    data-reel-index={index}
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
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream/90 text-maroon">
                      <Play className="h-6 w-6 fill-maroon" />
                    </span>
                  </span>

                  <span className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-left">
                    <span className="line-clamp-2 block font-serif text-base font-bold leading-tight text-cream">
                      {reel.title}
                    </span>
                    {reel.caption && (
                      <span className="mt-0.5 line-clamp-1 block text-xs text-cream/70">
                        {reel.caption}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>

            {items.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                {items.map((reel, index) => (
                  <button
                    key={reel.id}
                    type="button"
                    onClick={() => scrollToIndex(index)}
                    aria-label={`Go to reel ${index + 1}: ${reel.title}`}
                    aria-current={index === activeIndex}
                    className={cn(
                      'h-2 rounded-full transition-all',
                      index === activeIndex ? 'w-6 bg-gold' : 'w-2 bg-cream/30 hover:bg-cream/50'
                    )}
                  />
                ))}
              </div>
            )}
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
              <DialogDescription className="sr-only">Video from Patel Farsan</DialogDescription>
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
