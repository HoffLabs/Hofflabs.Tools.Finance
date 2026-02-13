// AES-256-GCM encryption utilities for browser/Next.js environment
// Configuration from SECURITY_GUIDELINES.md
const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

async function importKey(rawKey: string): Promise<CryptoKey> {
  // Validate key length - AES-256 requires 32 bytes (64 hex characters)
  if (rawKey.length !== 64) {
    throw new Error(`Invalid key length: ${rawKey.length}. AES-256 requires 64 hex characters (32 bytes).`)
  }
  
  // Convert hex string to raw bytes (32 bytes for AES-256)
  const keyBuffer = hexToBuffer(rawKey)
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer as BufferSource,
    ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  )
}

export async function generateMasterKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  )
  const exportedKey = await crypto.subtle.exportKey('raw', key)
  return bufferToHex(exportedKey)
}

export async function generateUserKey(): Promise<string> {
  return generateMasterKey()
}

export async function encryptData(data: string, key: string): Promise<string> {
  const cryptoKey = await importKey(key)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  
  const encodedData = new TextEncoder().encode(data)
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv.buffer as ArrayBuffer,
    },
    cryptoKey,
    encodedData
  )
  
  return `${bufferToHex(iv.buffer)}:${bufferToHex(encrypted)}`
}

export async function decryptData(encryptedData: string, key: string): Promise<string> {
  const parts = encryptedData.split(':')
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format')
  }
  
  const iv = hexToBuffer(parts[0])
  const ciphertext = hexToBuffer(parts[1])
  
  const cryptoKey = await importKey(key)
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv.buffer as ArrayBuffer,
    },
    cryptoKey,
    ciphertext.buffer as ArrayBuffer
  )
  
  return new TextDecoder().decode(decrypted)
}

export async function encryptUserKey(userKey: string, masterKey: string): Promise<string> {
  return encryptData(userKey, masterKey)
}

export async function decryptUserKey(encryptedUserKey: string, masterKey: string): Promise<string> {
  return decryptData(encryptedUserKey, masterKey)
}

// Helper functions
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.prototype.map.call(new Uint8Array(buffer), (x: number) => 
    ('00' + x.toString(16)).slice(-2)
  ).join('')
}

function hexToBuffer(hexString: string): Uint8Array {
  const bytes = new Uint8Array(hexString.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16)
  }
  return bytes
}
