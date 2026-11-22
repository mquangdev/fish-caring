import { ArrowLeft, Fish } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { FishListEditor } from '@/components/FishListEditor'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { rowsFromFish, rowsToPayload, type FishRow } from '@/lib/fishRows'
import { formatLiters } from '@/lib/format'
import { parseId } from '@/lib/ids'
import {
  validateDimensions,
  validateFishRow,
  validateNote,
  validateTankName,
  validateVolume,
  type DimensionErrors,
  type FishRowErrors,
} from '@/lib/validation'
import { calculateVolumeLiters, parseDecimal } from '@/lib/volume'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearCurrent, createTank, fetchTank, updateTank } from '@/store/tanksSlice'
import type { TankPayload } from '@/types/api'

type SizeMode = 'volume' | 'dimensions'

const SIZE_OPTIONS: { value: SizeMode; label: string }[] = [
  { value: 'volume', label: 'Nhập thể tích' },
  { value: 'dimensions', label: 'Nhập kích thước' },
]

interface FormErrors {
  name?: string | null
  volume?: string | null
  dimensions?: DimensionErrors
  note?: string | null
  rows: Record<string, FishRowErrors>
}

/** The volume shown under the dimension fields, or null until all three are valid numbers. */
function previewVolume(length: string, width: string, height: string): number | null {
  const l = parseDecimal(length)
  const w = parseDecimal(width)
  const h = parseDecimal(height)
  if (l === null || w === null || h === null || l === 0 || w === 0 || h === 0) return null
  return calculateVolumeLiters(l, w, h)
}

