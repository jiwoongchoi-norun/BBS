# 게시판 과제 제출 전 수동 테스트 결과

최종 작성일: 2026-05-24

## 1. 문서 목적

이 문서는 게시판 과제 제출 전 주요 기능을 수동으로 점검하기 위한 결과 기록 문서이다.

현재 문서 작성 단계에서는 서버 실행, 브라우저 조작, OracleDB 데이터 확인을 직접 수행하지 않았다. 따라서 실제로 실행하지 않은 항목은 `성공`으로 표시하지 않고 `미실행`으로 기록한다. 코드와 기존 문서에서 기능 존재 여부만 확인된 경우에는 비고에 코드상 확인 근거를 남긴다.

## 2. 테스트 환경

| 항목                         | 내용                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 테스트 문서 작성일           | 2026-05-24                                                                                                     |
| 실제 수동 테스트 수행일      | 미실행                                                                                                         |
| 프로젝트 경로                | `C:\BBS\BBS`                                                                                                   |
| 실행 환경                    | Node.js + Express + EJS + OracleDB                                                                             |
| 주요 확인 문서               | `docs/requirements_summary.md`, `README.md`                                                                    |
| 주요 확인 코드               | `routes/bbs.js`, `views/bbs/*.ejs`                                                                             |
| 테스트 기준 URL              | `http://localhost:3000/bbs/list`                                                                               |
| 설치 명령어                  | `npm install`                                                                                                  |
| 서버 실행 명령어             | `npm start`                                                                                                    |
| 개발 서버 실행 명령어        | `npm run dev`                                                                                                  |
| 앱 로드 확인 명령어          | `npm run verify:app`                                                                                           |
| 린트 확인 명령어             | `npm run lint`                                                                                                 |
| 포맷 확인 명령어             | `npm run format:check`                                                                                         |
| 통합 확인 명령어             | `npm run check`                                                                                                |
| 실제 서버 실행 여부          | 미실행                                                                                                         |
| 실제 브라우저 수동 조작 여부 | 미실행                                                                                                         |
| 실제 DB 데이터 확인 여부     | 미실행                                                                                                         |
| DB 연결 확인 필요 여부       | 확인 필요                                                                                                      |
| DB 연결 확인 내용            | `.env`의 `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` 설정과 OracleDB 접속 가능 여부를 제출 전 확인해야 한다. |

## 3. 기능별 수동 테스트 표

