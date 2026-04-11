import { describe, expect, it } from 'vitest'
import {
  PASSWORD_POLICY_MESSAGE,
  getPasswordChecks,
  isPasswordPolicySatisfied
} from './passwordPolicy.js'

describe('passwordPolicy', () => {
  it('accepts a strong password that satisfies every rule', () => {
    expect(isPasswordPolicySatisfied('StrongPass1!')).toBe(true)
    expect(getPasswordChecks('StrongPass1!')).toEqual([
      { label: 'At least 8 characters', ok: true },
      { label: 'Uppercase letter', ok: true },
      { label: 'Lowercase letter', ok: true },
      { label: 'Number', ok: true },
      { label: 'Special character', ok: true }
    ])
  })

  it('reports exactly which password requirements are missing', () => {
    expect(PASSWORD_POLICY_MESSAGE).toContain('at least 8 characters')
    expect(isPasswordPolicySatisfied('weak')).toBe(false)
    expect(getPasswordChecks('weak')).toEqual([
      { label: 'At least 8 characters', ok: false },
      { label: 'Uppercase letter', ok: false },
      { label: 'Lowercase letter', ok: true },
      { label: 'Number', ok: false },
      { label: 'Special character', ok: false }
    ])
  })
})