/** Create a tank (/tanks/new) or edit one (/tanks/:id/edit). */
export default function TankFormPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = id !== undefined
  // null when the URL has no id or the id is not a positive whole number
  const tankId = parseId(id)

  const { current, detailStatus, detailError, detailNotFound, saveStatus, saveError, saveFieldErrors } =
    useAppSelector((state) => state.tanks)

  const [ready, setReady] = useState(!editing)
  const [name, setName] = useState('')
  const [sizeMode, setSizeMode] = useState<SizeMode>('volume')
  const [volume, setVolume] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [setupDate, setSetupDate] = useState('')
  const [note, setNote] = useState('')
  const [rows, setRows] = useState<FishRow[]>([])
  const [errors, setErrors] = useState<FormErrors>({ rows: {} })

  useEffect(() => {
    dispatch(clearCurrent())
    if (tankId !== null) {
      void dispatch(fetchTank(tankId))
    }
  }, [dispatch, tankId])

  // Fill the form once the tank has been loaded (edit mode only).
  useEffect(() => {
    if (editing && !ready && current && current.id === tankId && detailStatus === 'succeeded') {
      const hasDimensions = current.lengthCm !== null && current.widthCm !== null && current.heightCm !== null
      setName(current.name)
      setSizeMode(hasDimensions ? 'dimensions' : 'volume')
      setVolume(current.volumeLiters === null ? '' : String(current.volumeLiters))
      setLength(current.lengthCm === null ? '' : String(current.lengthCm))
      setWidth(current.widthCm === null ? '' : String(current.widthCm))
      setHeight(current.heightCm === null ? '' : String(current.heightCm))
      setSetupDate(current.setupDate ?? '')
      setNote(current.note ?? '')
      setRows(rowsFromFish(current.fish))
      setReady(true)
    }
  }, [editing, ready, current, tankId, detailStatus])

  const saving = saveStatus === 'loading'
  const backTo = tankId !== null ? `/tanks/${tankId}` : '/tanks'
  const fishServerError =
    Object.entries(saveFieldErrors).find(([field]) => field === 'fish' || field.startsWith('fish['))?.[1] ?? null
  const volumePreview = sizeMode === 'dimensions' ? previewVolume(length, width, height) : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const rowErrors: Record<string, FishRowErrors> = {}
    for (const row of rows) {
      const result = validateFishRow(row.speciesName, row.quantity)
      if (result.speciesName || result.quantity) rowErrors[row.key] = result
    }
    const dimensions = sizeMode === 'dimensions' ? validateDimensions(length, width, height) : undefined
    const next: FormErrors = {
      name: validateTankName(name),
      volume: sizeMode === 'volume' ? validateVolume(volume) : null,
      dimensions,
      note: validateNote(note),
      rows: rowErrors,
    }
    setErrors(next)
    const dimensionProblem = dimensions && (dimensions.length || dimensions.width || dimensions.height || dimensions.volume)
    if (next.name || next.volume || dimensionProblem || next.note || Object.keys(rowErrors).length > 0) return

    // Only the chosen way of entering the size is sent; the server calculates the volume from the dimensions.
    const byDimensions = sizeMode === 'dimensions' && length.trim() !== ''
    const payload: TankPayload = {
      name: name.trim(),
      volumeLiters: sizeMode === 'volume' ? parseDecimal(volume) : null,
      lengthCm: byDimensions ? parseDecimal(length) : null,
      widthCm: byDimensions ? parseDecimal(width) : null,
      heightCm: byDimensions ? parseDecimal(height) : null,
      setupDate: setupDate || null,
      note: note.trim() ? note.trim() : null,
      fish: rowsToPayload(rows),
    }

    if (tankId !== null) {
      const result = await dispatch(updateTank({ id: tankId, payload }))
      if (updateTank.fulfilled.match(result)) {
        toast.success('Đã lưu bể.')
        navigate(`/tanks/${result.payload.id}`, { replace: true })
      }
    } else {
      const result = await dispatch(createTank(payload))
      if (createTank.fulfilled.match(result)) {
        toast.success('Đã lưu bể.')
        navigate(`/tanks/${result.payload.id}`, { replace: true })
      }
    }
  }

  const heading = (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="icon" aria-label="Quay lại">
        <Link to={backTo}>
          <ArrowLeft aria-hidden="true" />
        </Link>
      </Button>
      <h1 className="text-2xl font-bold">{editing ? 'Sửa bể' : 'Thêm bể'}</h1>
    </div>
  )

  if (editing && (tankId === null || detailNotFound)) {
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <EmptyState
          icon={Fish}
          title="Không tìm thấy bể"
          description="Bể này không tồn tại hoặc đã bị xoá."
          action={
            <Button asChild>
              <Link to="/tanks">Về danh sách bể</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (editing && detailStatus === 'failed') {
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 px-6 py-8 text-center">
          <p className="text-destructive">{detailError}</p>
          <Button variant="outline" onClick={() => tankId !== null && void dispatch(fetchTank(tankId))}>
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải bể">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  const dimensionErrors = errors.dimensions
  const volumeError = dimensionErrors?.volume ?? saveFieldErrors.volumeLiters ?? null

  return (
    <div className="flex flex-col gap-6">
      {heading}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {saveError ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {saveError}
          </p>
        ) : null}

        <FormField
          id="name"
          label="Tên bể"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name ?? saveFieldErrors.name ?? null}
        />

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm leading-none font-medium">Kích thước bể (không bắt buộc)</legend>
          <SegmentedControl
            label="Cách nhập kích thước bể"
            value={sizeMode}
            options={SIZE_OPTIONS}
            onChange={setSizeMode}
          />

          {sizeMode === 'volume' ? (
            <FormField
              id="volume"
              label="Thể tích (lít)"
              inputMode="decimal"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              error={errors.volume ?? saveFieldErrors.volumeLiters ?? null}
            />
          ) : (
            <>
              <div className="grid grid-cols-3 items-start gap-3">
                <FormField
                  id="length"
                  label="Dài (cm)"
                  inputMode="decimal"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  error={dimensionErrors?.length ?? saveFieldErrors.lengthCm ?? null}
                />
                <FormField
                  id="width"
                  label="Rộng (cm)"
                  inputMode="decimal"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  error={dimensionErrors?.width ?? saveFieldErrors.widthCm ?? null}
                />
                <FormField
                  id="height"
                  label="Cao (cm)"
                  inputMode="decimal"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  error={dimensionErrors?.height ?? saveFieldErrors.heightCm ?? null}
                />
              </div>
              <p aria-live="polite" className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
                {volumePreview === null ? 'Nhập đủ dài, rộng, cao để tính thể tích.' : `Thể tích: ${formatLiters(volumePreview)}`}
              </p>
              {volumeError ? (
                <p role="alert" className="text-sm text-destructive">
                  {volumeError}
                </p>
              ) : null}
            </>
          )}
        </fieldset>

        <FormField
          id="setupDate"
          label="Ngày setup"
          type="date"
          hint="Không bắt buộc."
          value={setupDate}
          onChange={(e) => setSetupDate(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="note">Ghi chú</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={errors.note || saveFieldErrors.note ? true : undefined}
          />
          {errors.note || saveFieldErrors.note ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.note ?? saveFieldErrors.note}
            </p>
          ) : null}
        </div>

        <FishListEditor
          rows={rows}
          onChange={setRows}
          errors={errors.rows}
          listError={fishServerError}
          disabled={saving}
        />

        <div className="flex flex-col gap-3 pt-2">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
          <Button asChild variant="outline">
            <Link to={backTo}>Huỷ</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
