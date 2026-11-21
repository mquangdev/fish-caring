import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { restoreSession } from '@/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

/** Guards routes that need a logged-in user. After a reload it first checks the stored token. */
export function RequireAuth() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const { token, user, initialized } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (token && !initialized) {
      void dispatch(restoreSession())
    }
  }, [dispatch, token, initialized])

  if (!initialized) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 pt-6" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
