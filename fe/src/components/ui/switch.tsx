import { Switch as SwitchPrimitive } from 'radix-ui'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * On/off toggle. The visible track is small, but the button around it is at least 44px tall and
 * wide so it is easy to tap.
 */
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'group inline-flex min-h-11 min-w-14 shrink-0 items-center justify-center rounded-lg outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="flex h-6 w-11 items-center rounded-full bg-input p-0.5 transition-colors group-data-[state=checked]:bg-primary">
        <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-background shadow transition-transform group-data-[state=checked]:translate-x-5" />
      </span>
    </SwitchPrimitive.Root>
  )
}
