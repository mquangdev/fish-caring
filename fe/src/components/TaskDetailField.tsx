import { FormField } from '@/components/FormField'
import type { TaskType } from '@/types/api'

export interface TaskDetailValues {
  foodName: string
  waterChangePercent: string
  fertilizerMl: string
}

export interface TaskDetailErrors {
  foodName?: string | null
  waterChangePercent?: string | null
  fertilizerMl?: string | null
}

interface TaskDetailFieldProps {
  type: TaskType
  values: TaskDetailValues
  errors: TaskDetailErrors
  onChange: (values: TaskDetailValues) => void
}

/** The one optional input that belongs to the chosen task type ("Khác" has none). */
export function TaskDetailField({ type, values, errors, onChange }: TaskDetailFieldProps) {
  switch (type) {
    case 'FEED':
      return (
        <FormField
          id="foodName"
          label="Loại thức ăn"
          hint="Không bắt buộc. Ví dụ: Hạt 1mm."
          autoComplete="off"
          value={values.foodName}
          onChange={(e) => onChange({ ...values, foodName: e.target.value })}
          error={errors.foodName}
        />
      )
    case 'WATER_CHANGE':
      return (
        <FormField
          id="waterChangePercent"
          label="Thay bao nhiêu % nước"
          hint="Không bắt buộc. Ví dụ: 30."
          inputMode="numeric"
          value={values.waterChangePercent}
          onChange={(e) => onChange({ ...values, waterChangePercent: e.target.value })}
          error={errors.waterChangePercent}
        />
      )
    case 'FERTILIZE':
      return (
        <FormField
          id="fertilizerMl"
          label="Lượng phân nước (ml)"
          hint="Không bắt buộc. Ví dụ: 5."
          inputMode="decimal"
          value={values.fertilizerMl}
          onChange={(e) => onChange({ ...values, fertilizerMl: e.target.value })}
          error={errors.fertilizerMl}
        />
      )
    case 'OTHER':
      return null
  }
}
