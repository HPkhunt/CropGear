import React, { useMemo, useState } from 'react'

function buildInlineFallback(label = 'CropGear') {
  const safeLabel = encodeURIComponent(label)
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='720' viewBox='0 0 1200 720'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%230f172a'/><stop offset='100%' stop-color='%231f7a4c'/></linearGradient></defs><rect width='1200' height='720' fill='url(%23g)'/><circle cx='930' cy='140' r='170' fill='%23ffffff' fill-opacity='0.08'/><circle cx='240' cy='600' r='220' fill='%23ffffff' fill-opacity='0.06'/><text x='50%' y='50%' fill='%23d9fbe8' font-size='72' font-family='Arial, sans-serif' dominant-baseline='middle' text-anchor='middle'>${safeLabel}</text></svg>`
}

export default function SmartImage({
  src,
  fallbackSrc = 'https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=600&auto=format&fit=crop',
  alt = '',
  labelForFallback = 'CropGear',
  ...props
}) {
  const inlineFallback = useMemo(() => buildInlineFallback(labelForFallback), [labelForFallback])
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc || inlineFallback)
  const [tries, setTries] = useState(0)

  const onError = () => {
    if (tries === 0 && fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setTries(1)
      return
    }
    if (currentSrc !== inlineFallback) {
      setCurrentSrc(inlineFallback)
      setTries(2)
    }
  }

  return <img {...props} src={currentSrc} alt={alt} onError={onError} />
}
