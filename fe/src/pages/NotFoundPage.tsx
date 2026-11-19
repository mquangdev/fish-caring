import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
      <Link to="/" className="mt-4 inline-block text-sky-600 underline">
        Về trang chủ
      </Link>
    </main>
  )
}
