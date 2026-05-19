# Test Plan

## 기본 검증 명령

```powershell
npm run lint
npm run format:check
npm run verify:app
```

선택 검증:

```powershell
npm run audit
npm run security:secrets
npm run security:semgrep
```

## 환경 준비

1. `.env` 작성
2. OracleDB 실행 확인
3. 신규 DB는 `@scripts/schema.sql`, `@scripts/sample-data.sql`
4. 기존 DB는 `@scripts/migration.sql`
5. `npm start`
6. `http://localhost:3000/bbs/list` 접속

## 수동 기능 테스트

| 기능             | 테스트 절차                        | 기대 결과                              |
| ---------------- | ---------------------------------- | -------------------------------------- |
| 목록             | `/bbs/list` 접속                   | 게시글 목록 표시                       |
| 페이징           | 게시글 11개 이상에서 `page=2` 이동 | 페이지별 목록 표시                     |
| 검색             | 제목/작성자/내용/제목+내용 검색    | 조건에 맞는 글 표시                    |
| 내 글만 보기     | 로그인 후 `내 글만 보기` 클릭      | 본인 작성글만 표시                     |
| 목록 댓글 수     | 댓글이 있는 글을 목록에서 확인     | 제목 옆 `[댓글수]` 표시                |
| 글쓰기 접근 제한 | 로그아웃 상태에서 `/bbs/form` 접속 | 로그인 화면 이동                       |
| 글쓰기           | 로그인 후 제목/내용 저장           | 목록에 새 글 표시                      |
| 파일 업로드      | 허용 확장자 파일 첨부              | 상세 화면에 파일 표시                  |
| 파일 다운로드    | 상세 화면 다운로드 클릭            | 원본 파일명으로 다운로드               |
| 파일 차단        | `.exe`, `.js`, `.sh` 업로드 시도   | 업로드 실패                            |
| 글읽기           | 목록에서 게시글 클릭               | 상세 화면 표시, 조회수 증가            |
| 추천 조회수      | 상세 화면에서 좋아요/싫어요 클릭   | 추천 수만 변경, 조회수 유지            |
| 글수정           | 작성자가 글 수정                   | 수정 내용 반영                         |
| 글삭제           | 작성자가 글 삭제                   | 목록에서 숨김                          |
| 권한 체크        | 다른 사용자로 수정/삭제 시도       | 403 응답                               |
| 댓글             | 로그인 후 댓글 작성                | 상세 화면에 댓글 표시                  |
| 댓글 수정        | 본인 댓글 내용 수정                | 수정 내용 반영                         |
| 대댓글           | 댓글의 답글 작성                   | 들여쓰기된 답글 표시                   |
| 댓글 삭제        | 본인 댓글 삭제                     | 삭제 처리                              |
| 좋아요           | 로그인 후 좋아요 클릭              | 좋아요 +1, 버튼 활성                   |
| 좋아요 취소      | 같은 버튼 다시 클릭                | 좋아요 -1, 버튼 비활성                 |
| 싫어요 전환      | 좋아요 상태에서 싫어요 클릭        | 좋아요 -1, 싫어요 +1                   |
| 비로그인 추천    | 로그아웃 상태에서 상세 화면 확인   | 로그인 안내 표시                       |
| 로그인 실패      | 잘못된 ID/PW 입력                  | 실패 alert                             |
| 로그인 성공      | 정상 계정 로그인                   | 목록 이동, 세션 유지                   |
| 아이디 찾기      | 이름/이메일 입력                   | 일치하는 활성 계정 ID 표시             |
| bcrypt 전환      | legacy SHA-512 계정 로그인         | 로그인 성공 후 `PASSWORD_ALGO=bcrypt`  |
| 로그아웃         | `/bbs/logout`                      | 세션 제거 후 목록 이동                 |
| 회원가입         | 신규 ID 가입                       | 로그인 화면 이동                       |
| 회원정보 수정    | 로그인 후 정보 수정                | DB와 세션 값 변경                      |
| 회원 탈퇴        | 내 정보에서 비밀번호와 `탈퇴` 입력 | `LOGIN.OK=0`, 세션 종료, 재로그인 차단 |

## 보안 테스트

| 항목             | 테스트                                         |
| ---------------- | ---------------------------------------------- |
| SQL Injection    | `brdno=1 OR 1=1` 요청 시 bad request           |
| 로그인 Injection | ID/PW에 `' OR '1'='1` 입력 시 로그인 실패      |
| 검색 컬럼 변조   | 허용되지 않은 검색 컬럼 전달 시 기본 제목 검색 |
| 숫자 파라미터    | `brdno=abc`, `fno=abc` 요청 시 bad request     |
| 비밀번호 노출    | 회원정보 수정 화면에서 기존 비밀번호 미표시    |
| 세션             | 로그아웃 후 보호 기능 접근 시 로그인 화면 이동 |
| 탈퇴 계정        | `LOGIN.OK=0` 계정 로그인 시도                  |

