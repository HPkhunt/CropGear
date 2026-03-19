import React, { createContext, useContext, useState, useCallback } from 'react';
import './Toast.css';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast-item toast-${t.type}`}>
                        <div className="toast-icon">
                            {t.type === 'success' && '✅'}
                            {t.type === 'error' && '❌'}
                            {t.type === 'info' && '💡'}
                        </div>
                        <div className="toast-message">{t.message}</div>
                        <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
