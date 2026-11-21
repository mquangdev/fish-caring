import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { validateDisplayName, validateEmail, validatePassword } from '@/lib/validation'
import { clearAuthError, register } from '@/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

type FieldErrors = { displayName?: string | null; email?: string | null; password?: string | null }

export default function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { token, user, status, error, fieldErrors } = useAppSelector((state) => state.auth)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  const submitting = status === 'loading'

  if (token && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: FieldErrors = {
      displayName: validateDisplayName(displayName),
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setErrors(next)
    if (next.displayName || next.email || next.password) return

    const result = await dispatch(
      register({ displayName: displayName.trim(), email: email.trim(), password }),
    )
    if (register.fulfilled.match(result)) {
      navigate('/', { replace: true })
    }
  }

  // Local checks win; otherwise show what the server said about the field.
  const shown = (field: keyof FieldErrors) => errors[field] ?? fieldErrors[field] ?? null

  return (
    <AuthLayout title="Tạo tài khoản" description="Chỉ mất một phút để bắt đầu nhắc lịch chăm bể cá.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
          error={shown('displayName')}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={shown('email')}
        />
        <FormField
          id="password"
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          hint="Tối thiểu 8 ký tự."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={shown('password')}
        />
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link to="/login" className="inline-block py-3 font-medium text-primary underline-offset-4 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
