import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Cloud, CloudOff, UserRound, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export type AppRoute = '/dashboard' | '/discover' | '/create' | '/drafts' | '/settings'

export type NavigationItem = {
  path: AppRoute
  label: string
  icon: LucideIcon
  mobile?: boolean
  secondary?: boolean
}

type AppShellProps = {
  navigation: NavigationItem[]
  isSidebarExpanded: boolean
  onSidebarToggle: () => void
  title: string
  breadcrumb?: string
  actionLabel: string
  onAction: () => void
  actionDisabled?: boolean
  isCloudWorkspace: boolean
  statusMessage: string
  account: ReactNode
  children: ReactNode
}

function NavigationLink({ item, collapsed }: { item: NavigationItem; collapsed: boolean }) {
  const Icon = item.icon
  return <NavLink to={item.path} title={collapsed ? item.label : undefined} className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}><Icon size={19} aria-hidden="true" /><span>{item.label}</span></NavLink>
}

export function AppShell({ navigation, isSidebarExpanded, onSidebarToggle, title, breadcrumb, actionLabel, onAction, actionDisabled = false, isCloudWorkspace, statusMessage, account, children }: AppShellProps) {
  const primaryItems = navigation.filter((item) => !item.secondary)
  const secondaryItems = navigation.filter((item) => item.secondary)

  return (
    <div className={isSidebarExpanded ? 'app-frame' : 'app-frame sidebar-collapsed'}>
      <aside className="app-sidebar" aria-label="Primary navigation">
        <div className="sidebar-brand"><span className="brand-symbol">PF</span><div><strong>PostForge</strong><small>LinkedIn content workspace</small></div></div>
        <nav className="sidebar-links">{primaryItems.map((item) => <NavigationLink key={item.path} item={item} collapsed={!isSidebarExpanded} />)}</nav>
        <div className="sidebar-footer">{secondaryItems.map((item) => <NavigationLink key={item.path} item={item} collapsed={!isSidebarExpanded} />)}{account}<button type="button" className="sidebar-collapse" onClick={onSidebarToggle} aria-label={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}>{isSidebarExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}<span>{isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}</span></button></div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="page-identity">{breadcrumb && <p>{breadcrumb}</p>}<h1>{title}</h1></div>
          <div className="topbar-controls"><span className={isCloudWorkspace ? 'sync-state success' : 'sync-state'}>{isCloudWorkspace ? <Cloud size={15} /> : <CloudOff size={15} />}{isCloudWorkspace ? 'Synced to cloud' : 'Saved locally'}</span><span className="status-copy" role="status">{statusMessage}</span><button type="button" className="primary-action" onClick={onAction} disabled={actionDisabled}>{actionLabel}</button><NavLink to="/settings" className={({ isActive }) => isActive ? 'profile-control active' : 'profile-control'} aria-label="Open settings and account"><UserRound size={19} /></NavLink></div>
        </header>
        <section className="route-stage">{children}</section>
      </main>

      <nav className="bottom-navigation" aria-label="Mobile navigation">
        {navigation.filter((item) => item.mobile).map((item) => {
          const Icon = item.icon
          return <NavLink key={item.path} to={item.path} className={({ isActive }) => `${isActive ? 'bottom-nav-link active' : 'bottom-nav-link'}${item.path === '/create' ? ' create-link' : ''}`}><Icon size={20} aria-hidden="true" /><span>{item.label === 'Discover Topics' ? 'Discover' : item.label === 'Create Post' ? 'Create' : item.label}</span></NavLink>
        })}
      </nav>
    </div>
  )
}
