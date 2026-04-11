import React from 'react'
import PropTypes from 'prop-types'
import { CircleAlert } from 'lucide-react'

export function TextField({ 
  label, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  error, 
  required = false,
  disabled = false,
  icon = null,
  ...props 
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 8,
          color: error ? '#ef4444' : '#1a202c'
        }}>
          {label}
          {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: 16,
            fontSize: 18,
            pointerEvents: 'none'
          }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: '100%',
            padding: icon ? '12px 16px 12px 44px' : '12px 16px',
            border: error ? '2px solid #ef4444' : '2px solid #e2e8f0',
            borderRadius: 10,
            fontSize: 14,
            fontFamily: 'inherit',
            transition: 'all 0.3s ease',
            background: disabled ? '#f5f5f5' : 'white'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : '#10b981'
            e.target.style.boxShadow = error ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(16,185,129,0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0'
            e.target.style.boxShadow = 'none'
          }}
          {...props}
        />
      </div>
      {error && (
        <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CircleAlert size={14} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

TextField.propTypes = {
  label: PropTypes.string,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: PropTypes.node
}

export function TextArea({
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  rows = 4,
  disabled = false,
  ...props
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 8,
          color: error ? '#ef4444' : '#1a202c'
        }}>
          {label}
          {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: error ? '2px solid #ef4444' : '2px solid #e2e8f0',
          borderRadius: 10,
          fontSize: 14,
          fontFamily: 'inherit',
          transition: 'all 0.3s ease',
          resize: 'vertical',
          background: disabled ? '#f5f5f5' : 'white'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = error ? '#ef4444' : '#10b981'
          e.target.style.boxShadow = error ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(16,185,129,0.1)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0'
          e.target.style.boxShadow = 'none'
        }}
        {...props}
      />
      {error && (
        <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CircleAlert size={14} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

TextArea.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
  required: PropTypes.bool,
  rows: PropTypes.number,
  disabled: PropTypes.bool
}

export function Select({
  label,
  options = [],
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder = 'Select an option',
  ...props
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 8,
          color: error ? '#ef4444' : '#1a202c'
        }}>
          {label}
          {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: error ? '2px solid #ef4444' : '2px solid #e2e8f0',
          borderRadius: 10,
          fontSize: 14,
          fontFamily: 'inherit',
          transition: 'all 0.3s ease',
          background: disabled ? '#f5f5f5' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CircleAlert size={14} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

Select.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string,
      label: PropTypes.string
    })
  ),
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string
}

export function Checkbox({ label, checked, onChange, disabled = false, ...props }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      marginBottom: 12
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: 20,
          height: 20,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        {...props}
      />
      <span style={{ fontSize: 14, color: disabled ? '#9ca3af' : '#1a202c' }}>
        {label}
      </span>
    </label>
  )
}

Checkbox.propTypes = {
  label: PropTypes.node,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool
}

export function Form({ children, onSubmit, className = '', ...props }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.(e)
      }}
      className={className}
      style={{
        maxWidth: 600,
        margin: '0 auto'
      }}
      {...props}
    >
      {children}
    </form>
  )
}

Form.propTypes = {
  children: PropTypes.node,
  onSubmit: PropTypes.func,
  className: PropTypes.string
}

export function FormGroup({ children, className = '' }) {
  return (
    <div className={`form-group ${className}`} style={{ marginBottom: 16 }}>
      {children}
    </div>
  )
}

FormGroup.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
}
