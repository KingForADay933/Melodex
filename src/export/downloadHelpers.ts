export function sanitizeFilename(name: string): string {
  const cleaned = name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')
  return cleaned.length > 0 ? cleaned : 'chord-sketch'
}

/** Triggers a browser download for a Blob. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
