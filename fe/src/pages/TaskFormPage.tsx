import { ArrowLeft, CalendarX } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateField } from '@/components/DateField'
import { EmptyState } from '@/components/EmptyState'
import { FormField } from '@/components/FormField'
import { TimeField } from '@/components/TimeField'
import { TaskDetailField, type TaskDetailErrors, type TaskDetailValues } from '@/components/TaskDetailField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/format'
import { parseId } from '@/lib/ids'
import { DEFAULT_TASK_TITLES, REPEAT_TYPE_LABELS, TASK_TYPE_LABELS } from '@/lib/labels'
import { firstDue, vietnamNow } from '@/lib/schedule'
import { isValidTime } from '@/lib/timeInput'
import {
  validateFertilizerMl,
  validateFoodName,
  validateInterval,
  validateTaskDate,
  validateTaskNote,
  validateTaskTitle,
  validateTime,
  validateWaterChangePercent,
} from '@/lib/validation'
import { parseDecimal } from '@/lib/volume'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchTanks } from '@/store/tanksSlice'
import { clearCurrentTask, createTask, fetchTask, updateTask } from '@/store/tasksSlice'
import type { RepeatType, TaskPayload, TaskType } from '@/types/api'

const TYPE_OPTIONS = (Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((value) => ({
  value,
  label: TASK_TYPE_LABELS[value],
}))
const REPEAT_OPTIONS = (Object.keys(REPEAT_TYPE_LABELS) as RepeatType[]).map((value) => ({
  value,
  label: REPEAT_TYPE_LABELS[value],
}))

interface FormErrors extends TaskDetailErrors {
  title?: string | null
  note?: string | null
  time?: string | null
  interval?: string | null
  date?: string | null
}

/**
 * Add a care task (/tanks/:id/tasks/new for a tank, /tasks/new for no tank) or edit one
 * (/tasks/:taskId/edit). The "Gắn với" field moves the task to a tank or to no tank.
 */
export default function TaskFormPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { id, taskId: taskParam } = useParams()
  const editing = taskParam !== undefined
  const taskId = parseId(taskParam)
  const presetTankId = id === undefined ? null : parseId(id)

  const tanks = useAppSelector((state) => state.tanks)
  const { current: task, currentStatus, currentError, currentNotFound, saveStatus, saveError, saveFieldErrors } =
    useAppSelector((state) => state.tasks)
  const saving = saveStatus === 'loading'

  const [loaded, setLoaded] = useState(false)
  const [ready, setReady] = useState(false)
  const [tankChoice, setTankChoice] = useState(presetTankId === null ? '' : String(presetTankId))
  const [type, setType] = useState<TaskType>('FEED')
  const [title, setTitle] = useState(DEFAULT_TASK_TITLES.FEED)
  const [titleEdited, setTitleEdited] = useState(false)
  const [details, setDetails] = useState<TaskDetailValues>({ foodName: '', waterChangePercent: '', fertilizerMl: '' })
  const [note, setNote] = useState('')
  const [repeatType, setRepeatType] = useState<RepeatType>('DAILY')
  const [timeOfDay, setTimeOfDay] = useState('08:00')
  const [interval, setIntervalText] = useState('7')
  const [startDate, setStartDate] = useState(vietnamNow().slice(0, 10))
  const [errors, setErrors] = useState<FormErrors>({})

  const load = useCallback(() => {
    setLoaded(false)
    setReady(false)
    dispatch(clearCurrentTask())
    const requests: Promise<unknown>[] = [dispatch(fetchTanks())]
    if (editing && taskId !== null) requests.push(dispatch(fetchTask(taskId)))
    void Promise.all(requests).then(() => setLoaded(true))
  }, [dispatch, editing, taskId])

  useEffect(() => {
    load()
  }, [load])

  // Fill the form once the tanks (and the task, when editing) have been loaded.
  useEffect(() => {
    if (ready || !loaded || tanks.listStatus !== 'succeeded') return
    if (editing) {
      if (currentStatus !== 'succeeded' || !task) return
      setTankChoice(task.tankId === null ? '' : String(task.tankId))
      setType(task.type)
      setTitle(task.title)
      setTitleEdited(true)
      setDetails({
        foodName: task.foodName ?? '',
        waterChangePercent: task.waterChangePercent === null ? '' : String(task.waterChangePercent),
        fertilizerMl: task.fertilizerMl === null ? '' : String(task.fertilizerMl),
      })
      setNote(task.note ?? '')
      setRepeatType(task.repeatType)
      setTimeOfDay(task.timeOfDay)
      setIntervalText(task.intervalDays === null ? '7' : String(task.intervalDays))
      setStartDate(task.startDate ?? vietnamNow().slice(0, 10))
    }
    setReady(true)
  }, [ready, loaded, tanks.listStatus, editing, currentStatus, task])

  function chooseType(next: TaskType) {
    setType(next)
    if (!titleEdited) setTitle(DEFAULT_TASK_TITLES[next])
  }

  // Cancel goes back to where the form was opened from.
  const originTankId = editing ? (task?.tankId ?? null) : presetTankId
  const backTo = originTankId !== null ? `/tanks/${originTankId}` : '/tanks'
  const selectedTank = tanks.items.find((tank) => String(tank.id) === tankChoice)
  const intervalDays = repeatType === 'EVERY_N_DAYS' ? parseWholeNumber(interval) : null
  // the preview needs a real time; text that is still being typed gives none
  const preview = isValidTime(timeOfDay)
    ? firstDue(
        { repeatType, timeOfDay, intervalDays, startDate: repeatType === 'DAILY' ? null : startDate || null },
        vietnamNow(),
      )
    : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dateRule = repeatType === 'DAILY' ? null : repeatType
    // A one-off task that is already in the past may still have its text edited.
    const timingUnchanged =
      task !== null && task.repeatType === 'ONCE' && task.startDate === startDate && task.timeOfDay === timeOfDay
    const next: FormErrors = {
      title: validateTaskTitle(title),
      note: validateTaskNote(note),
      time: validateTime(timeOfDay),
      interval: repeatType === 'EVERY_N_DAYS' ? validateInterval(interval) : null,
      date: dateRule && !timingUnchanged ? validateTaskDate(startDate, dateRule, timeOfDay, vietnamNow()) : null,
      foodName: type === 'FEED' ? validateFoodName(details.foodName) : null,
      waterChangePercent: type === 'WATER_CHANGE' ? validateWaterChangePercent(details.waterChangePercent) : null,
      fertilizerMl: type === 'FERTILIZE' ? validateFertilizerMl(details.fertilizerMl) : null,
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    // Only the detail of the chosen type is sent.
    const payload: TaskPayload = {
      tankId: tankChoice ? Number(tankChoice) : null,
      type,
      title: title.trim(),
      note: note.trim() ? note.trim() : null,
      repeatType,
      intervalDays,
      timeOfDay,
      startDate: repeatType === 'DAILY' ? null : startDate,
      foodName: type === 'FEED' && details.foodName.trim() ? details.foodName.trim() : null,
      waterChangePercent:
        type === 'WATER_CHANGE' && details.waterChangePercent.trim() ? Number(details.waterChangePercent) : null,
      fertilizerMl: type === 'FERTILIZE' ? parseDecimal(details.fertilizerMl) : null,
    }

    const result =
      editing && taskId !== null ? await dispatch(updateTask({ id: taskId, payload })) : await dispatch(createTask(payload))
    if (createTask.fulfilled.match(result) || updateTask.fulfilled.match(result)) {
      toast.success('Đã lưu lịch chăm.')
      const savedTankId = result.payload.tankId
      navigate(savedTankId !== null ? `/tanks/${savedTankId}` : '/tanks', { replace: true })
    }
  }

  const heading = (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="icon" aria-label="Quay lại">
        <Link to={backTo}>
          <ArrowLeft aria-hidden="true" />
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold">{editing ? 'Sửa lịch chăm' : 'Thêm lịch chăm'}</h1>
        {ready ? <p className="truncate text-sm text-muted-foreground">{selectedTank?.name ?? 'Việc chung'}</p> : null}
      </div>
    </div>
  )

  const tankMissing =
    loaded && tanks.listStatus === 'succeeded' && presetTankId !== null && !tanks.items.some((tank) => tank.id === presetTankId)
  const taskMissing = editing && (taskId === null || (loaded && currentNotFound))
  if (id !== undefined && presetTankId === null) return notFoundView(heading, 'Không tìm thấy bể', 'Bể này không tồn tại hoặc đã bị xoá.')
  if (tankMissing) return notFoundView(heading, 'Không tìm thấy bể', 'Bể này không tồn tại hoặc đã bị xoá.')
  if (taskMissing) return notFoundView(heading, 'Không tìm thấy lịch', 'Lịch này không tồn tại hoặc đã bị xoá.')

  const loadError = loaded && tanks.listStatus === 'failed' ? tanks.listError : loaded && editing && currentStatus === 'failed' ? currentError : null
  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 px-6 py-8 text-center">
          <p className="text-destructive">{loadError}</p>
          <Button variant="outline" onClick={load}>
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
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải lịch chăm">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  const detailErrors: TaskDetailErrors = {
    foodName: errors.foodName ?? saveFieldErrors.foodName ?? null,
    waterChangePercent: errors.waterChangePercent ?? saveFieldErrors.waterChangePercent ?? null,
    fertilizerMl: errors.fertilizerMl ?? saveFieldErrors.fertilizerMl ?? null,
  }

  return (
    <div className="flex flex-col gap-6">
      {heading}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {saveError ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {saveError}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="tankId">Gắn với</Label>
          <Select
            id="tankId"
            value={tankChoice}
            onChange={(e) => setTankChoice(e.target.value)}
            aria-invalid={saveFieldErrors.tankId ? true : undefined}
          >
            <option value="">Không gắn bể</option>
            {tanks.items.map((tank) => (
              <option key={tank.id} value={String(tank.id)}>
                {tank.name}
              </option>
            ))}
          </Select>
          {saveFieldErrors.tankId ? (
            <p role="alert" className="text-sm text-destructive">
              {saveFieldErrors.tankId}
            </p>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm leading-none font-medium">Loại việc</legend>
          <SegmentedControl label="Loại việc" value={type} options={TYPE_OPTIONS} onChange={chooseType} />
        </fieldset>

        <FormField
          id="title"
          label="Tiêu đề"
          autoComplete="off"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setTitleEdited(true)
          }}
          error={errors.title ?? saveFieldErrors.title ?? null}
        />

        <TaskDetailField type={type} values={details} errors={detailErrors} onChange={setDetails} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="note">Ghi chú</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={errors.note || saveFieldErrors.note ? true : undefined}
          />
          {errors.note ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.note}
            </p>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm leading-none font-medium">Lặp lại</legend>
          <SegmentedControl label="Kiểu lặp" value={repeatType} options={REPEAT_OPTIONS} onChange={setRepeatType} />

          <TimeField
            id="timeOfDay"
            label="Giờ nhắc"
            hint="Bấm để chọn giờ (24 giờ)."
            value={timeOfDay}
            onChange={setTimeOfDay}
            error={errors.time ?? saveFieldErrors.timeOfDay ?? null}
          />

          {repeatType === 'EVERY_N_DAYS' ? (
            <FormField
              id="intervalDays"
              label="Số ngày"
              hint="Từ 2 đến 60 ngày."
              inputMode="numeric"
              value={interval}
              onChange={(e) => setIntervalText(e.target.value)}
              error={errors.interval ?? saveFieldErrors.intervalDays ?? null}
            />
          ) : null}

          {repeatType !== 'DAILY' ? (
            <DateField
              id="startDate"
              label={repeatType === 'ONCE' ? 'Ngày' : 'Ngày bắt đầu'}
              value={startDate}
              onChange={setStartDate}
              error={errors.date ?? saveFieldErrors.startDate ?? null}
            />
          ) : null}

          <p aria-live="polite" className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
            {preview ? `Lần nhắc đầu tiên: ${formatDateTime(preview)}` : 'Nhập đủ thông tin để xem lần nhắc đầu tiên.'}
          </p>
        </fieldset>

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

function notFoundView(heading: ReactNode, title: string, description: string) {
  return (
    <div className="flex flex-col gap-6">
      {heading}
      <EmptyState
        icon={CalendarX}
        title={title}
        description={description}
        action={
          <Button asChild>
            <Link to="/tanks">Về danh sách bể</Link>
          </Button>
        }
      />
    </div>
  )
}

/** "7" -> 7; anything that is not a whole number -> null. */
function parseWholeNumber(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null
}
