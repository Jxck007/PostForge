import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Cloud, CloudOff, type LucideIcon } from 'lucide-react'

export type AppView = 'today' | 'discover' | 'studio' | 'library'

type NavigationItem = { id: AppView; label: string; icon: LucideIcon }

type AppShellProps = {
  activeView: AppView
  onViewChange: (view: AppView) => void
  navigation: NavigationItem[]
  isRailExpanded: boolean
  onRailToggle: () => void
  title: string
  actionLabel: string
  onAction: () => void
  actionDisabled?: boolean
  isCloudWorkspace: boolean
  statusMessage: string
  account: ReactNode
  children: ReactNode
}

export function AppShell({
  activeView,
  onViewChange,
  navigation,
  isRailExpanded,
  onRailToggle,
  title,
  actionLabel,
  onAction,
  actionDisabled = false,
  isCloudWorkspace,
  statusMessage,
  account,
  children,
}: AppShellProps) {
  return (
    <div className={isRailExpanded ? 'studio-shell rail-expanded' : 'studio-shell'}>
      <aside className="navigation-rail" aria-label="Primary navigation">
        <div className="rail-brand"><span>PF</span><strong>PostForge</strong></div>
        <nav className="rail-links">
          {navigation.map((item) => {
            const Icon = item.icon
            return <button key={item.id} type="button" className={activeView === item.id ? 'rail-link active' : 'rail-link'} onClick={() => onViewChange(item.id)} aria-current={activeView === item.id ? 'page' : undefined}><Icon size={19} /><span>{item.label}</span></button>
          })}
        </nav>
        <button type="button" className="rail-toggle" onClick={onRailToggle} aria-label={isRailExpanded ? 'Collapse navigation' : 'Expand navigation'}>{isRailExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}<span>{isRailExpanded ? 'Collapse' : 'Expand'}</span></button>
      </aside>

      <main className="studio-main">
        <header className="studio-topbar">
          <div><p className="topbar-kicker">PostForge Studio</p><h1>{title}</h1></div>
          <div className="topbar-tools"><span className={isCloudWorkspace ? 'sync-indicator cloud' : 'sync-indicator'}>{isCloudWorkspace ? <Cloud size={15} /> : <CloudOff size={15} />}{isCloudWorkspace ? 'Cloud workspace' : 'Local workspace'}</span><span className="topbar-status" role="status">{statusMessage}</span><button type="button" className="topbar-action" onClick={onAction} disabled={actionDisabled}>{actionLabel}</button>{account}</div>
        </header>
        <section className="page-stage" key={activeView}>{children}</section>
      </main>

      <nav className="mobile-nav" aria-label="Primary navigation">
        {navigation.map((item) => {
          const Icon = item.icon
          return <button key={item.id} type="button" className={activeView === item.id ? 'mobile-nav-link active' : 'mobile-nav-link'} onClick={() => onViewChange(item.id)} aria-current={activeView === item.id ? 'page' : undefined}><Icon size={19} /><span>{item.label}</span></button>
        })}
      </nav>
    </div>
  )
}
