import { getDb, generateId, now } from '@/lib/db/client'
import { CATEGORY_RULES, autoCategorize } from '@/lib/utils/autoCategorizer'
import type { AiCategory } from '@/lib/db/types'

const CATEGORIES_LIST = Object.keys(CATEGORY_RULES)

export interface AiConfig {
  enabled: boolean
  apiUrl: string
  apiKey: string
  model: string
}

/**
 * Categorize a transaction using AI, with MongoDB cache and keyword fallback.
 */
export async function categorizeTransaction(
  name: string,
  aiConfig: AiConfig | null,
  userOverrides?: Map<string, string>
): Promise<string> {
  if (!name) return 'Uncategorized'

  // Check user overrides first
  if (userOverrides) {
    const override = userOverrides.get(name.toLowerCase())
    if (override) return override
  }

  // Check AI cache
  const db = await getDb()
  const cached = await db.prepare(
    'SELECT category FROM ai_categories WHERE merchant_name = ?'
  ).bind(name.toLowerCase()).first<AiCategory>()
  if (cached) return cached.category

  // Try AI if enabled
  if (aiConfig?.enabled && aiConfig.apiUrl && aiConfig.model) {
    try {
      const category = await callLiteLLM(name, aiConfig)
      if (category && category !== 'Uncategorized') {
        // Cache the result
        await db.prepare(
          `INSERT INTO ai_categories (id, merchant_name, category, created_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(merchant_name) DO UPDATE SET category = excluded.category`
        ).bind(generateId(), name.toLowerCase(), category, now()).run()
        return category
      }
    } catch (err) {
      console.error('AI categorization failed, falling back to keywords:', err)
    }
  }

  // Fallback to keyword matching
  return autoCategorize(name, userOverrides)
}

/**
 * Batch categorize multiple transaction names.
 */
export async function batchCategorize(
  names: string[],
  aiConfig: AiConfig | null,
  userOverrides?: Map<string, string>
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  const uncached: string[] = []

  // Check cache first for all names
  const db = await getDb()
  const normalizedNames = names.map(n => n.toLowerCase())
  const cacheMap = new Map<string, string>()
  // Query cache for each name (D1 doesn't support large IN clauses well)
  for (const nn of normalizedNames) {
    const cached = await db.prepare('SELECT merchant_name, category FROM ai_categories WHERE merchant_name = ?').bind(nn).first<AiCategory>()
    if (cached) cacheMap.set(cached.merchant_name, cached.category)
  }

  for (const name of names) {
    // User override
    if (userOverrides?.get(name.toLowerCase())) {
      results[name] = userOverrides.get(name.toLowerCase())!
      continue
    }
    // Cache hit
    const cached = cacheMap.get(name.toLowerCase())
    if (cached) {
      results[name] = cached
      continue
    }
    uncached.push(name)
  }

  // Batch AI call for uncached names
  if (uncached.length > 0 && aiConfig?.enabled && aiConfig.apiUrl && aiConfig.model) {
    try {
      const aiResults = await callLiteLLMBatch(uncached, aiConfig)
      for (const [name, category] of Object.entries(aiResults)) {
        results[name] = category
        // Cache
        await db.prepare(
          `INSERT INTO ai_categories (id, merchant_name, category, created_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(merchant_name) DO UPDATE SET category = excluded.category`
        ).bind(generateId(), name.toLowerCase(), category, now()).run()
      }
    } catch (err) {
      console.error('AI batch categorization failed:', err)
    }
  }

  // Fill remaining with keyword fallback
  for (const name of names) {
    if (!results[name]) {
      results[name] = autoCategorize(name, userOverrides)
    }
  }

  return results
}

/**
 * Generate a daily spending roast/summary.
 */
