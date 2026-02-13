// Password hashing using Argon2id
// Configuration from SECURITY_GUIDELINES.md
import * as argon2 from 'argon2'

// Argon2id parameters from SECURITY_GUIDELINES.md
const ARGON2_PARAMS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
  type: argon2.argon2id
}

export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, ARGON2_PARAMS)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return await argon2.verify(hash, password)
}

export async function generateSecurePasswordHash(password: string): Promise<{ hash: string }> {
  const hash = await hashPassword(password)
  return { hash }
}

// Password validation according to requirements
export function validatePasswordStrength(password: string): { valid: boolean, message?: string } {
  const minLength = 14
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  
  if (password.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters long` }
  }
  
  if (!hasUppercase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  
  if (!hasLowercase) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }
  
  if (!hasNumber) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  
  if (!hasSymbol) {
    return { valid: false, message: 'Password must contain at least one symbol' }
  }
  
  return { valid: true }
}