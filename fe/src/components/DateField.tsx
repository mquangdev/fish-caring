import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'

interface DateFieldProps {
  id: string
  label: string
  /** An ISO date, the text being typed, or "". */
  value: string
  onChange: (value: string) => void
  error?: string | null
  hint?: string
  disabled?: boolean
}

/** Label + dd/MM/yyyy date input + message, wired together for screen readers. */
export function DateField({ id, label, value, onChange, error, hint, disabled }: DateFieldProps) {
  const messageId = `${id}-message`
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <DateInput
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