export async function generateSpendingSummary(
  spendingData: { totalSpent: number; topMerchants: Array<{ name: string; amount: number }>; topCategory: string },
  aiConfig: AiConfig
): Promise<string> {
  const merchantList = spendingData.topMerchants
    .slice(0, 5)
    .map(m => `${m.name}: $${m.amount.toFixed(2)}`)
    .join(', ')

  const prompt = `Here's someone's spending this month:
Total: $${spendingData.totalSpent.toFixed(2)}
Top merchants: ${merchantList}
Biggest category: ${spendingData.topCategory}

Give a brutally honest, sarcastic 2-3 sentence roast of their spending habits. Be funny but not mean-spirited. Reference specific merchants and amounts. Keep it under 280 characters.`

  try {
    const response = await fetch(`${aiConfig.apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(aiConfig.apiKey ? { 'Authorization': `Bearer ${aiConfig.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: 'You are a brutally honest, sarcastic financial advisor. Be funny and concise.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.9,
      }),
    })

    if (!response.ok) throw new Error(`LiteLLM returned ${response.status}`)
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || 'Your spending is... interesting.'
  } catch (err) {
    console.error('AI summary generation failed:', err)
    return ''
  }
}

// --- Internal helpers ---

const SYSTEM_PROMPT_SINGLE = `You are an expert financial transaction categorizer with deep knowledge of merchants, businesses, brands, and bank statement descriptions worldwide.

Given a bank/credit card transaction description, identify the actual merchant or transaction type and categorize it.
Use databases like whatsthatcharge.com to understand cryptic bank statement descriptions.

IMPORTANT rules:
- "MOBILE PAYMENT - THANK YOU", "ONLINE PAYMENT", "AUTOPAY PAYMENT", "WEB PAYMENT", and similar are CREDIT CARD PAYMENTS, NOT transportation.
- "ADJ REDIST PURCHASE BAL" and similar adjustment entries are Transfers.
- Zelle, Venmo, PayPal person-to-person, internal bank transfers = Transfer (NOT spending or income).
- Car loan payments (Toyota Financial, Honda Financial, Ford Credit, GM Financial, Capital One Auto, Ally Auto, etc.) = Loan Payment.
- Student loan payments (Navient, Nelnet, Great Lakes, Sallie Mae, SoFi student loans) = Loan Payment.
- Personal loan payments (Upstart, LendingClub, Prosper, SoFi personal) = Loan Payment.
- "AMAZON PAY WITH POINTS" is Shopping.
- Distinguish between Uber (Transportation) and Uber Eats (Dining).
- "SQ *" prefixes are Square merchant payments — categorize by the merchant name after the prefix.
- "AMZN MKTP" = Amazon = Shopping. "GOOGLE *YOUTUBE" = Subscriptions.
- Payroll, salary, direct deposits from employers = Income.
- Brokerage purchases, stock trades, ETFs, dividends, crypto = Investments.
- Software companies (Reallusion, Anthropic, GMG Inc, GitHub, JetBrains) and digital product purchases = Software & Digital.
- ATM fees, bank service charges, overdraft fees, maintenance fees = Bank Fees.
- Tax payments (IRS, state/federal/property tax, tax prep) = Taxes.
- CPA, accountant, attorney, lawyer, consultant, financial advisor services = Professional Services.
- Outdoor stores (REI, Bass Pro, Cabela's, Go Outdoors), camping, hiking = Outdoor & Recreation.

Respond with ONLY the category name from this list:
${CATEGORIES_LIST.join(', ')}, Uncategorized

No explanation. Just the single category name.`

