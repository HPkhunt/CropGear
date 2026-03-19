import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'

/**
 * A premium, responsive Modal component.
 */
const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-container modal-${size}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <header className="modal-header">
                    <h3 id="modal-title">{title}</h3>
                    <button className="modal-close" onClick={onClose} aria-label="Close modal">
                        &times;
                    </button>
                </header>
                <div className="modal-content">
                    {children}
                </div>
                {footer && (
                    <footer className="modal-footer">
                        {footer}
                    </footer>
                )}
            </div>
        </div>,
        document.body
    )
}

export default Modal
