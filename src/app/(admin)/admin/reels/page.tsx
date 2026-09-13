'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUp, Clapperboard, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Toggle } from '@/components/admin/Toggle'
import { createClient } from '@/lib/supabase/client'
import {
  REEL_BUCKET,
  REEL_POSTER_ACCEPT,
  REEL_POSTER_MAX_SIZE,
  REEL_POSTER_TYPE_MESSAGE,
  REEL_POSTER_TYPES,
  REEL_VIDEO_ACCEPT,
  REEL_VIDEO_MAX_SIZE,
  REEL_VIDEO_TYPE_MESSAGE,
  REEL_VIDEO_TYPES,
  type ReelUploadKind,
} from '@/lib/reels'
import type { ShopReel } from '@/types'

const EMPTY_FORM = { title: '', caption: '' }

/**
 * Two-step upload: the server hands back a signed URL, the browser sends the
 * bytes straight to storage. Large videos would never survive a round trip
 * through a serverless route body.
 */
async function uploadFile(file: File, kind: ReelUploadKind) {
  const res = await fetch('/api/admin/reels/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, contentType: file.type, size: file.size }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Could not start the upload.')

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(REEL_BUCKET)
    .uploadToSignedUrl(data.path, data.token, file, { contentType: file.type })
  if (error) throw new Error(error.message)

  return { url: data.publicUrl as string, path: data.path as string }
}

