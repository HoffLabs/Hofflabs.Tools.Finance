"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Logo from './Logo'
import { useBranding } from './BrandingProvider'

type NavDock = {
  x: number
  y: number
  width: number
  height: number
}

type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

type PointerInteraction =
  | {
      mode: 'drag'
      startPointerX: number
      startPointerY: number
      startDock: NavDock
    }
  | {
      mode: 'resize'
      handle: ResizeHandle
      startPointerX: number
      startPointerY: number
      startDock: NavDock
    }

const navItems = [
  { href: '/dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/dashboard/transactions', label: 'Txns', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href: '/dashboard/rates', label: 'Rates', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
] as const

const NAV_MARGIN = 16
const NAV_TOP_BOUNDARY = 64
const NAV_MIN_WIDTH = 220
const NAV_MIN_HEIGHT = 72
const NAV_MAX_WIDTH = 760
const NAV_MAX_HEIGHT = 420
const NAV_SNAP_DISTANCE = 28
const DEFAULT_DOCK: NavDock = { x: NAV_MARGIN, y: NAV_TOP_BOUNDARY + NAV_MARGIN, width: 420, height: 92 }

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getDefaultDock = (): NavDock => {
  if (typeof window === 'undefined') return DEFAULT_DOCK

  const maxWidth = Math.max(NAV_MIN_WIDTH, Math.min(NAV_MAX_WIDTH, window.innerWidth - NAV_MARGIN * 2))
  const width = clampValue(Math.min(440, maxWidth), NAV_MIN_WIDTH, maxWidth)
  const height = 92
  const x = Math.round((window.innerWidth - width) / 2)
  const y = Math.round(window.innerHeight - height - NAV_MARGIN)

  return { x, y, width, height }
}

const clampDockToViewport = (dock: NavDock): NavDock => {
  if (typeof window === 'undefined') return dock

  const maxWidth = Math.max(NAV_MIN_WIDTH, Math.min(NAV_MAX_WIDTH, window.innerWidth - NAV_MARGIN * 2))
  const maxHeight = Math.max(NAV_MIN_HEIGHT, Math.min(NAV_MAX_HEIGHT, window.innerHeight - NAV_TOP_BOUNDARY - NAV_MARGIN))
  const width = clampValue(dock.width, NAV_MIN_WIDTH, maxWidth)
  const height = clampValue(dock.height, NAV_MIN_HEIGHT, maxHeight)
  const maxX = Math.max(NAV_MARGIN, window.innerWidth - width - NAV_MARGIN)
  const maxY = Math.max(NAV_TOP_BOUNDARY, window.innerHeight - height - NAV_MARGIN)

  return {
    x: clampValue(dock.x, NAV_MARGIN, maxX),
    y: clampValue(dock.y, NAV_TOP_BOUNDARY, maxY),
    width,
    height,
  }
}

const snapDockToEdge = (dock: NavDock): NavDock => {
  if (typeof window === 'undefined') return dock

  const leftSnap = Math.abs(dock.x - NAV_MARGIN)
  const rightSnap = Math.abs(window.innerWidth - (dock.x + dock.width) - NAV_MARGIN)
  const topSnap = Math.abs(dock.y - NAV_TOP_BOUNDARY)
  const bottomSnap = Math.abs(window.innerHeight - (dock.y + dock.height) - NAV_MARGIN)
  const smallestSnap = Math.min(leftSnap, rightSnap, topSnap, bottomSnap)

  if (smallestSnap > NAV_SNAP_DISTANCE) {
    return dock
  }

  if (smallestSnap === leftSnap) {
    return { ...dock, x: NAV_MARGIN }
  }
  if (smallestSnap === rightSnap) {
    return { ...dock, x: window.innerWidth - dock.width - NAV_MARGIN }
  }
  if (smallestSnap === topSnap) {
    return { ...dock, y: NAV_TOP_BOUNDARY }
  }
  return { ...dock, y: window.innerHeight - dock.height - NAV_MARGIN }
}

const parseDockPreference = (value: unknown): NavDock | null => {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<Record<keyof NavDock, unknown>>
  if (
    typeof candidate.x !== 'number' ||
    typeof candidate.y !== 'number' ||
    typeof candidate.width !== 'number' ||
    typeof candidate.height !== 'number'
  ) {
    return null
  }

  return clampDockToViewport({
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    height: candidate.height,
  })
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { appName, logoUrl } = useBranding()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showRates, setShowRates] = useState(true)
  const [navDock, setNavDock] = useState<NavDock>(DEFAULT_DOCK)
  const [navReady, setNavReady] = useState(false)
  const [interactionMode, setInteractionMode] = useState<'idle' | 'drag' | 'resize'>('idle')
  const interactionRef = useRef<PointerInteraction | null>(null)

  const persistDockPreference = useCallback(async (dock: NavDock) => {
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { navDock: dock } }),
      })
    } catch {
      // Best effort persistence only.
    }
  }, [])

  useEffect(() => {
    setNavDock(clampDockToViewport(getDefaultDock()))
    setNavReady(true)

    fetch('/api/user/settings').then(r => r.ok ? r.json() : null).then(d => {
      const prefs = d?.data?.preferences || {}
      setShowRates(prefs.showRates !== false)
      const savedDock = parseDockPreference(prefs.navDock)
      if (savedDock) {
        setNavDock(savedDock)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setNavDock(prev => clampDockToViewport(prev))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction) return

      const deltaX = event.clientX - interaction.startPointerX
      const deltaY = event.clientY - interaction.startPointerY

      if (interaction.mode === 'drag') {
        setNavDock(clampDockToViewport({
          ...interaction.startDock,
          x: interaction.startDock.x + deltaX,
          y: interaction.startDock.y + deltaY,
        }))
        return
      }

      const start = interaction.startDock
      const nextDock: NavDock = { ...start }

      if (interaction.handle.includes('right')) {
        nextDock.width = start.width + deltaX
      }
      if (interaction.handle.includes('left')) {
        nextDock.width = start.width - deltaX
        nextDock.x = start.x + deltaX
      }
      if (interaction.handle.includes('bottom')) {
        nextDock.height = start.height + deltaY
      }
      if (interaction.handle.includes('top')) {
        nextDock.height = start.height - deltaY
        nextDock.y = start.y + deltaY
      }

      setNavDock(clampDockToViewport(nextDock))
    }

    const finishInteraction = () => {
      const interaction = interactionRef.current
      if (!interaction) return

      interactionRef.current = null
      setInteractionMode('idle')

      setNavDock(prev => {
        const clamped = clampDockToViewport(prev)
        const finalDock = interaction.mode === 'drag' ? snapDockToEdge(clamped) : clamped
        void persistDockPreference(finalDock)
        return finalDock
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finishInteraction)
    window.addEventListener('pointercancel', finishInteraction)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finishInteraction)
      window.removeEventListener('pointercancel', finishInteraction)
    }
  }, [persistDockPreference])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const startDockDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('a, button, [data-resize-handle]')) return

    interactionRef.current = {
      mode: 'drag',
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startDock: navDock,
    }
    setInteractionMode('drag')
  }

  const startDockResize = (handle: ResizeHandle) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()

    interactionRef.current = {
      mode: 'resize',
      handle,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startDock: navDock,
    }
    setInteractionMode('resize')
  }

  const visibleNavItems = showRates ? navItems : navItems.filter(item => item.href !== '/dashboard/rates')
  const isVerticalDock = navDock.height > navDock.width

  return (
    <>
      {/* Top bar - minimal */}
      <div className="fixed top-0 left-0 right-0 z-30 h-14 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="flex items-center justify-between h-full px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Logo size={28} src={logoUrl} />
            <span className="text-sm font-semibold text-emerald-400 hidden sm:block">{appName}</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs text-slate-400 hidden sm:block">Account</span>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-40 glass-card p-1 z-50 animate-fade-in-up">
                  <Link href="/dashboard/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors">
                    Settings
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating navigation dock */}
      <nav
        className={`fixed z-40 animate-fade-in-up select-none ${interactionMode === 'idle' ? 'transition-[left,top,width,height] duration-150 ease-out' : ''} ${navReady ? '' : 'opacity-0 pointer-events-none'}`}
        style={{
          left: `${navDock.x}px`,
          top: `${navDock.y}px`,
          width: `${navDock.width}px`,
          height: `${navDock.height}px`,
          touchAction: 'none',
        }}
        onPointerDown={startDockDrag}
      >
        <div className={`relative h-full w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/40 ${interactionMode !== 'idle' ? 'ring-1 ring-emerald-500/60' : ''}`}>
          <div className={`h-full w-full py-2 px-2 flex ${isVerticalDock ? 'flex-col' : 'flex-row flex-wrap'} items-center justify-center gap-1`}>
            {visibleNavItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex ${isVerticalDock ? 'w-full flex-row justify-start gap-2.5 px-3' : 'flex-col gap-0.5 px-4'} items-center py-2 rounded-xl text-[10px] font-medium transition-all duration-300
                    ${active
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                    }`}
                >
                  <svg className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                  {active && (
                    <div className={`absolute ${isVerticalDock ? 'left-1.5 top-1/2 -translate-y-1/2' : '-bottom-0.5 left-1/2 -translate-x-1/2'} w-1 h-1 rounded-full bg-emerald-400`} />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Invisible resize zones on corners */}
          <button
            type="button"
            data-resize-handle
            aria-label="Resize navigation from top-left corner"
            onPointerDown={startDockResize('top-left')}
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize opacity-0"
          />
          <button
            type="button"
            data-resize-handle
            aria-label="Resize navigation from top-right corner"
            onPointerDown={startDockResize('top-right')}
            className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize opacity-0"
          />
          <button
            type="button"
            data-resize-handle
            aria-label="Resize navigation from bottom-left corner"
            onPointerDown={startDockResize('bottom-left')}
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize opacity-0"
          />
          <button
            type="button"
            data-resize-handle
            aria-label="Resize navigation from bottom-right corner"
            onPointerDown={startDockResize('bottom-right')}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0"
          />
        </div>
      </nav>
    </>
  )
}
