import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { api } from '../services/api'
import type { GamificationTodayResponse } from '../types/api'
import {
  MOBILE_BOTTOM_NAV,
  NAV_SECTIONS,
  SETTINGS_ITEM,
  getLibraryDrawerItems,
  getMoreDrawerItems,
  getVisibleNavItems,
  pathMatchesDrawer,
  routeMetaFor,
  type NavigationItem,
} from '../navigation/config'
import { useMediaQuery } from '../lib/useMediaQuery'
import { cx } from '../lib/cx'
import { Sidebar, SidebarCollapseButton, SidebarFooter, SidebarItem, SidebarSection } from '../components/layout/Sidebar'
import { Brand } from '../components/layout/Brand'
import { TopBar } from '../components/layout/TopBar'
import { ConnectionStatus } from '../components/layout/ConnectionStatus'
import { NavigationDrawer } from '../components/layout/NavigationDrawer'
import { Breadcrumbs } from '../components/layout/Breadcrumbs'
import { MobileBottomNav, MobileNavItem } from '../components/layout/MobileNav'
import { StreakPill } from '../components/gamification/StreakPill'
import { Button } from '../components/ui/Button'
import { AIModelPicker } from '../components/ai/AIModelPicker'
import { FuriganaToggle } from '../components/layout/FuriganaToggle'
import { SystemGuideButton } from '../components/help/SystemGuideButton'
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher'
import { ModeSwitcher } from '../components/layout/ModeSwitcher'
import {
  VocabularyLookupProvider,
  useVocabularyLookup,
} from '../context/VocabularyLookupContext'
import { AIVocabularyLookupBox } from '../components/vocabulary/AIVocabularyLookupBox'
import { SelectionLookupBubble } from '../components/vocabulary/SelectionLookupBubble'

const SIDEBAR_STORAGE_KEY = 'jws.sidebar.collapsed'

function readCollapsedPreference(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function isItemActive(pathname: string, item: NavigationItem): boolean {
  if (item.end) return pathname === item.route
  return pathname === item.route || pathname.startsWith(`${item.route}/`)
}

function TopBarVocabLookupButton() {
  const { openLookup } = useVocabularyLookup()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => openLookup()}
      style={{
        fontSize: 'var(--text-caption)',
        height: 32,
        padding: '0 10px',
        borderRadius: 'var(--radius-md)',
        background: 'transparent',
        border: '1px solid var(--color-border-default)',
        color: 'var(--color-foreground-secondary)',
      }}
      title="Tra cứu từ vựng theo ngữ cảnh AI (Ctrl+Shift+K)"
      aria-label="Tra cứu từ vựng AI"
    >
      Tra từ AI
    </Button>
  )
}

export default function AppShell() {
  return (
    <VocabularyLookupProvider>
      <AppShellInner />
    </VocabularyLookupProvider>
  )
}

