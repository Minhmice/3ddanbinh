# 3D Danbinh - Anatomy Viewer

This is a modern 3D anatomy viewer built with Next.js, React Three Fiber, GSAP, and a premium "Liquid Glass" UI aesthetic. It fetches large 3D models from Google Drive during installation and runs them locally.

## Cấu trúc thư mục
- `/src`: Chứa toàn bộ source code Next.js (giao diện, 3D viewer, UI components).
- `/scripts`: Chứa các script Python để đồng bộ/kéo model từ Google Drive về máy.
- `/public`: Nơi chứa tài nguyên public của frontend.
- `/public/models`: Thư mục lưu trữ file `.glb` sau khi được tải về (Next.js server sẽ tự động serve static file này ở :3000).

## Yêu cầu hệ thống
- **Node.js** (Khuyên dùng v18 hoặc v20+)
- **Python 3.10+** (có sẵn `pip` để tải `gdown`)

## Cài đặt và Chạy dự án

Dự án đã được cấu hình tự động. Bạn làm theo các bước sau:

**1. Mở Terminal / PowerShell tại thư mục gốc của dự án (`3ddanbinh`)**

Tạo và kích hoạt môi trường ảo Python (Virtual Environment):
```bash
python -m venv .venv
.venv\Scripts\activate
```

**2. Tiến hành cài đặt thư viện**
```bash
npm install
```
> **Lưu ý:** Lệnh `npm install` đã được tích hợp hook `postinstall`. Ngay khi cài đặt xong package node, nó sẽ tự động gọi lệnh Python để tải các mô hình 3D (file `.glb`) từ Google Drive vào thẳng `/public/models`.

**3. Khởi động môi trường phát triển (Development)**
Chạy lệnh sau:
```bash
npm run dev
```
Dự án sẽ host frontend và tự động serve luôn file 3D thông qua `/models/*.glb`.

Bạn truy cập vào **[http://localhost:3000](http://localhost:3000)** để sử dụng ứng dụng.

---

## Kiến trúc Giao diện (Liquid Glass)
Sử dụng TailwindCSS và GSAP để tạo ra giao diện kính mờ có chiều sâu, kết hợp các thành phần 3D:
- Floating Panels (khung điều khiển nổi dạng kính mờ)
- Parallax & Smooth Animations (Hiệu ứng mở và hover mượt mà)
- Tương tác bấm toàn vùng (Click hitbox rộng rãi)