| 기능                   | 테스트 절차                                                                         | 기대 결과                                                           | 실제 결과                                                                                                                                      | 상태   | 비고                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| 회원가입               | `/bbs/signup` 접속 후 필수 정보를 입력하고 가입 버튼을 누른다.                      | 신규 회원이 등록되고 로그인 화면 또는 목록 화면으로 이동한다.       | 미실행. 코드상 `GET /bbs/signup`, `POST /bbs/signupsave`, `views/bbs/signup.ejs` 존재 확인.                                                    | 미실행 | 중복 ID 확인은 `/bbs/check-id` 라우트 존재 여부를 추가 확인할 필요가 있다.                     |
| 로그인                 | `/bbs/login` 접속 후 가입된 ID와 비밀번호를 입력한다.                               | 인증 성공 시 세션이 생성되고 게시글 목록으로 이동한다.              | 미실행. 코드상 `GET /bbs/login`, `POST /bbs/logincheck`, 세션 사용자 저장 처리 확인.                                                           | 미실행 | bcrypt 및 legacy SHA-512 전환 로직은 코드상 존재하나 실제 계정으로 검증하지 않았다.            |
| 로그아웃               | 로그인 상태에서 `/bbs/logout`을 실행한다.                                           | 세션이 삭제되고 로그인 전 상태로 전환된다.                          | 미실행. 코드상 `GET /bbs/logout` 존재 확인.                                                                                                    | 미실행 | 세션 삭제 후 화면 표시와 접근 제한은 브라우저에서 재확인 필요.                                 |
| 회원정보 수정          | 로그인 후 `/bbs/updatesignup` 화면에서 정보를 수정하고 저장한다.                    | 회원 정보가 변경되고 저장 결과가 안내된다.                          | 미실행. 코드상 `GET /bbs/updatesignup`, `POST /bbs/updatesignsave`, `views/bbs/updatesignform.ejs` 존재 확인.                                  | 미실행 | 비밀번호 변경 조건과 입력값 검증은 실제 데이터로 확인 필요.                                    |
| 글 목록                | `/bbs/list`에 접속한다.                                                             | 게시글 목록, 검색/정렬/페이징 UI가 표시된다.                        | 미실행. 코드상 `GET /bbs/list`, `views/bbs/list.ejs` 존재 확인.                                                                                | 미실행 | 샘플 데이터 또는 실제 DB 데이터가 있어야 화면 표시 검증 가능.                                  |
| 글쓰기                 | 로그인 후 `/bbs/form`에서 제목, 내용을 입력하고 저장한다.                           | 새 게시글이 등록되고 목록 또는 상세 화면에서 확인된다.              | 미실행. 코드상 `GET /bbs/form`, `POST /bbs/save`, `views/bbs/form.ejs` 존재 확인.                                                              | 미실행 | 로그인 필요 여부, CSRF 토큰, 첨부파일 동시 등록은 실제 확인 필요.                              |
| 글읽기                 | 목록에서 게시글 제목을 클릭해 `/bbs/read?brdno=...`로 이동한다.                     | 게시글 제목, 내용, 작성자, 조회수, 댓글, 첨부파일 정보가 표시된다.  | 미실행. 코드상 `GET /bbs/read`, `views/bbs/read.ejs` 존재 확인.                                                                                | 미실행 | 존재하지 않는 게시글 번호 처리도 확인 필요.                                                    |
| 글수정                 | 작성자 계정으로 로그인 후 게시글 수정 화면에서 내용을 변경한다.                     | 작성자 본인 글만 수정되고 변경 내용이 저장된다.                     | 미실행. 코드상 `GET /bbs/update`, `POST /bbs/updatesave`, `views/bbs/updateform.ejs` 존재 확인.                                                | 미실행 | 작성자 권한 체크는 코드상 존재하나 실제 다른 계정으로 검증하지 않았다.                         |
| 글삭제                 | 작성자 계정으로 로그인 후 게시글 삭제를 실행한다.                                   | 작성자 본인 글만 삭제 처리되고 목록에서 제외된다.                   | 미실행. 코드상 `GET /bbs/delete`는 안내 후 상세/목록으로 이동하고, 실제 삭제는 `POST /bbs/delete`에서만 수행되도록 정리됨을 확인.              | 미실행 | 브라우저/DB 수동 테스트는 아직 미실행. 삭제 UI는 상세 화면의 POST 폼을 사용하도록 코드상 확인. |
| 검색                   | 목록에서 검색 조건과 검색어를 입력한다.                                             | 조건에 맞는 게시글만 목록에 표시되고 페이징이 유지된다.             | 미실행. 코드상 `GET /bbs/search` 존재 확인.                                                                                                    | 미실행 | 제목, 내용, 작성자, 제목+내용 조건별 실제 결과 확인 필요.                                      |
| 조회수                 | 게시글 상세 화면을 새로 열거나 목록에서 상세로 진입한다.                            | 일반 상세 조회 시 조회수가 증가한다.                                | 미실행. 코드상 `VIEW_COUNT` 및 조회수 증가/스킵 토큰 처리 확인.                                                                                | 미실행 | reaction 후 리다이렉트에서는 조회수 증가를 건너뛰는 로직이 있어 실제 확인 필요.                |
| 페이징                 | 글 목록과 검색 결과에서 페이지 번호 및 페이지 크기를 변경한다.                      | 선택한 페이지와 페이지 크기에 맞게 게시글이 표시된다.               | 미실행. 코드상 `page`, `pageSize`, pagination 데이터 처리 확인.                                                                                | 미실행 | 충분한 게시글 데이터가 있어야 검증 가능.                                                       |
| 댓글 작성              | 로그인 후 게시글 상세 화면에서 댓글 내용을 입력하고 저장한다.                       | 댓글이 등록되고 상세 화면에 표시된다.                               | 미실행. 코드상 `POST /bbs/wsave` 존재 확인.                                                                                                    | 미실행 | 댓글 목록 표시와 빈 댓글 검증은 실제 확인 필요.                                                |
| 댓글 수정/삭제         | 본인이 작성한 댓글에서 수정 또는 삭제를 실행한다.                                   | 본인 댓글만 수정/삭제되고 화면에 반영된다.                          | 미실행. 코드상 `POST /bbs/wupdate`, `POST /bbs/wdelete` 존재 확인.                                                                             | 미실행 | 다른 사용자의 댓글 수정/삭제 차단은 실제 계정 2개로 확인 필요.                                 |
| 파일업로드             | 글쓰기 또는 글수정에서 허용 확장자 파일을 첨부하고 저장한다.                        | 파일 메타데이터가 저장되고 상세 화면에서 다운로드 가능하다.         | 미실행. 코드상 `multer`, `BBS_FILE`, `GET /bbs/download` 처리 확인.                                                                            | 미실행 | 10MB 제한, 1개 파일 제한, 허용 확장자와 차단 확장자 테스트 필요.                               |
| reaction/좋아요/싫어요 | 로그인 후 상세 화면에서 좋아요 또는 싫어요 버튼을 누른다.                           | 반응 수가 변경되고 같은 버튼 재클릭 또는 반대 반응 전환이 처리된다. | 미실행. 코드상 `POST /bbs/reaction`, `BBS_REACTION` 처리 확인.                                                                                 | 미실행 | 로그인 필요 여부와 중복/전환 동작은 실제 확인 필요.                                            |
| 비밀번호 재설정        | `/bbs/reset-password`에서 ID와 이메일을 입력하고 생성된 링크로 비밀번호를 변경한다. | 재설정 토큰이 생성되고 새 비밀번호로 로그인 가능하다.               | 미실행. 코드상 `GET /bbs/reset-password`, `POST /bbs/reset-password/request`, `GET/POST /bbs/reset-password/confirm`, 관련 EJS 화면 존재 확인. | 미실행 | 실제 이메일 발송은 과제 범위 밖으로 보이며, 화면에 표시되는 reset link 기반 검증 필요.         |

