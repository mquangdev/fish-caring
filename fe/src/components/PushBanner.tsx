import { BellRing } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { dismissBanner, enablePush, refreshPushState } from '@/store/pushSlice'

/**
 * Invites the user to turn on push on the "Hôm nay" screen. Shown only when push can work here and is
 * not on yet; "Để sau" hides it for good on this device.
 */
export function PushBanner() {
  const dispatch = useAppDispatch()
  const { support, permission, subscribed, serverReady, status, error, bannerDismissed } = useAppSelector(
    (state) => state.push,
  )

  useEffect(() => {
    void dispatch(refreshPushState())
  }, [dispatch])

  const visible =
    support === 'supported' && serverReady === true && !subscribed && permission !== 'denied' && !bannerDismissed
  if (!visible) return null

  const busy = status === 'loading'

  async function handleEnable() {
    const result = await dispatch(enablePush())
    if (enablePush.fulfilled.match(result)) {
      toast.success('Đã bật thông báo trên thiết bị này.')
    }
  }

  return (
    <section aria-label="Bật thông báo" className="flex flex-col gap-3 rounded-xl border bg-accent px-4 py-4 text-accent-foreground">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="text-sm">Bật thông báo để được nhắc trước 30 phút khi gần đến giờ chăm, kể cả khi đóng trình duyệt.</p>
      </div>
      {error && status === 'failed' ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={busy} onClick={() => void handleEnable()}>
          {busy ? 'Đang bật...' : 'Bật thông báo'}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => dispatch(dismissBanner())}>
          Để sau
        </Button>
      </div>
    </section>
  )
}
