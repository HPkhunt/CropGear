export const PASSWORD_POLICY_MESSAGE = 'Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.'

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (password) => password.length >= 8 },
  { label: 'Uppercase letter', test: (password) => /[A-Z]/.test(password) },
  { label: 'Lowercase letter', test: (password) => /[a-z]/.test(password) },
  { label: 'Number', test: (password) => /\d/.test(password) },
  { label: 'Special character', test: (password) => /[^A-Za-z0-9]/.test(password) }
]

export function getPasswordChecks(password) {
  const value = String(password || '')
  return PASSWORD_RULES.map((rule) => ({
    label: rule.label,
    ok: rule.test(value)
  }))
}

export function isPasswordPolicySatisfied(password) {
  return getPasswordChecks(password).every((check) => check.ok)
}