export default function AdminReelsPage() {
  const [reels, setReels] = useState<ShopReel[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ShopReel | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ShopReel | null>(null)
  const [saving, setSaving] = useState(false)

  // Local previews are object URLs; they leak until revoked, and a shop owner
  // trying a few clips in one sitting would pile them up.
  const objectUrls = useRef<string[]>([])
  useEffect(() => {
    const urls = objectUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function trackObjectUrl(file: File) {
    const url = URL.createObjectURL(file)
    objectUrls.current.push(url)
    return url
  }

  async function loadReels() {
    const res = await fetch('/api/admin/reels')
    const data = await res.json()
    setReels(data.reels ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadReels()
  }, [])

  function resetForm() {
    setForm(EMPTY_FORM)
    setVideoFile(null)
    setVideoPreview(null)
    setPosterFile(null)
    setPosterPreview(null)
  }

  function openAdd() {
    setEditing(null)
    resetForm()
    setFormOpen(true)
  }

  function openEdit(reel: ShopReel) {
    setEditing(reel)
    setForm({ title: reel.title, caption: reel.caption ?? '' })
    setVideoFile(null)
    setVideoPreview(reel.video_url)
    setPosterFile(null)
    setPosterPreview(reel.poster_url)
    setFormOpen(true)
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!(file.type in REEL_VIDEO_TYPES)) {
      toast.error(REEL_VIDEO_TYPE_MESSAGE)
      return
    }
    if (file.size > REEL_VIDEO_MAX_SIZE) {
      toast.error('Video must be 50MB or smaller. Try trimming it first.')
      return
    }
    setVideoFile(file)
    setVideoPreview(trackObjectUrl(file))
  }

  function handlePosterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!(file.type in REEL_POSTER_TYPES)) {
      toast.error(REEL_POSTER_TYPE_MESSAGE)
      return
    }
    if (file.size > REEL_POSTER_MAX_SIZE) {
      toast.error('Cover image must be 2MB or smaller.')
      return
    }
    setPosterFile(file)
    setPosterPreview(trackObjectUrl(file))
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('Give the reel a title.')
      return
    }
    if (!editing && !videoFile) {
      toast.error('Choose a video to upload.')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        caption: form.caption.trim(),
      }

      if (videoFile) {
        const video = await uploadFile(videoFile, 'video')
        payload.video_url = video.url
        payload.video_path = video.path
      }
      if (posterFile) {
        const poster = await uploadFile(posterFile, 'poster')
        payload.poster_url = poster.url
        payload.poster_path = poster.path
      }

      const res = await fetch('/api/admin/reels', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(editing ? 'Reel updated.' : 'Reel added to the homepage.')
      setFormOpen(false)
      resetForm()
      loadReels()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the reel.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(reel: ShopReel) {
    const res = await fetch('/api/admin/reels', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reel.id, is_active: !reel.is_active }),
    })
    if (res.ok) {
      setReels((prev) =>
        prev.map((r) => (r.id === reel.id ? { ...r, is_active: !r.is_active } : r))
      )
    } else {
      toast.error('Could not update the reel.')
    }
  }

  async function handleMove(reel: ShopReel, direction: 'up' | 'down') {
    const index = reels.findIndex((r) => r.id === reel.id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= reels.length) return

    const other = reels[swapIndex]
    await Promise.all([
      fetch('/api/admin/reels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reel.id, display_order: other.display_order }),
      }),
      fetch('/api/admin/reels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: other.id, display_order: reel.display_order }),
      }),
    ])
    loadReels()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/reels?id=${deleteTarget.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Could not delete the reel.')
    } else {
      setReels((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      toast.success('Reel deleted.')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-maroon">Shop Reels</h1>
          <p className="mt-1 text-sm text-stone-500">
            Short videos shown on the homepage. Switched-on reels appear in order, left to right.
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add Reel
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-stone-400">Loading…</p>
      ) : reels.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <Clapperboard className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 font-serif font-bold text-maroon">No reels yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Add a short vertical video of the shop — it shows up on the homepage right away.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {reels.map((reel, i) => (
            <div
              key={reel.id}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white"
            >
              <div className="relative aspect-9/16 bg-stone-900">
                <video
                  src={reel.poster_url ? reel.video_url : `${reel.video_url}#t=0.1`}
                  poster={reel.poster_url ?? undefined}
                  muted
                  playsInline
                  preload="metadata"
                  controls
                  className="h-full w-full object-cover"
                />
                {!reel.is_active && (
                  <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-stone-900/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Hidden
                  </span>
                )}
              </div>

              <div className="p-3">
                <p className="truncate font-serif text-sm font-bold text-maroon">{reel.title}</p>
                {reel.caption && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{reel.caption}</p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Toggle
                    checked={reel.is_active}
                    onChange={() => toggleActive(reel)}
                    label={`${reel.is_active ? 'Hide' : 'Show'} reel ${reel.title}`}
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleMove(reel, 'up')}
                      disabled={i === 0}
                      aria-label={`Move ${reel.title} earlier`}
                      className="text-stone-400 hover:text-maroon disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMove(reel, 'down')}
                      disabled={i === reels.length - 1}
                      aria-label={`Move ${reel.title} later`}
                      className="text-stone-400 hover:text-maroon disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEdit(reel)}
                      aria-label={`Edit ${reel.title}`}
                      className="text-maroon hover:text-maroon-light"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(reel)}
                      aria-label={`Delete ${reel.title}`}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-maroon">{editing ? 'Edit Reel' : 'Add Reel'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={80}
                placeholder="Fresh jalebi, 6am"
                className="input-base"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Caption <span className="text-stone-400">(optional)</span>
              </label>
              <input
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                maxLength={200}
                className="input-base"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Video {editing && <span className="text-stone-400">(leave empty to keep current)</span>}
              </label>
              <label className="flex aspect-9/16 max-h-64 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-stone-900">
                {videoPreview ? (
                  <video
                    src={videoPreview}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-stone-400">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">MP4, up to 50MB</span>
                  </span>
                )}
                <input
                  type="file"
                  accept={REEL_VIDEO_ACCEPT}
                  onChange={handleVideoChange}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-xs text-stone-400">
                Vertical videos look best — the homepage shows them in a phone-shaped card.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Cover Image <span className="text-stone-400">(optional)</span>
              </label>
              <label className="flex h-24 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-stone-300 bg-cream">
                {posterPreview ? (
                  <Image
                    src={posterPreview}
                    alt="Cover preview"
                    width={64}
                    height={96}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Upload className="h-4 w-4 text-stone-400" />
                )}
                <input
                  type="file"
                  accept={REEL_POSTER_ACCEPT}
                  onChange={handlePosterChange}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-xs text-stone-400">
                Without one, the video&apos;s first frame is used.
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Uploading…' : editing ? 'Save Changes' : 'Add Reel'}
            </button>
            {saving && (
              <p className="text-center text-xs text-stone-400">
                Large videos take a moment — please keep this window open.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-maroon">Delete {deleteTarget?.title}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            The video file is removed too. This cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <DialogClose nativeButton={false} render={<button className="btn-outline">Cancel</button>} />
            <button
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
