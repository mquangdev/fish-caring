import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
      <p className="text-muted-foreground">Trang bạn tìm không tồn tại hoặc đã được chuyển đi.</p>
      <Button asChild>
        <Link to="/">Về trang chủ</Link>
      </Button>
    </main>
  )
}