## 최근 검증 기록

- `npm run lint`: 통과
- `npm run format:check`: 통과
- `npm run verify:app`: 통과
- 조회수 회귀 검증: 일반 읽기 후 `VIEW_COUNT=1`, 좋아요/취소 후에도 `VIEW_COUNT=1`

## 제출용 캡처 포인트

1. 목록/페이징
2. 검색 결과
3. 내 글만 보기와 목록 댓글 수
4. 글쓰기
5. 파일 첨부 후 상세 화면
6. 파일 다운로드 링크
7. 댓글 작성/수정
8. 대댓글 작성
9. 좋아요/싫어요와 취소
10. 조회수 유지 확인
11. 글수정
12. 글삭제 후 목록
13. 로그인/로그아웃
14. 아이디 찾기
15. 회원가입
16. 회원정보 수정
17. 회원 탈퇴
18. OracleDB 테이블 조회 결과

## Authorization test
- Attachment download by a non-writer should return 403, while the writer can download normally after login.

## Input validation test

- Signup: blank `id`, invalid characters in `id`, invalid `email`, blank/invalid `phone` should stay on signup and show a message.
- ID check: `id` shorter than 4 characters or containing characters outside letters, numbers, and `_` should return unavailable JSON with a message.
- Account update: invalid `id` or `email`, blank password, or password shorter than 4 characters should stay on the account update flow with a message.
- Post create/update: blank `title`, blank `content`, `title` over 200 characters, or `content` over 4000 characters should be rejected by the server.
- Run `npm run verify:app` after code changes.

## XSS escaping test

- Create or edit a post with `<script>alert(1)</script>` in `title` and `content`; the list, read, and update screens should show it as text, not execute it.
- Create or edit a comment/reply with `<img src=x onerror=alert(1)>`; the read screen and comment edit textarea should show it as text, not execute it.
- Confirm `views/bbs/*.ejs` keeps user-controlled output on `<%= %>` and reserves `<%- %>` for safe partial includes only.

## CSRF protection test

- Open each BBS form normally and confirm POST actions still work: login, find ID, signup, account update, withdrawal, post create/update, reaction, comment/reply create, comment update, and comment delete.
- Submit a POST request to `/bbs/logincheck` or `/bbs/wsave` without `_csrf`; it should return HTTP 403.
- Confirm the file upload post form includes `_csrf` and still uploads an allowed file successfully.
- Run `npm run verify:app` after CSRF changes.

## Password policy test

- Signup with a password shorter than 8 characters should stay on signup and show a password policy message.
- Signup with 8+ letters only or 8+ numbers only should stay on signup and show a password policy message.
- Signup with mismatched password confirmation should stay on signup and show a mismatch message.
- Account update should reject the same weak or mismatched passwords.
- Signup/account update with a password such as `abc12345` should pass the password policy and continue the normal flow.

## Password reset token test

- Apply `scripts/schema.sql` on a new DB or `scripts/migration.sql` on an existing DB and confirm `RESET_TOKEN` exists.
- Open `/bbs/reset-password`, enter an active account ID and matching email, and confirm a reset link is shown on screen.
- Open the reset link before expiration and set a new password that satisfies the password policy, such as `abc12345`.
- Confirm the token row is marked used and the same token cannot reset the password again.
- Confirm an invalid, missing, expired, or already used token shows an error and does not update the password.
- Confirm weak or mismatched new passwords are rejected by the reset form.

## Upload restriction test

- Upload an allowed file under 10MB, such as `.png` with `image/png`, and confirm it appears on the read screen.
- Try a disallowed extension such as `.exe` or `.js`; the post form should show an upload warning and no file should be saved.
- Try a MIME mismatch, such as a renamed executable with an allowed extension; upload should be rejected.
- Try a file larger than 10MB; the post form should show the size-limit warning.
- Delete a post with an attachment and confirm `BBS_FILE.OK = 0` and the physical file under `uploads/bbs` is removed when present.
- Request `/bbs/download?fno=abc` or a tampered file id/path metadata case; the route should reject it and never serve a path outside `uploads/bbs`.

## Production error message test

- Run with `NODE_ENV=production` and trigger a missing page; the error page should show a generic not-found message without stack details.
- Run with `NODE_ENV=production` and trigger a server error; the error page should show a generic processing error without `err.message` or stack details.
- Run in development mode and confirm debugging details are still available through the normal development error handler data.
- Try logging in with a non-existent ID and with a wrong password; both should show the same generic login failure message.
- Try logging in with a deactivated account; the deactivated-account guidance should still be shown.

