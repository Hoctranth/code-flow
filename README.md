<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/2300px-React-icon.svg.png" width="100" height="100" alt="Logo" />
  <h1 align="center">🔮 AST Code Analyzer & Graph Visualizer</h1>

  <p align="center">
    <strong>Công cụ "Nội soi" Code thần thánh dành cho Lập trình viên TypeScript/JavaScript</strong>
    <br />
    Biến những file code hàng ngàn dòng nhàm chán thành một mạng lưới bản đồ tư duy sinh động, tương tác và cực kỳ mãn nhãn.
  </p>

  <p align="center">
    <a href="#features"><strong>Tính năng nổi bật</strong></a> ·
    <a href="#getting-started"><strong>Cài đặt</strong></a> ·
    <a href="#tech-stack"><strong>Công nghệ sử dụng</strong></a>
  </p>
</div>

<hr />

## 🌟 Tại sao lại cần Tool này?
Bạn vừa nhận bàn giao một dự án "Legacy" từ một người cũ để lại? Hay bạn đang cố gắng review một file code có đến 1000 dòng với hàng tá hàm gọi chéo nhau lộn xộn? 

Thay vì phải cuộn chuột mỏi tay để tìm hiểu luồng đi của dữ liệu, **AST Code Analyzer** sẽ tự động đọc hiểu cú pháp, bóc tách cấu trúc và vẽ ra một sơ đồ luồng (Flowchart) tuyệt đẹp. Nó không chỉ là một trình vẽ đồ thị tĩnh, nó là một chiếc "Kính X-Quang" dành cho Code!

## ✨ Tính năng "Đỉnh nóc kịch trần"

* 👁️ **X-Ray Mode (Nhìn thấu Code):** Double-click vào bất kỳ Node nào trên đồ thị, cục Node sẽ phình to ra và hiển thị chính xác đoạn code bên trong nó ngay trên mặt đồ thị. Đọc code chưa bao giờ "đã" đến thế!
* ⚠️ **Smart Complexity Linter:** Tích hợp bộ quét "Mì gõ" thông minh. Tự động chuyển đỏ (Alert) các Hàm/Component quá dài (>30 dòng) hoặc gọi quá nhiều hàm bên ngoài (God Objects). Hover vào để xem lý do tại sao bạn cần phải Refactor.
* 🌌 **Multi-Layout Physics Engine:** Hỗ trợ 3 thuật toán dàn trang đỉnh cao:
  * **Dagre:** Xếp lớp từ trên xuống dưới (Hierarchical) cực kỳ ngăn nắp.
  * **ELK:** Thuật toán chống cắt chéo đường đi thông minh.
  * **Force-Directed (D3-force):** Engine vật lý mô phỏng trọng lực cực ngầu, cho phép bạn ném các Node bay lơ lửng trên màn hình!
* 🖱️ **Click-to-Source (Tương tác Editor):** Bấm vào một Node trên bản đồ, Monaco Editor bên trái sẽ tự động cuộn (Auto-scroll) và bôi đen chính xác dòng code định nghĩa hàm đó.
* 🎨 **Theme Customizer:** Tích hợp sẵn 3 Giao diện sành điệu: `Dark (Mặc định)`, `Light (Trắng tinh khôi)`, và `Dracula (Tông tím rực rỡ)`.
* 🔗 **Shareable URL (Chia sẻ siêu tốc):** Tạo một đường link chứa toàn bộ hàng ngàn dòng code của bạn thông qua thuật toán nén `lz-string`. Gửi link cho sếp, sếp mở lên thấy nguyên bản đồ. 100% Serverless, không tốn Database!

---

## 🛠️ Tech Stack (Công nghệ dưới nắp capo)

Dự án này là sự kết hợp của những thư viện mạnh mẽ nhất hiện nay:
- **[Next.js 15 (App Router)](https://nextjs.org/)** - Framework lõi.
- **[React Flow](https://reactflow.dev/)** - Trình dựng sơ đồ Node-based vô đối.
- **[TS-Morph](https://ts-morph.com/)** - Wrapper hoàn hảo của TypeScript Compiler API, dùng để Parse AST và dò tìm Symbol/Dependency.
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** - Trình soạn thảo Code siêu việt đứng đằng sau VS Code.
- **[D3-Force](https://d3js.org/) & [ELK.js](https://github.com/kieler/elkjs)** - Thuật toán tính toán vật lý & Không gian.
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Styling bằng CSS Variables siêu tốc.

---

## 🚀 Hướng dẫn Cài đặt & Chạy Local

Bạn muốn mang "bảo bối" này về máy? Rất đơn giản:

1. **Clone repository này về máy:**
   ```bash
   git clone https://github.com/your-username/react-flow-ast.git
   cd react-flow-ast
   ```

2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

3. **Khởi động động cơ:**
   ```bash
   npm run dev
   ```

4. **Trải nghiệm:** Mở trình duyệt và truy cập vào `http://localhost:3000`. Dán đoạn code khó nhằn nhất của bạn vào Editor bên trái và xem phép màu xảy ra!

---

## 💡 Hướng dẫn sử dụng nhanh

1. **Dán code:** Ném một file `.ts` hoặc `.tsx` vào Editor bên trái.
2. **Chọn Layout:** Ở góc trên bản đồ, hãy thử chuyển từ chế độ `Dagre` sang `Force` để xem các cục Node nảy lên như thạch.
3. **Đọc lén (X-Ray):** Thấy một cái hộp màu xanh ghi chức năng `handleSubmit`? Bấm đúp vào nó để đọc nguyên cái hàm đó!
4. **Chia sẻ:** Thấy đồ thị đẹp quá? Bấm nút **Share**, một đường link sẽ tự động được copy. Ném nó cho thằng bạn xem thử.

---

<div align="center">
  <i>Được rèn đũa bởi niềm đam mê Code Sạch (Clean Code). Nếu thấy hay, hãy cho repo này 1 ⭐️ nhé!</i>
</div>
