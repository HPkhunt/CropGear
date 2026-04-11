import { Toaster as Sonner } from 'sonner'

const toastClassNames = {
  toast: 'rounded-[24px] border border-slate-200 bg-white text-slate-950 shadow-2xl shadow-slate-200/70',
  title: 'text-sm font-semibold text-slate-950',
  description: 'text-sm leading-6 text-slate-600',
  content: 'gap-1',
  icon: 'text-current',
  closeButton: 'border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700',
  actionButton: 'bg-primary-600 text-white transition hover:bg-primary-700',
  cancelButton: 'bg-slate-100 text-slate-700 transition hover:bg-slate-200',
  success: 'border-primary-200 bg-[linear-gradient(180deg,rgba(240,253,244,0.98),rgba(255,255,255,0.98))]',
  error: 'border-rose-200 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,255,255,0.98))]',
  info: 'border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(255,255,255,0.98))]',
  warning: 'border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))]',
}

export function Toaster({ toastOptions, ...props }) {
  return (
    <Sonner
      closeButton
      expand={false}
      position="top-right"
      theme="light"
      visibleToasts={4}
      toastOptions={{
        duration: 5000,
        ...toastOptions,
        classNames: {
          ...toastClassNames,
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}
