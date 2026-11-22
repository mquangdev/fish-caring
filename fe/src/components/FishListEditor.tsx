import { Plus, Trash2 } from 'lucide-react'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { FISH_STATUS_LABELS } from '@/lib/labels'
import { newFishRow, type FishRow } from '@/lib/fishRows'
import type { FishRowErrors } from '@/lib/validation'
import type { FishStatus } from '@/types/api'

const STATUS_OPTIONS = (Object.keys(FISH_STATUS_LABELS) as FishStatus[]).map((value) => ({
  value,
  label: FISH_STATUS_LABELS[value],
}))

interface FishListEditorProps {
  rows: FishRow[]
  onChange: (rows: FishRow[]) => void
  /** Validation messages per row key. */
  errors?: Record<string, FishRowErrors>
  /** A message about the list as a whole (for example from the server). */
  listError?: string | null
  disabled?: boolean
}

/** Edit the fish of a tank. New rows go on top, so the newest fish is always first. */
export function FishListEditor({ rows, onChange, errors = {}, listError, disabled }: FishListEditorProps) {
  function updateRow(key: string, changes: Partial<FishRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...changes } : row)))
  }

  return (
    <section aria-labelledby="fish-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="fish-heading" className="text-lg font-semibold">
          Cá trong bể
        </h2>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange([newFishRow(), ...rows])}>
          <Plus aria-hidden="true" />
          Thêm cá
        </Button>
      </div>

      {listError ? (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Chưa có cá nào. Bấm “Thêm cá” để ghi lại các loài trong bể.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const rowErrors = errors[row.key]
            return (
              <li key={row.key} className="flex flex-col gap-3 rounded-xl border bg-card p-4" data-testid="fish-row">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <FormField
                      id={`${row.key}-species`}
                      label="Loài"
                      value={row.speciesName}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.key, { speciesName: e.target.value })}
                      error={rowErrors?.speciesName}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    aria-label={`Xoá dòng cá ${row.speciesName || ''}`.trim()}
                    disabled={disabled}
                    onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-28 shrink-0">
                    <FormField
                      id={`${row.key}-quantity`}
                      label="Số lượng"
                      inputMode="numeric"
                      value={row.quantity}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      error={rowErrors?.quantity}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <span className="text-sm leading-none font-medium">Trạng thái</span>
                    <SegmentedControl
                      label={`Trạng thái của ${row.speciesName || 'dòng cá'}`}
                      value={row.status}
                      options={STATUS_OPTIONS}
                      disabled={disabled}
                      onChange={(status) => updateRow(row.key, { status })}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
