import React from 'react'

export default function UserAvatar({ name, size = 34, src, className = '' }) {
  const initials = (name || 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6',
  ]
  const hash = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const bg = colors[hash % colors.length]

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User'}
        className={`user-avatar ${className}`}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  return (
    <span
      className={`user-avatar user-avatar-initials ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(size * 0.38)}px`,
        fontWeight: 700,
        letterSpacing: '0.5px',
        flexShrink: 0,
      }}
      aria-label={name || 'User'}
    >
      {initials}
    </span>
  )
}
