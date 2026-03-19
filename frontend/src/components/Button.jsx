import React from 'react'
import PropTypes from 'prop-types'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) {
  const baseClasses = 'button'
  const variantClasses = {
    primary: 'gradient',
    secondary: 'secondary',
    outline: 'outline',
    dark: 'dark',
    accent: 'accent'
  }
  const sizeClasses = {
    sm: 'sm',
    md: '',
    lg: 'lg'
  }
  const shapeClasses = {
    rounded: '',
    pill: 'pill'
  }

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    shapeClasses[shape],
    loading && 'loading',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? '⏳ Loading...' : children}
    </button>
  )
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'dark', 'accent']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  shape: PropTypes.oneOf(['rounded', 'pill']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string
}

export function ButtonGroup({ children, direction = 'row' }) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      flexDirection: direction,
      flexWrap: direction === 'row' ? 'wrap' : 'nowrap'
    }}>
      {children}
    </div>
  )
}

ButtonGroup.propTypes = {
  children: PropTypes.node,
  direction: PropTypes.oneOf(['row', 'column'])
}
