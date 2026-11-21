import { Fish } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
}

/** Frame shared by the login and register screens. */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Fish className="size-7" aria-hidden="true" />
        </div>
        <p className="text-xl font-semibold">Fish Caring</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  )
}
