import React, { useEffect, useState } from 'react'
import Modal from '../Modal.jsx'
import { getErrorMessage } from '../../utils/helpers.js'

export default function ReviewTextActionModal({
  isOpen,
  onClose,
  title,
  description,
  label = 'Message',
  placeholder = '',
  submitLabel = 'Save',
  initialValue = '',
  minLength = 1,
  maxLength = 1000,
  onSubmit
}) {
  const [value, setValue] = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setValue(initialValue)
    setError('')
  }, [initialValue, isOpen])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    const trimmed = value.trim()
    if (minLength > 0 && trimmed.length < minLength) {
      setError(`${label} must be at least ${minLength} characters.`)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await onSubmit(trimmed)
      onClose()
    } catch (submitError) {
      setError(getErrorMessage(submitError, `Unable to ${submitLabel.toLowerCase()}.`))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={title}
      size="md"
      footer={(
        <>
          <button type="button" className="button outline pill sm" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form="review-text-action-form" className="button secondary pill sm" disabled={submitting}>
            {submitting ? 'Saving...' : submitLabel}
          </button>
        </>
      )}
    >
      <form id="review-text-action-form" className="form-stack review-action-form" onSubmit={handleSubmit}>
        {description && <p className="subtitle">{description}</p>}
        {error && <p className="error-banner">{error}</p>}
        <label>
          {label}
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            rows={5}
            maxLength={maxLength}
          />
        </label>
        <div className="review-action-meta">
          <span>{Math.max(maxLength - value.length, 0)} characters remaining</span>
        </div>
      </form>
    </Modal>
  )
}
