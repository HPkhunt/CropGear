export function formatCurrency(amount) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(amount || 0))
}

export function getErrorMessage(error, fallback = 'Something went wrong.') {
  if (error?.response?.data?.error) return error.response.data.error
  if (error?.response?.data?.detail) return error.response.data.detail
  if (error?.message) return error.message
  return fallback
}
