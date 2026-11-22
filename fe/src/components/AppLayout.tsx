import { Bell, CalendarCheck, Fish, Settings, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useNotificationPolling } from '@/hooks/useNotificationPolling'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Hôm nay', icon: CalendarCheck, end: true },
  { to: '/tanks', label: 'Bể của tôi', icon: Fish },
  { to: '/notifications', label: 'Thông báo', icon: Bell },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
]

/** Page frame with the bottom navigation, used by every screen that needs a logged-in user. */
export function AppLayout() {
  useNotificationPolling()
  const unreadCount = useAppSelector((state) => state.notifications.unreadCount)

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col md:max-w-2xl">
      <main className="flex-1 px-4 pt-6 pb-28">
        <Outlet />
      </main>
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      >
        <ul className="mx-auto flex max-w-md md:max-w-2xl">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors',
                    'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-14 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-accent',
                      )}
                    >
                      <span className="relative">
                        <Icon className="size-5" aria-hidden="true" />
                        {to === '/notifications' && unreadCount > 0 ? (
                          <span
                            aria-hidden="true"
                            className="absolute -top-2 -right-3 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-bold text-white"
                          >
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span>
                      {label}
                      {to === '/notifications' && unreadCount > 0 ? (
                        <span className="sr-only">, {unreadCount} chưa đọc</span>
                      ) : null}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