## 4. 제출 전 재확인 체크리스트

| 체크 항목                                                                     | 상태      | 비고                                                                                         |
| ----------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------- |
| `.env`에 `SESSION_SECRET`, `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` 설정 | 확인 필요 | `.env` 전체 내용은 확인하지 않음.                                                            |
| OracleDB 연결 가능 여부 확인                                                  | 확인 필요 | DB 계정, 비밀번호, 접속 문자열, 리스너 상태 확인 필요.                                       |
| OracleDB 스키마 또는 마이그레이션 적용                                        | 확인 필요 | 실제 DB 접속 및 테이블 상태 미확인.                                                          |
| `npm install` 완료                                                            | 확인 필요 | 이번 문서 보강 작업에서는 실행하지 않음.                                                     |
| `npm run verify:app` 실행                                                     | 성공      | 3단계 helper 분리 후 `app loaded` 확인.                                                      |
| `npm run lint` 실행                                                           | 성공      | 3단계 helper 분리 후 ESLint 통과.                                                            |
| `npm run format:check` 실행                                                   | 성공      | 3단계 helper 분리 후 Prettier check 통과.                                                    |
| `npm run check` 실행                                                          | 미실행    | lint, format:check, audit 통합 확인 명령어.                                                  |
| 서버 실행 후 `/bbs/list` 접속                                                 | 미실행    | 브라우저 수동 확인 필요.                                                                     |
| 회원가입부터 로그아웃까지 계정 흐름 확인                                      | 미실행    | 실제 계정 생성 후 확인 필요.                                                                 |
| 게시글 CRUD와 검색/페이징 확인                                                | 미실행    | 샘플 데이터 또는 신규 데이터 필요.                                                           |
| 댓글, reaction, 파일업로드 확인                                               | 미실행    | 로그인 계정과 테스트 파일 필요.                                                              |
| 권한 없는 수정/삭제 차단 확인                                                 | 미실행    | 작성자 계정과 다른 계정 2개 필요.                                                            |
| `GET /bbs/delete` 직접 접근 시 삭제 미수행 확인                               | 코드 확인 | DB 삭제 SQL은 `POST /bbs/delete`에만 있으며, GET은 flash 안내 후 상세/목록으로 redirect한다. |
| helper 분리 후 구조 확인                                                      | 코드 확인 | `auth`, `response`, `validation` helper 분리 및 자동 검증 통과. 기능 수동 테스트는 아님.     |

