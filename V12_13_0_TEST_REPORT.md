# V12.13.0 Test Report

## Phạm vi

Workspace Layout Manager, Split View, Focus Mode, embedded route isolation và persistence theo tài khoản.

## Kết quả

- Structural verifier: 19/19 PASS
- Workspace layout runtime tests: 10/10 PASS
- Production build: PASS
- Vite modules transformed: 318
- Smoke tests: 179/179 PASS
- Department runtime Admin: PASS
- Department runtime TTCM: PASS
- Department runtime Giáo viên: PASS
- Performance budget: PASS
- Development server: PASS
- Local HTTP response: 200 OK

## Ghi chú

- Build cảnh báo font cá nhân không có trong môi trường đóng gói. Font được giữ ngoài ZIP theo yêu cầu bảo mật và bản quyền.
- Split View sử dụng iframe cùng origin ở chế độ `?embed=1`; phiên đăng nhập và quyền truy cập vẫn được kiểm tra bởi ứng dụng bên trong.
- Chưa chạy visual regression trên tài khoản production thật. Cần kiểm tra trực quan sau khi deploy, đặc biệt trên Safari và màn hình nhỏ.
- Không cần SQL mới.
