import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { validateEmail, validatePassword } from '@/lib/validation'
import { clearAuthError, login } from '@/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

interface LocationState {
  from?: { pathname?: string }
}

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { token, user, status, error } = useAppSelector((state) => state.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({})

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/'
  const submitting = status === 'loading'

  if (token && user) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = { email: validateEmail(email), password: validatePassword(password, true) }
    setErrors(next)
    if (next.email || next.password) return

    const result = await dispatch(login({ email: email.trim(), password }))
    if (login.fulfilled.match(result)) {
      navigate(redirectTo, { replace: true })
    }
  }

  return (
    <AuthLayout title="Đăng nhập" description="Chào mừng bạn quay lại với những bể cá của mình.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <FormField
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <FormField
          id="password"
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="inline-block py-3 font-medium text-primary underline-offset-4 hover:underline">
            Đăng ký
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