const SYSTEM_PROMPT_BATCH = `You are an expert financial transaction categorizer with deep knowledge of merchants, businesses, brands, and bank statement descriptions worldwide.

For each numbered transaction below, identify the actual merchant or transaction type and assign the most accurate category.
Use databases like whatsthatcharge.com to understand cryptic bank statement codes.

IMPORTANT rules:
- "MOBILE PAYMENT - THANK YOU", "ONLINE PAYMENT", "AUTOPAY", "WEB PAYMENT" = Credit Card Payments, NOT transportation.
- "ADJ REDIST PURCHASE BAL" and similar adjustments = Transfer.
- Zelle, Venmo, PayPal P2P, internal bank transfers = Transfer (NOT spending or income).
- Car loans (Toyota Financial, Honda Financial, Ford Credit, GM Financial, Capital One Auto, Ally Auto) = Loan Payment.
- Student loans (Navient, Nelnet, Great Lakes, Sallie Mae) = Loan Payment.
- Personal loans (Upstart, LendingClub, Prosper, SoFi) = Loan Payment.
- Distinguish Uber (Transportation) from Uber Eats (Dining).
- "SQ *" prefixes = Square merchant — categorize by the merchant name after the prefix.
- "AMZN MKTP" = Shopping. "GOOGLE *YOUTUBE" = Subscriptions.
- Payroll, salary, direct deposits = Income.
- Brokerage purchases, stock trades, ETFs, dividends, crypto = Investments.
- Software companies (Reallusion, Anthropic, GMG Inc, GitHub, JetBrains) = Software & Digital.
- ATM fees, bank service charges, overdraft fees = Bank Fees.
- Tax payments (IRS, state/federal/property) = Taxes.
- CPA, accountant, attorney, lawyer, consultant = Professional Services.
- Outdoor stores (REI, Bass Pro, Cabela's, Go Outdoors) = Outdoor & Recreation.

Categories:

Respond with ONLY numbered results in this exact format:
1. Category
2. Category

No explanations or extra text.`

async function callLiteLLM(name: string, config: AiConfig): Promise<string> {
  const response = await fetch(`${config.apiUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_SINGLE },
        { role: 'user', content: name },
      ],
      max_tokens: 20,
      temperature: 0,
    }),
  })

  if (!response.ok) throw new Error(`LiteLLM returned ${response.status}`)
  const data = await response.json()
  const category = data.choices?.[0]?.message?.content?.trim() || 'Uncategorized'

  const matched = matchCategory(category)
  return matched || 'Uncategorized'
}

// Build a lookup map for case-insensitive category matching
const CATEGORIES_LOWER_MAP = new Map<string, string>()
for (const cat of CATEGORIES_LIST) {
  CATEGORIES_LOWER_MAP.set(cat.toLowerCase(), cat)
}

function matchCategory(raw: string): string | null {
  const trimmed = raw.trim()
  // Exact match
  if (CATEGORIES_LIST.includes(trimmed)) return trimmed
  // Case-insensitive match
  const lower = trimmed.toLowerCase()
  if (CATEGORIES_LOWER_MAP.has(lower)) return CATEGORIES_LOWER_MAP.get(lower)!
  // Strip trailing parenthetical or dash annotations e.g. "Shopping (Amazon)" → "Shopping"
  const cleaned = trimmed.replace(/\s*[\(\-\–].+$/, '').trim()
  if (CATEGORIES_LIST.includes(cleaned)) return cleaned
  if (CATEGORIES_LOWER_MAP.has(cleaned.toLowerCase())) return CATEGORIES_LOWER_MAP.get(cleaned.toLowerCase())!
  return null
}

async function callLiteLLMBatch(names: string[], config: AiConfig): Promise<Record<string, string>> {
  const namesList = names.map((n, i) => `${i + 1}. ${n}`).join('\n')

  const response = await fetch(`${config.apiUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_BATCH },
        { role: 'user', content: namesList },
      ],
      max_tokens: 2000,
      temperature: 0,
    }),
  })

  if (!response.ok) throw new Error(`LiteLLM returned ${response.status}`)
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content?.trim() || ''

  const results: Record<string, string> = {}
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s*(.+)$/)
    if (match) {
      const idx = parseInt(match[1]) - 1
      const category = matchCategory(match[2])
      if (idx >= 0 && idx < names.length && category) {
        results[names[idx]] = category
      }
    }
  }

  return results
}
