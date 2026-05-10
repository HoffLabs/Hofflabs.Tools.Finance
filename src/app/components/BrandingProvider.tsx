"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export const DEFAULT_APP_NAME = 'Hoff Labs'
export const DEFAULT_LOGO_URL = '/hofflabs.png'

interface BrandingContextValue {
  appName: string
  logoUrl: string
}

const BrandingContext = createContext<BrandingContextValue>({
  appName: DEFAULT_APP_NAME,
  logoUrl: DEFAULT_LOGO_URL,
})

export function useBranding() {
  return useContext(BrandingContext)
}

export default function BrandingProvider({ children }: { children: ReactNode }) {
  const [appName, setAppName] = useState(DEFAULT_APP_NAME)
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL)

  useEffect(() => {
    fetch('/api/user/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const branding = d?.data?.preferences?.branding
        if (branding?.appName) setAppName(branding.appName)
        if (branding?.logoUrl) setLogoUrl(branding.logoUrl)
      })
      .catch(() => {})
  }, [])

  return (
    <BrandingContext.Provider value={{ appName, logoUrl }}>
      {children}
    </BrandingContext.Provider>
  )
}
