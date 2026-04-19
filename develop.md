# Hướng dẫn Phát triển & Triển khai (Development & Build)

File này hướng dẫn chi tiết các lệnh để phát triển, xây dựng (build) và tải lên (push) code cho dự án. Chúng ta **không dùng Docker** mà sử dụng quy trình chuẩn và tối ưu nhất của Next.js (bạn có thể coi nó tích hợp sát với webpack - hay "nickpack" theo cách gọi vui của bạn).

---

## 1. Các lệnh thường dùng trong quá trình Development

Yêu cầu luôn chạy trong thư mục gốc dự án và đã kích hoạt môi trường ảo Python (`.venv\Scripts\activate`).

- **Cài đặt & Tự động tải Models:**
  ```bash
  # Tự động tải package NPM + tự động chạy python lấy file .glb
  npm install 
  ```

- **Chạy môi trường Dev:**
  ```bash
  # Tự động bật next.js ở localhost:3000 (đã host luôn model từ public/models)
  npm run dev
  ```

---

## 2. Lên Production (Build)

Dự án dùng **Next.js** nên việc build rất đơn giản và tự động tối ưu hóa Javascript/CSS/Ảnh (Next.js sử dụng bộ công cụ build xịn hơn cả Webpack truyền thống).

Để tạo bản build sẵn sàng lên server:
```bash
npm run build
```

Sau khi quá trình này kết thúc, Next.js sẽ tạo ra folder `.next` chứa toàn bộ code đã minify, tối ưu tốc độ nhanh nhất.

Để chạy thử bản build vừa tạo:
```bash
npm run start
```
*(Trên production thực tế, Next.js sẽ tự động phân phối các file trong public ra ngoài).*

---

## 3. Lệnh đẩy code lên GitHub (Push Code)

Ở thư mục gốc (`C:\Users\minhmice\Documents\projects\3ddanbinh`), bạn sử dụng các lệnh chuẩn của Git:

**Bước 1: Xem trạng thái các file thay đổi**
```bash
git status
```

**Bước 2: Chọn tất cả các file đã thay đổi để chuẩn bị commit**
```bash
git add .
```

**Bước 3: Lưu lại lịch sử thay đổi (Hãy thay thông báo trong ngoặc kép bằng nội dung thực tế)**
```bash
git commit -m "Update: Hoàn thiện UI Liquid Glass và thay đổi luồng start"
```

**Bước 4: Đẩy lên GitHub**
```bash
git push -u origin main
```
*(Nếu remote của bạn nhánh tên khác như `master`, hãy đổi `main` thành `master`).*
