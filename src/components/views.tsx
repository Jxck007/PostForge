import type { ReactNode } from 'react'

export function TodayView({ children }: { children: ReactNode }) {
  return <div className="today-view">{children}</div>
}

export function DiscoverView({ children }: { children: ReactNode }) {
  return <div className="discover-view">{children}</div>
}

export function StudioView({ children }: { children: ReactNode }) {
  return <div className="studio-view">{children}</div>
}

export function LibraryView({ children }: { children: ReactNode }) {
  return <div className="library-view">{children}</div>
}

export function SettingsView({ children }: { children: ReactNode }) {
  return <div className="settings-view">{children}</div>
}
