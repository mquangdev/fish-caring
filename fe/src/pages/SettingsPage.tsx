import { LogOut } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateDisplayName } from '@/lib/validation'
import { clearAuthError, signOut, updateDisplayName } from '@/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user, status, error, fieldErrors } = useAppSelector((state) => state.auth)

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  const saving = status === 'loading'
  const unchanged = displayName.trim() === (user?.displayName ?? '')

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = validateDisplayName(displayName)
    setLocalError(problem)
    if (problem) return

    const result = await dispatch(updateDisplayName(displayName.trim()))
    if (updateDisplayName.fulfilled.match(result)) {
      toast.success('Đã lưu tên hiển thị.')
    }
  }

  function handleLogout() {
    dispatch(signOut())
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Cài đặt</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tài khoản</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
            {error ? (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <FormField
              id="displayName"
              label="Tên hiển thị"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={localError ?? fieldErrors.displayName ?? null}
            />
            <Button type="submit" disabled={saving || unchanged}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={handleLogout}>
        <LogOut aria-hidden="true" />
        Đăng xuất
      </Button>
    </div>
  )
}
