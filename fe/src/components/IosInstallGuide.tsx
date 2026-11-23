/** Step by step: on iPhone and iPad notifications work only after the app was added to the Home Screen. */
export function IosInstallGuide() {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground">
      <p className="font-medium">Để nhận thông báo trên iPhone hoặc iPad, hãy thêm Fish Caring vào Màn hình chính:</p>
      <ol className="flex list-decimal flex-col gap-1 pl-5">
        <li>Mở trang này bằng Safari.</li>
        <li>Bấm nút Chia sẻ (hình vuông có mũi tên hướng lên) ở thanh công cụ.</li>
        <li>Chọn “Thêm vào Màn hình chính”, rồi bấm “Thêm”.</li>
        <li>Mở Fish Caring từ biểu tượng vừa thêm ở Màn hình chính.</li>
        <li>Vào Cài đặt và bấm “Bật thông báo”.</li>
      </ol>
      <p className="text-muted-foreground">Cần iOS hoặc iPadOS 16.4 trở lên.</p>
    </div>
  )
}