## 5. 남은 확인 항목

- 실제 서버를 실행한 뒤 브라우저에서 기능별 수동 테스트를 수행해야 한다.
- OracleDB에 필요한 테이블, 시퀀스, 샘플 데이터가 정상 적용되었는지 확인해야 한다.
- `.env`의 DB 연결 정보와 `SESSION_SECRET` 설정을 확인해야 한다.
- `npm install`, `npm run check` 실행 결과를 확인해야 한다. `npm run verify:app`, `npm run lint`, `npm run format:check`는 3단계 helper 분리 후 통과했다.
- 회원가입, 로그인, 회원정보 수정, 비밀번호 재설정은 실제 계정 데이터로 확인해야 한다.
- 게시글 목록, 글쓰기, 글읽기, 글수정, 글삭제, 검색, 조회수, 페이징은 실제 게시글 데이터로 확인해야 한다.
- 댓글 작성, 댓글 수정/삭제, reaction, 파일업로드는 로그인 상태와 권한 조건을 함께 확인해야 한다.
- 파일업로드는 허용 파일, 차단 파일, 10MB 초과 파일을 나누어 확인해야 한다.
- 작성자 권한 체크는 작성자 계정과 다른 계정을 각각 사용해 확인해야 한다.
    <!-- 4단계 repository 분리 메모: 게시글 soft delete/update SQL을 posts.repository.js로 이동했고, npm run verify:app 및 npm run lint를 통과했다. 브라우저/DB 수동 테스트는 아직 미실행이다. -->
    <!-- 4단계 후속 댓글 repository 분리 메모: BBSW 댓글 목록/작성/답글/수정/삭제 SQL을 comments.repository.js로 이동했다. 자동 검증 후에도 댓글 기능 브라우저/DB 수동 테스트는 미실행 상태로 유지한다. -->
  <!-- 4단계 후속 reaction repository 분리 메모: BBS_REACTION 조회/생성/수정/삭제와 BBS 좋아요/싫어요 카운트 갱신 SQL을 reactions.repository.js로 이동했다. 자동 검증 후에도 reaction 기능 브라우저/DB 수동 테스트는 미실행 상태로 유지한다. -->

## repository split closing note

- Scope checked: posts.repository.js, comments.repository.js, reactions.repository.js, and repository import/call flow in routes/bbs.js.
- Export style: all three repositories use CommonJS module.exports consistently.
- Responsibility check: repository functions receive connection and handle SQL execution/bind construction only.
- Transaction check: commit/rollback remains in routes; write repository calls keep the existing autoCommit false flow.
- Route logic retained: auth checks, input validation, redirect, flash/message, and response handling remain in routes/bbs.js.
- Validation record: npm run verify:app, npm run lint, npm run format:check passed.
- Manual test status: browser/DB manual tests were not executed, so feature test statuses remain not executed.
- Remaining checks: DB tests are still needed for post update/delete, comment create/reply/update/delete, and reaction create/switch/cancel.
- Deferred SQL: post creation, file upload, and users SQL remain deferred for stability because they are coupled to transaction/upload/auth flows.

