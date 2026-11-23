import { Label } from '@/components/ui/label'
import { TimePicker } from '@/components/ui/time-picker'

interface TimeFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string | null
  hint?: string
  disabled?: boolean
}

/** Label + 24-hour time input + message, wired together for screen readers. */
export function TimeField({ id, label, value, onChange, error, hint, disabled }: TimeFieldProps) {
  const messageId = `${id}-message`
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <TimePicker
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
      />
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
