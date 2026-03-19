import React from 'react'
import PropTypes from 'prop-types'

export function Card({ children, className = '', onClick, ...props }) {
  return (
    <div className={`card ${className}`} onClick={onClick} {...props}>
      {children}
    </div>
  )
}

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  onClick: PropTypes.func
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`card-header ${className}`} style={{ marginBottom: 16 }}>
      {children}
    </div>
  )
}

CardHeader.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={`card-body ${className}`}>
      {children}
    </div>
  )
}

CardBody.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`card-footer ${className}`} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
      {children}
    </div>
  )
}

CardFooter.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: '#10b981',
    success: '#059669',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  }

  return (
    <span className={`badge ${className}`} style={{ 
      background: `linear-gradient(135deg, ${variants[variant]}15 0%, ${variants[variant]}08 100%)`,
      borderColor: `${variants[variant]}30`,
      color: variants[variant]
    }}>
      {children}
    </span>
  )
}

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'success', 'warning', 'error', 'info']),
  className: PropTypes.string
}

export function Alert({ children, type = 'info', icon = null, className = '' }) {
  const types = {
    info: { bg: '#e0f2fe', border: '#0284c7', text: '#0c4a6e' },
    success: { bg: '#e6ffed', border: '#059669', text: '#064e3b' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#78350f' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' }
  }

  const style = types[type]

  return (
    <div className={`alert ${className}`} style={{
      background: style.bg,
      border: `2px solid ${style.border}`,
      borderRadius: 12,
      padding: 16,
      color: style.text,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }}>
      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      <div>{children}</div>
    </div>
  )
}

Alert.propTypes = {
  children: PropTypes.node,
  type: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  icon: PropTypes.node,
  className: PropTypes.string
}