## route split step 5 note

- Scope changed: moved only reaction and comment POST route handlers out of `routes/bbs.js`.
- New route files: `routes/bbs/reactions.routes.js`, `routes/bbs/comments.routes.js`.
- URL behavior: existing paths such as `/bbs/reaction`, `/bbs/wsave`, `/bbs/wreply`, `/bbs/wupdate`, and `/bbs/wdelete` are kept.
- Deferred route areas: auth/user routes, post CRUD routes, file upload/download routes, EJS partial split, and README cleanup were not changed.
- Validation record: `npm run verify:app`, `npm run lint`, and `npm run format:check` passed after the split.
- Manual test status: browser/DB manual tests were not executed, so comment and reaction feature statuses remain not executed.

## route split step 5 high-intensity note

- Scope changed: split `routes/bbs.js` into feature routers while keeping the `/bbs` mount path in `app.js` unchanged.
- Final route files: `routes/bbs/auth.routes.js`, `routes/bbs/posts-read.routes.js`, `routes/bbs/posts-write.routes.js`, `routes/bbs/files.routes.js`, `routes/bbs/comments.routes.js`, `routes/bbs/reactions.routes.js`.
- Helper files added/used: `routes/helpers/upload.js`, `routes/helpers/response.js`, `routes/helpers/validation.js`, `routes/middleware/auth.js`.
- `routes/bbs.js` responsibility after split: CSRF middleware, `res.locals.csrfToken`, `/` to `/list` redirect, feature router mounting, and CSRF error handler.
- URL behavior intended to remain unchanged: `/bbs/list`, `/bbs/search`, `/bbs/read`, `/bbs/form`, `/bbs/save`, `/bbs/update`, `/bbs/updatesave`, `/bbs/delete`, `/bbs/download`, `/bbs/login`, `/bbs/logincheck`, `/bbs/logout`, `/bbs/signup`, `/bbs/signupsave`, `/bbs/updatesignup`, `/bbs/updatesignsave`, `/bbs/withdraw`, `/bbs/find-id`, `/bbs/reset-password`, `/bbs/reset-password/request`, `/bbs/reset-password/confirm`, `/bbs/check-id`, `/bbs/myinfo`, `/bbs/reaction`, `/bbs/wsave`, `/bbs/wreply`, `/bbs/wupdate`, `/bbs/wdelete`.
- Automatic validation record: `npm run verify:app`, `npm run lint`, and `npm run format:check` passed after each split group and at the end.
- Route loading check: `app` and all split route modules loaded with `require(...)` without runtime load errors.
- Manual test status: browser/DB/file manual tests were not executed, so feature statuses remain not executed.
- Step 5 closeout status: implementation complete, manual tests not executed.
- Remaining manual checks: route split after member/auth real flow test needed; post list/read/create/update/delete real DB test needed; file upload/download real file test needed; comment/reaction real DB test needed.
- Out of scope confirmed: no new feature implementation, no EJS UI change, no README cleanup, and no DB schema change.

## post step 5 submission stability check

- Scope check: current changes are limited to route split files, upload helper, `routes/bbs.js` composition, and this manual test document.
- Automatic validation record: `npm run verify:app`, `npm run lint`, and `npm run format:check` passed.
- Server execution check: Express app was started on a temporary local port with `app.listen(...)` and handled an HTTP request.
- Executed URL check: `GET /bbs/list` returned HTTP 200 with `text/html; charset=utf-8`.
- DB-dependent result: `/bbs/list` loaded successfully, so the list route and its DB query path were reachable in this environment.
- Manual browser status: a real browser was not used.
- Not executed: signup, login, write, read detail, update, delete, comment, reply, comment update/delete, reaction, file upload/download, and logout remain not executed.
- Remaining checks: full browser flow and real DB data mutation tests are still needed before treating all features as manually passed.
