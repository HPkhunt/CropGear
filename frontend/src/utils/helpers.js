export function formatCurrency(amount) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(amount || 0))
}

function getProviderErrorPayload(error) {
  const payload = error?.response?.data
  if (payload?.error && typeof payload.error === 'object') return payload.error
  if (payload?.detail && typeof payload.detail === 'object') return payload.detail
  return null
}

function getProviderReason(error) {
  const details = Array.isArray(error?.details) ? error.details : []
  const match = details.find((detail) => typeof detail?.reason === 'string')
  return match?.reason || null
}

export function isRequestCanceled(error) {
  return Boolean(
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'AbortError' ||
    error?.message === 'canceled' ||
    error?.message === 'CanceledError'
  )
}

export function getErrorMessage(error, fallback = 'Something went wrong.') {
  const providerError = getProviderErrorPayload(error)
  const providerReason = getProviderReason(providerError)

  if (providerReason === 'INSUFFICIENT_G1_CREDITS_BALANCE') {
    return 'The connected Google AI account is out of credits. Add billing credits or use another funded API key or project.'
  }

  if (typeof error?.response?.data?.error === 'string') return error.response.data.error
  if (typeof error?.response?.data?.detail === 'string') return error.response.data.detail
  if (typeof providerError?.message === 'string' && providerError.message.trim()) {
    return providerError.message
  }
  if (error?.message) return error.message
  return fallback
}
