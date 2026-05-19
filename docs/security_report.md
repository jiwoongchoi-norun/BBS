# Security Report

## 적용된 보강

### 비밀번호

- 신규 회원가입은 bcrypt hash로 저장합니다.
- 회원정보 수정 시 새 비밀번호도 bcrypt로 저장합니다.
- 회원 탈퇴 시에도 현재 비밀번호를 확인한 뒤 계정을 비활성화합니다.
- 기존 SHA-512 + salt 계정은 로그인 성공 시 bcrypt로 자동 전환합니다.
- `LOGIN.PASSWORD_ALGO`로 해시 방식을 구분합니다.
- 회원정보 수정 화면에서 기존 비밀번호를 다시 출력하지 않습니다.

### 세션

- 로그인 성공 시 `req.session.user`에 필요한 사용자 정보만 저장합니다.
- 글쓰기, 수정, 삭제, 댓글, 추천 등 로그인 필요 기능은 `requireLogin()`을 거칩니다.
- `SESSION_SECRET`은 `.env`에서 주입합니다.
- 탈퇴 처리된 `LOGIN.OK = 0` 계정은 로그인과 내 정보 조회에서 제외합니다.

### SQL Injection 완화

- 주요 DB 쿼리는 Oracle bind variable을 사용합니다.
- 숫자 파라미터는 `toValidNumber()`로 양의 정수만 허용합니다.
- 검색 컬럼은 SQL 컬럼 매핑 객체로 제한해 허용된 컬럼명만 SQL에 들어갑니다.
- 정렬 컬럼과 정렬 방향은 `getSort()`의 화이트리스트 매핑 결과만 사용합니다.

### 권한 체크

- 게시글 수정/삭제는 로그인 사용자와 `BBS.WRITER`가 같아야 합니다.
- 댓글 수정/삭제는 로그인 사용자와 `BBSW.WRITER`가 같아야 합니다.
- 권한이 없으면 403 응답을 반환합니다.

### 파일 업로드

- `multer`를 사용합니다.
- 파일 크기는 10MB로 제한합니다.
- 허용 확장자만 업로드할 수 있습니다.
- `.exe`, `.js`, `.sh`, `.bat`, `.cmd`, `.ps1` 등 위험 확장자는 차단합니다.
- 다운로드는 DB에 저장된 파일 메타데이터를 기준으로 처리합니다.

### 추천 기능

- `BBS_REACTION`의 `(BBSNO, USER_ID)` 기본키로 중복 추천을 방지합니다.
- 추천 타입은 `LIKE`, `DISLIKE`만 허용합니다.
- 좋아요/싫어요 후 read 화면으로 돌아오는 내부 이동은 조회수를 증가시키지 않습니다.

## 남은 위험 요소

- CSRF 방어가 없습니다.
- 게시글 삭제는 GET 요청입니다.
- `oracledb.autoCommit = true`라 여러 SQL을 하나의 트랜잭션으로 묶는 보장은 약합니다.
- 업로드 게시글 삭제 시 실제 파일 정리 정책이 아직 명확하지 않습니다.
- 관리자 기능과 계정 잠금 정책은 없습니다.

## 제출 기준 판단

과제 수준에서는 SQL Injection 완화, 비밀번호 평문 저장 방지, 세션 분리, 작성자 권한 체크가 반영되어 있습니다. 실서비스 기준으로는 CSRF, 트랜잭션, 파일 삭제 정책, 접근 로그, 계정 잠금 정책을 추가해야 합니다.

## Authorization Update
- Attachment download now revalidates the logged-in user against the original post writer in the server route and returns 403 on mismatch.

## Input Validation Update

- `title` is required and limited to 200 characters on the server.
- `content` is required and limited to 4000 characters on the server.
- `id` is required and limited to 4-20 characters using only letters, numbers, and `_`.
- `email` is required on signup/account update and must match email format when provided.
- `phone` is required on signup and must match the `010-1234-5678` style format.
- Validation failures keep the existing screen flow where possible and show a friendly form or flash message.

## XSS Output Escaping Update

- Checked `views/bbs/*.ejs` for raw EJS output tags.
- `<%- %>` is used only for EJS partial includes such as `head`, `nav`, `flash`, and `footer`.
- User-controlled fields including post title, post content, writer/name, search keyword, file name, and comment content use `<%= %>` escaped output.
- Rich text/HTML rendering is not enabled; title, content, and comments remain plain text when displayed.

## CSRF Protection Update

- Added `csurf` session-based CSRF protection to the `/bbs` router.
- `res.locals.csrfToken` is generated for BBS views and included in every POST form as hidden `_csrf`.
- Covered login, find ID, signup, account update, account withdrawal, post create/update, reactions, comments, replies, comment update, and comment delete forms.
- The file upload form keeps a hidden token and also sends `_csrf` in the action query so multipart upload can pass CSRF validation before `multer` parses the file body.
- Invalid or missing CSRF tokens return HTTP 403.

## Session Cookie Security Update

- `SESSION_SECRET` remains required from `.env`; no hardcoded fallback is used.
- `express-session` cookies now use `httpOnly: true`, `sameSite: 'lax'`, and a 2 hour `maxAge`.
- Cookie `secure` is enabled only when `NODE_ENV=production`, so local `http://localhost` development remains usable.

## Password Policy Update

- Signup and account update now validate password policy on the server.
- Passwords must be at least 8 characters and include both letters and numbers.
- Password confirmation mismatch returns a clear form message instead of proceeding.
- Existing bcrypt storage and legacy login migration logic were not changed.

## Password Reset Token Update

- Added an assignment-only password reset token flow without real email sending.
- `RESET_TOKEN` stores a 32-byte random hex token, target user, expiration time, used status, creation time, and use time.
- Reset requests create a token only for active accounts matching ID and email, mark older active tokens for the same user as used, and show the reset link on screen for assignment testing.
- Token confirmation requires an unused, unexpired token for an active account.
- New password saving reuses bcrypt storage and the password policy from step 7.

## Upload Restriction Update

- Uploads are limited to 1 file and 10MB.
- File extension and MIME type are both checked against an allowlist before saving.
- Saved filenames are generated server-side and original filenames are normalized with `path.basename`.
- Upload failure returns to the post form with a warning message instead of falling through to a generic error.
- If validation or DB insert fails after a file was saved, the temporary physical file is deleted on a best-effort basis.
- Post deletion keeps DB soft-delete semantics and also marks attached files inactive; matching physical files are deleted best-effort after DB update.
- Download now verifies the numeric file id, active post/file status, writer permission, DB file path metadata, and resolved filesystem path under `uploads/bbs`.

## Production Error Message Update

- In `NODE_ENV=production`, the global Express error handler returns a generic user-facing message instead of `err.message`.
- Development mode still keeps the original error message and error object for debugging.
- `views/error.ejs` and `views/bbs/error.ejs` do not render stack traces.
- Login failures for unknown ID, wrong password, or legacy password metadata problems now show the same generic failure message.
- Deactivated account guidance remains visible because it tells the user why they cannot log in.

## Residual Risk Update

- CSRF protection is now implemented for BBS POST forms.
- Uploaded attachment physical deletion is implemented on a best-effort basis for post deletion and failed post creation cleanup.
- Remaining production-grade gaps are automated tests, finer transaction handling, account lockout policy, audit logging, and admin features.

