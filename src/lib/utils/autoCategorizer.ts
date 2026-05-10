/**
 * Auto-Categorizer
 * 
 * Automatically categorizes transactions based on merchant name keywords.
 * Supports user-defined overrides stored in the database.
 */

import { calculateSimilarity } from './merchantNormalizer'

// Default categories with their associated keywords
export const CATEGORY_RULES: Record<string, string[]> = {
  // Credit Card Payments MUST be checked first — these patterns appear in many
  // transaction names that would otherwise false-match other categories.
  'Credit Card Payments': [
    'mobile payment - thank', 'mobile payment', 'credit card payment',
    'card payment', 'autopay payment', 'online payment', 'payment thank you',
    'payment received', 'web payment', 'automatic payment', 'payment - thank',
    'internet payment', 'recurring payment', 'epayment', 'bill pay',
  ],
  'Housing': [
    'mortgage', 'rent', 'hoa', 'property', 'real estate', 'apartment',
    'lease', 'housing', 'cmg mortgage', 'quicken loans', 'rocket mortgage',
    'wells fargo home', 'chase home', 'fannie mae', 'freddie mac',
  ],
  'Utilities': [
    'electric', 'gas', 'water', 'utility', 'utilities', 'power',
    'energy', 'pge', 'con edison', 'duke energy', 'xcel', 'comcast',
    'spectrum', 'att', 'verizon', 'tmobile', 't-mobile', 'internet',
    'cable', 'phone', 'cellular', 'wireless',
  ],
  'Groceries': [
    'grocery', 'groceries', 'supermarket', 'food', 'market',
    'walmart', 'target', 'costco', 'kroger', 'safeway', 'albertsons',
    'whole foods', 'trader joe', 'aldi', 'publix', 'heb', 'wegmans',
    'sprouts', 'food lion', 'giant', 'stop shop', 'shoprite',
  ],
  'Dining': [
    'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'taco',
    'sushi', 'chinese', 'mexican', 'italian', 'thai', 'indian',
    'mcdonalds', 'starbucks', 'chipotle', 'subway', 'wendys',
    'chick-fil-a', 'panera', 'dominos', 'grubhub', 'doordash',
    'ubereats', 'uber eats', 'postmates', 'seamless',
  ],
  'Transportation': [
    'gas station', 'fuel', 'shell', 'chevron', 'exxon', 'bp',
    'exxonmobil', 'mobil gas', 'speedway', 'wawa', 'quiktrip',
    'uber', 'lyft', 'taxi', 'parking', 'toll', 'transit', 'metro',
    'bus', 'train', 'amtrak', 'airline', 'flight', 'car wash', 'auto',
  ],
  'Shopping': [
    'amazon', 'ebay', 'etsy', 'shop', 'store', 'mall', 'outlet',
    'best buy', 'home depot', 'lowes', 'ikea', 'macys', 'nordstrom',
    'kohls', 'tjmaxx', 'marshalls', 'ross', 'old navy', 'gap',
    'nike', 'adidas', 'apple store',
  ],
  'Entertainment': [
    'netflix', 'hulu', 'disney', 'hbo', 'spotify', 'apple music',
    'youtube', 'twitch', 'gaming', 'playstation', 'xbox', 'steam',
    'movie', 'cinema', 'theater', 'concert', 'ticket', 'amc',
    'regal', 'live nation', 'stubhub',
  ],
  'Healthcare': [
    'hospital', 'medical', 'doctor', 'clinic', 'pharmacy', 'cvs',
    'walgreens', 'rite aid', 'health', 'dental', 'vision', 'optometry',
    'insurance', 'aetna', 'cigna', 'united health', 'blue cross',
    'kaiser', 'humana', 'anthem',
  ],
  'Insurance': [
    'insurance', 'geico', 'state farm', 'allstate', 'progressive',
    'liberty mutual', 'farmers', 'nationwide', 'usaa', 'travelers',
    'metlife', 'prudential', 'life insurance', 'auto insurance',
  ],
  'Subscriptions': [
    'subscription', 'membership', 'monthly', 'annual', 'renewal',
    'prime', 'plus', 'premium', 'pro', 'adobe', 'microsoft 365',
    'dropbox', 'icloud', 'google one', 'patreon',
  ],
  'Education': [
    'school', 'university', 'college', 'tuition', 'course', 'class',
    'udemy', 'coursera', 'skillshare', 'masterclass', 'linkedin learning',
    'book', 'textbook', 'student',
  ],
  'Fitness': [
    'gym', 'fitness', 'workout', 'yoga', 'crossfit', 'planet fitness',
    'la fitness', 'equinox', 'orangetheory', 'peloton', 'sports',
  ],
  'Travel': [
    'hotel', 'airbnb', 'vrbo', 'booking', 'expedia', 'kayak',
    'tripadvisor', 'marriott', 'hilton', 'hyatt', 'ihg', 'delta',
    'american airlines', 'united airlines', 'southwest', 'jetblue',
  ],
  'Personal Care': [
    'salon', 'barber', 'spa', 'beauty', 'cosmetic', 'sephora',
    'ulta', 'hair', 'nail', 'massage', 'skincare',
  ],
  'Pets': [
    'pet', 'vet', 'veterinary', 'petsmart', 'petco', 'chewy',
    'dog', 'cat', 'animal', 'grooming',
  ],
  'Transfer': [
    'transfer', 'zelle', 'venmo', 'paypal', 'cash app', 'wire',
    'ach', 'adj redist', 'adjustment', 'internal transfer',
    'online transfer', 'funds transfer', 'account transfer',
  ],
  'Loan Payment': [
    'loan', 'auto loan', 'car loan', 'car payment', 'vehicle payment',
    'student loan', 'personal loan', 'mortgage payment', 'loan payment',
    'loan pmt', 'auto pmt', 'navient', 'nelnet', 'great lakes',
    'sallie mae', 'sofi', 'upstart', 'lending club', 'prosper',
    'capital one auto', 'ally auto', 'chase auto', 'wells fargo auto',
    'toyota financial', 'honda financial', 'ford credit', 'gm financial',
    'bmw financial', 'mercedes financial', 'vw credit', 'hyundai capital',
  ],
  'Income': [
    'payroll', 'salary', 'direct deposit', 'direct dep', 'paycheck',
    'employer', 'wages', 'income', 'bonus', 'commission',
  ],
}

