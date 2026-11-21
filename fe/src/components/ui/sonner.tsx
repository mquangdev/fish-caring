import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** Toasts follow the system light/dark setting through sonner's own "system" theme. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      position="top-center"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