function AppShellInner() {
  const location = useLocation()
  const pathname = location.pathname

  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const mode = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

  const [collapsedPref, setCollapsedPref] = useState(readCollapsedPreference)
  const collapsed = mode === 'desktop' ? collapsedPref : mode === 'tablet'

  const [qualityAvailable, setQualityAvailable] = useState(false)
  const [analyticsAvailable, setAnalyticsAvailable] = useState(false)
  const [gamification, setGamification] = useState<GamificationTodayResponse | null>(null)
  const [openDrawer, setOpenDrawer] = useState<'library' | 'more' | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  const visibility = useMemo(
    () => ({ analytics: analyticsAvailable, quality: qualityAvailable }),
    [analyticsAvailable, qualityAvailable],
  )

  const navItems = useMemo(() => getVisibleNavItems(visibility), [visibility])
  const moreDrawerItems = useMemo(() => getMoreDrawerItems(visibility), [visibility])
  const libraryDrawerItems = useMemo(() => getLibraryDrawerItems(), [])

  useEffect(() => {
    let cancelled = false
    api
      .qualityStatus()
      .then((status) => {
        if (!cancelled && status.enabled && Array.isArray(status.tasks)) {
          setQualityAvailable(true)
        }
      })
      .catch(() => {
        // diagnostics disabled or environment-gated: hide the entry point
      })
    api
      .getGamificationToday()
      .then((payload) => {
        if (!cancelled) setGamification(payload)
      })
      .catch(() => {
        // gamification unavailable: keep the footer quiet
      })
    api
      .analyticsSummary('30d')
      .then(() => {
        if (!cancelled) setAnalyticsAvailable(true)
      })
      .catch(() => {
        // analytics disabled or environment-gated: hide the entry point
      })
    return () => {
      cancelled = true
    }
  }, [])

  const meta = routeMetaFor(pathname)
  const currentTitle = meta?.title ?? ''

  useEffect(() => {
    document.title = meta?.documentTitle ?? 'Japanese Writing Studio'
  }, [meta])

  useEffect(() => {
    mainRef.current?.scrollTo?.({ top: 0 })
  }, [pathname])

  const toggleCollapsed = () => {
    const next = !collapsedPref
    setCollapsedPref(next)
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0')
    } catch {
      // storage unavailable: session-only preference
    }
  }

  const closeDrawer = () => setOpenDrawer(null)

  const activeBottomNavKey = useMemo(() => {
    if (openDrawer === 'library') return 'library'
    if (openDrawer === 'more') return 'more'
    if (pathname === '/' ) return 'home'
    if (pathname === '/practice' || pathname.startsWith('/practice/')) return 'practice'
    if (pathname === '/journey' || pathname.startsWith('/journey/')) return 'journey'
    if (pathMatchesDrawer(pathname, 'library', visibility)) return 'library'
    if (pathMatchesDrawer(pathname, 'more', visibility)) return 'more'
    return null
  }, [pathname, openDrawer, visibility])

  const streak = gamification?.summary.current_streak ?? 0
  const level = gamification?.summary.level.current_level ?? 0
  const xp = gamification?.summary.level.current_xp ?? 0

  return (
    <div
      className={cx(
        'jw-app-shell',
        collapsed && 'jw-app-shell--collapsed',
        `jw-app-shell--${mode}`,
      )}
    >
      {mode !== 'mobile' ? (
      <div className="jw-app-sidebar">
        <Sidebar
          brand={<Brand collapsed={collapsed} />}
          tagline="Luyện viết tiếng Nhật cùng AI"
          aria-label="Điều hướng chính"
        >
          {NAV_SECTIONS.map((section) => {
            const items = navItems.filter(
              (item) => item.section === section.id && item.id !== SETTINGS_ITEM.id,
            )
            if (items.length === 0) return null
            return (
              <SidebarSection key={section.id} title={section.label}>
                {items.map((item) => (
                  <SidebarItem
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    to={item.route}
                    collapsed={collapsed}
                    active={isItemActive(pathname, item)}
                  />
                ))}
              </SidebarSection>
            )
          })}
          <SidebarFooter>
            {gamification ? (
              <div className="jw-sidebar-stats" style={{ padding: '0 var(--space-xs)' }}>
                {!collapsed && (
                  <div className="jw-sidebar-stats-row">
                    <span className="jw-sidebar-stats-label">Cấp {level} · {xp} XP</span>
                    {streak > 0 && <StreakPill streak={streak} />}
                  </div>
                )}
                {collapsed && streak > 0 ? (
                  <StreakPill streak={streak} compact className="jw-sidebar-stats-streak" />
                ) : null}
              </div>
            ) : null}
            <div className="jw-sidebar-footer-row">
              <SidebarItem
                label={SETTINGS_ITEM.label}
                icon={SETTINGS_ITEM.icon}
                to={SETTINGS_ITEM.route}
                collapsed={collapsed}
                active={isItemActive(pathname, SETTINGS_ITEM)}
              />
              {mode === 'desktop' ? (
                <SidebarCollapseButton collapsed={collapsedPref} onClick={toggleCollapsed} />
              ) : null}
            </div>
          </SidebarFooter>
        </Sidebar>
      </div>
      ) : null}

      <div className="jw-app-main" ref={mainRef}>
        <TopBar
          title={isMobile ? currentTitle : undefined}
          breadcrumb={
            meta?.breadcrumb && meta.breadcrumb.length > 0 ? (
              <Breadcrumbs items={[...meta.breadcrumb, { label: meta.title }]} />
            ) : undefined
          }
          menuLabel="Mở menu"
          onMenu={isMobile ? () => setOpenDrawer('more') : undefined}
          actions={
            <div className="jw-inline jw-gap-xs" style={{ alignItems: 'center' }}>
              <ModeSwitcher />
              <AIModelPicker variant="compact" />
              <TopBarVocabLookupButton />
              <SystemGuideButton />
              <FuriganaToggle />
              <ThemeSwitcher />
            </div>
          }
        />
        <ConnectionStatus />
        <main
          key={pathname}
          className={cx(
            'jw-page-enter',
            'jw-page-container',
            meta && meta.containerSize !== 'default' && `jw-page-container--${meta.containerSize}`,
          )}
        >
          <Outlet />
        </main>
      </div>

      {isMobile ? (
        <MobileBottomNav>
          {MOBILE_BOTTOM_NAV.map((item) => (
            <MobileNavItem
              key={item.key}
              label={item.label}
              icon={item.icon}
              to={item.route}
              active={activeBottomNavKey === item.key}
              onClick={item.drawer ? () => setOpenDrawer(item.drawer ?? null) : undefined}
            />
          ))}
        </MobileBottomNav>
      ) : null}

      <NavigationDrawer
        open={openDrawer === 'library'}
        onClose={closeDrawer}
        title="Thư viện"
        items={libraryDrawerItems}
        currentPath={pathname}
      />
      <NavigationDrawer
        open={openDrawer === 'more'}
        onClose={closeDrawer}
        title="Thêm"
        items={moreDrawerItems}
        currentPath={pathname}
      />

      <AIVocabularyLookupBox />
      <SelectionLookupBubble />
    </div>
  )
}