// Predefined category list for UI dropdowns
export const CATEGORIES = Object.keys(CATEGORY_RULES)

/**
 * Auto-categorize a merchant/transaction name based on keyword matching
 * 
 * @param name - The merchant or transaction name
 * @param userOverrides - Optional map of normalized merchant name -> category
 * @returns The detected category or 'Uncategorized'
 */
export function autoCategorize(
  name: string,
  userOverrides?: Map<string, string>
): string {
  if (!name) return 'Uncategorized'
  
  const normalizedName = name.toLowerCase()
  
  // Check user overrides first using similarity matching
  if (userOverrides) {
    // Check for exact override
    const override = userOverrides.get(normalizedName)
    if (override) return override
    
    // Check for similar matches using the same algorithm as merchant grouping
    const entries = Array.from(userOverrides.entries())
    for (const [merchantPattern, category] of entries) {
      // Use similarity matching (same threshold as merchant grouping)
      const similarity = calculateSimilarity(name, merchantPattern)
      if (similarity >= 0.6) {
        return category
      }
    }
  }
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        return category
      }
    }
  }
  
  return 'Uncategorized'
}

/**
 * Batch categorize multiple merchants
 * 
 * @param merchantNames - Array of merchant names
 * @param userOverrides - Optional map of merchant name -> category
 * @returns Map of merchant name -> category
 */
export function batchCategorize(
  merchantNames: string[],
  userOverrides?: Map<string, string>
): Map<string, string> {
  const result = new Map<string, string>()
  
  for (const name of merchantNames) {
    result.set(name, autoCategorize(name, userOverrides))
  }
  
  return result
}

/**
 * Get suggested category for a merchant (returns top 3 matches with confidence)
 */
export function getSuggestedCategories(name: string): Array<{ category: string; confidence: number }> {
  if (!name) return [{ category: 'Uncategorized', confidence: 1 }]
  
  const normalizedName = name.toLowerCase()
  const scores: Record<string, number> = {}
  
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    let categoryScore = 0
    
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase()
      if (normalizedName.includes(lowerKeyword)) {
        // Longer keyword matches get higher scores
        categoryScore += lowerKeyword.length / normalizedName.length
      }
    }
    
    if (categoryScore > 0) {
      scores[category] = Math.min(categoryScore, 1)
    }
  }
  
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, confidence]) => ({ category, confidence }))
  
  if (sorted.length === 0) {
    return [{ category: 'Uncategorized', confidence: 1 }]
  }
  
  return sorted
}
