import { BellOff, BellRing } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { IosInstallGuide } from '@/components/IosInstallGuide'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { disablePush, enablePush, refreshPushState } from '@/store/pushSlice'

/** Turn Web Push on or off for this device, with the right message for every situation. */
export function PushSettingsCard() {
  const dispatch = useAppDispatch()
  const { support, permission, subscribed, serverReady, status, error } = useAppSelector((state) => state.push)
  const busy = status === 'loading'

  useEffect(() => {
    void dispatch(refreshPushState())
  }, [dispatch])

  async function handleEnable() {
    const result = await dispatch(enablePush())
    if (enablePush.fulfilled.match(result)) {
      toast.success('Đã bật thông báo trên thiết bị này.')
    }
  }

  async function handleDisable() {
    const result = await dispatch(disablePush())
    if (disablePush.fulfilled.match(result)) {
      toast.success('Đã tắt thông báo trên thiết bị này.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông báo trên điện thoại</CardTitle>
        <CardDescription>
          Nhận nhắc trước 30 phút khi gần đến giờ chăm, kể cả khi đã đóng trình duyệt.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {support === 'ios-needs-install' ? <IosInstallGuide /> : null}

        {support === 'unsupported' ? (
          <p className="text-sm text-muted-foreground">
            Trình duyệt này chưa hỗ trợ thông báo đẩy. Bạn vẫn nhận thông báo trong app.
          </p>
        ) : null}

        {support === 'supported' && serverReady === false ? (
          <p className="text-sm text-muted-foreground">
            Máy chủ chưa bật thông báo đẩy. Bạn vẫn nhận thông báo trong app.
          </p>
        ) : null}

        {support === 'supported' && serverReady && permission === 'denied' ? (
          <p role="status" className="flex items-start gap-2 text-sm">
            <BellOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            Thông báo đang bị chặn. Hãy cho phép thông báo cho trang này trong cài đặt của trình duyệt, rồi tải lại
            trang.
          </p>
        ) : null}

        {support === 'supported' && serverReady && permission !== 'denied' && subscribed ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="flex items-center gap-2 text-sm font-medium">
              <BellRing className="size-5 shrink-0 text-primary" aria-hidden="true" />
              Đã bật trên thiết bị này.
            </p>
            <Button variant="outline" disabled={busy} onClick={() => void handleDisable()}>
              {busy ? 'Đang tắt...' : 'Tắt thông báo'}
            </Button>
          </div>
        ) : null}

        {support === 'supported' && serverReady && permission !== 'denied' && !subscribed ? (
          <Button disabled={busy} onClick={() => void handleEnable()}>
            {busy ? 'Đang bật...' : 'Bật thông báo'}
          </Button>
        ) : null}

        {error && status === 'failed' ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
