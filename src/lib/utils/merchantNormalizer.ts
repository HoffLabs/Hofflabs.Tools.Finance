/**
 * Merchant Name Normalizer
 * 
 * Groups similar merchant names together using token-based fuzzy matching.
 * Handles variations like:
 * - CMG MORTGAGE INC CMG MORTGA
 * - CMG FINANCIAL CMG FINANC
 * - CMG MORTGAGE LOAN PAYMT
 */

// Common suffixes/words to strip from merchant names
const NOISE_WORDS = new Set([
  'INC', 'LLC', 'LTD', 'CORP', 'CO', 'COMPANY', 'CORPORATION',
  'PAYMT', 'PAYMENT', 'PAYMENTS', 'PAY',
  'DFT', 'DRAFT', 'ACH', 'EFT', 'WIRE',
  'DEBIT', 'CREDIT', 'CARD', 'PURCHASE',
  'POS', 'CHECKCARD', 'VISA', 'MASTERCARD', 'AMEX',
  'ONLINE', 'MOBILE', 'WEB', 'APP',
  'TIME', 'RECURRING', 'AUTOPAY', 'AUTO',
  'THE', 'AND', 'OF', 'FOR', 'AT', 'IN', 'ON', 'TO', 'FROM', 'BY', 'WITH',
])

// Common transaction type indicators
const TRANSACTION_TYPES = new Set([
  'LOAN', 'MORTGAGE', 'INSURANCE', 'FINANCIAL', 'BANK', 'BANKING',
])

/**
 * Normalizes a merchant name by:
 * - Converting to uppercase
 * - Removing special characters
 * - Removing common noise words
 * - Extracting core identifying tokens
 */
export function normalizeMerchantName(name: string): string {
  if (!name) return 'UNKNOWN'
  
  // Uppercase and remove special characters except spaces
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  // Split into tokens
  const tokens = cleaned.split(' ')
  
  // Filter out noise words and very short tokens, keep transaction types
  const significantTokens = tokens.filter(token => 
    token.length > 1 && 
    (!NOISE_WORDS.has(token) || TRANSACTION_TYPES.has(token))
  )
  
  // Return first 2-3 significant tokens as the normalized name
  // This captures the core merchant identity
  return significantTokens.slice(0, 3).join(' ') || cleaned.slice(0, 20) || 'UNKNOWN'
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a score from 0 to 1 (1 = identical)
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1
  if (!str1.length || !str2.length) return 0
  
  const len1 = str1.length
  const len2 = str2.length
  
  // Create matrix
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0))
  
  // Initialize first column and row
  for (let i = 0; i <= len1; i++) matrix[i][0] = i
  for (let j = 0; j <= len2; j++) matrix[0][j] = j
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }
  
  const maxLen = Math.max(len1, len2)
  return 1 - (matrix[len1][len2] / maxLen)
}

/**
 * Calculate token-based similarity (Jaccard-like)
 * More forgiving for truncated names
 */
function tokenSimilarity(name1: string, name2: string): number {
  const tokens1 = name1.split(' ')
  const tokens2 = name2.split(' ')
  const tokens2Set = new Set(tokens2)
  
  let matches = 0
  for (const token of tokens1) {
    if (tokens2Set.has(token)) {
      matches++
    } else {
      // Check for partial token matches (truncation)
      for (const t2 of tokens2) {
        if (token.startsWith(t2) || t2.startsWith(token)) {
          if (Math.min(token.length, t2.length) >= 3) {
            matches += 0.8
            break
          }
        }
      }
    }
  }
  
  const totalUnique = new Set([...tokens1, ...tokens2]).size
  return matches / totalUnique
}

/**
 * Combined similarity score
 */
export function calculateSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeMerchantName(name1)
  const norm2 = normalizeMerchantName(name2)
  
  // Exact match after normalization
  if (norm1 === norm2) return 1
  
  // Check if one starts with the other (common for truncated names)
  if (norm1.startsWith(norm2) || norm2.startsWith(norm1)) {
    return 0.95
  }
  
  // Combined score: weight token similarity more heavily
  const levScore = levenshteinSimilarity(norm1, norm2)
  const tokenScore = tokenSimilarity(norm1, norm2)
  
  return (levScore * 0.3) + (tokenScore * 0.7)
}

export interface MerchantGroup {
  canonicalName: string
  originalNames: string[]
  totalAmount: number
  transactionCount: number
}

export interface MerchantSpendingEntry {
  amount: number
  count: number
}

/**
 * Groups merchant spending by similar names
 * 
 * @param merchantSpending - Record of merchant name -> { amount, count }
 * @param similarityThreshold - Minimum similarity to group (0-1), default 0.6
 * @returns Array of grouped merchants sorted by total spending
 */
export function groupMerchantsBySimiarity(
  merchantSpending: Record<string, MerchantSpendingEntry>,
  similarityThreshold = 0.6
): MerchantGroup[] {
  const entries = Object.entries(merchantSpending)
  const groups: MerchantGroup[] = []
  const processed = new Set<string>()
  
  // Sort by amount descending so highest spenders become canonical names
  entries.sort((a, b) => b[1].amount - a[1].amount)
  
  for (const [name, data] of entries) {
    if (processed.has(name)) continue
    
    // Start a new group with this merchant
    const group: MerchantGroup = {
      canonicalName: name,
      originalNames: [name],
      totalAmount: data.amount,
      transactionCount: data.count,
    }
    processed.add(name)
    
    // Find similar merchants
    for (const [otherName, otherData] of entries) {
      if (processed.has(otherName)) continue
      
      const similarity = calculateSimilarity(name, otherName)
      
      if (similarity >= similarityThreshold) {
        group.originalNames.push(otherName)
        group.totalAmount += otherData.amount
        group.transactionCount += otherData.count
        processed.add(otherName)
      }
    }
    
    groups.push(group)
  }
  
  // Sort by total amount descending
  groups.sort((a, b) => b.totalAmount - a.totalAmount)
  
  return groups
}

/**
 * Convenience function that returns grouped merchants in the format
 * expected by the analytics endpoint
 */
export function groupAndFormatMerchants(
  merchantSpending: Record<string, MerchantSpendingEntry>,
  similarityThreshold = 0.6
): Array<{ name: string; amount: number; count: number }> {
  const groups = groupMerchantsBySimiarity(merchantSpending, similarityThreshold)
  
  return groups.map(group => ({
    name: group.canonicalName,
    amount: group.totalAmount,
    count: group.transactionCount,
  }))
}
