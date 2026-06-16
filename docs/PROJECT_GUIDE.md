# BBS 프로젝트 가이드

최종 정리일: 2026-06-17

이 문서는 프로젝트 구조와 유지보수 기준을 빠르게 파악하기 위한 안내 문서이다. 먼저 이 파일을 읽고, 필요한 항목만 아래 파일로 이동한다.

## 가장 먼저 볼 파일

| 궁금한 내용                  | 확인할 파일               |
| ---------------------------- | ------------------------- |
| 설치, 실행, 주요 URL         | `README.md`               |
| 서버 구조와 요청 흐름        | `docs/architecture.md`    |
| DB 테이블, 시퀀스, 상태 컬럼 | `docs/schema_summary.md`  |
| 기능별 테스트 절차           | `docs/test_plan.md`       |
| 오류 해결 방법               | `docs/troubleshooting.md` |

## 서버 코드 기준

| 영역                 | 시작 파일                      | 설명                                                            |
| -------------------- | ------------------------------ | --------------------------------------------------------------- |
| Express 앱 설정      | `app.js`                       | EJS, static, session, flash message, router, error handler 연결 |
| 서버 실행            | `bin/www`                      | HTTP 서버 시작 진입점                                           |
| DB 설정              | `config/dbconfig.js`           | `.env`의 OracleDB 접속 정보 사용                                |
| DB connection helper | `db/oracle.js`                 | `withConnection()`으로 connection close 공통 처리               |
| `/bbs` 조립          | `routes/bbs.js`                | CSRF 적용, feature router mount, 조회수 skip token 처리         |
| 로그인 필요 처리     | `routes/middleware/auth.js`    | 로그인하지 않은 사용자를 `/bbs/login`으로 이동                  |
| 공통 응답            | `routes/helpers/response.js`   | 400/403 응답 helper                                             |
| 입력값 검증          | `routes/helpers/validation.js` | 문자열 trim, 길이 제한, 숫자 파라미터 검증                      |
| 파일 업로드          | `routes/helpers/upload.js`     | multer, 확장자/MIME allowlist, 저장 경로 검증                   |

## 기능별 라우터

| 기능                                | 파일                               | 주요 URL                                                                      |
| ----------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| 회원, 로그인, 비밀번호 재설정       | `routes/bbs/auth.routes.js`        | `/bbs/login`, `/bbs/signup`, `/bbs/myinfo`, `/bbs/reset-password/*`           |
| 목록, 검색, 상세 읽기               | `routes/bbs/posts-read.routes.js`  | `/bbs/list`, `/bbs/search`, `/bbs/read`                                       |
| 글쓰기, 수정, 삭제, 파일 메타데이터 | `routes/bbs/posts-write.routes.js` | `/bbs/form`, `/bbs/save`, `/bbs/update`, `/bbs/delete`                        |
| 첨부파일 다운로드                   | `routes/bbs/files.routes.js`       | `/bbs/download`                                                               |
| 댓글, 대댓글, 댓글 반응             | `routes/bbs/comments.routes.js`    | `/bbs/wsave`, `/bbs/wreply`, `/bbs/wupdate`, `/bbs/wdelete`, `/bbs/wreaction` |
| 게시글 좋아요/싫어요                | `routes/bbs/reactions.routes.js`   | `/bbs/reaction`                                                               |

## DB 접근 파일

| 파일                                      | 역할                                                     |
| ----------------------------------------- | -------------------------------------------------------- |
| `db/repositories/posts.repository.js`     | 게시글 목록, 검색, 상세, 조회수, 파일 조회, 글 수정/삭제 |
| `db/repositories/comments.repository.js`  | 댓글 계층 조회, 댓글/대댓글 CRUD, 댓글 reaction count    |
| `db/repositories/reactions.repository.js` | 게시글 reaction 생성, 취소, 전환                         |

## 화면 파일

| 화면                 | 파일                                                       |
| -------------------- | ---------------------------------------------------------- |
| 목록                 | `views/bbs/list.ejs`                                       |
| 상세, 댓글, reaction | `views/bbs/read.ejs`                                       |
| 글쓰기               | `views/bbs/form.ejs`                                       |
| 글수정               | `views/bbs/updateform.ejs`                                 |
| 로그인               | `views/bbs/login.ejs`                                      |
| 회원가입             | `views/bbs/signup.ejs`                                     |
| 내 정보              | `views/bbs/myinfo.ejs`                                     |
| 회원정보 수정        | `views/bbs/updatesignform.ejs`                             |
| ID 찾기              | `views/bbs/findid.ejs`                                     |
| 비밀번호 재설정      | `views/bbs/resetrequest.ejs`, `views/bbs/resetconfirm.ejs` |
| 공통 UI              | `views/bbs/partials/*.ejs`                                 |

## DB 스크립트

| 상황           | 실행 파일                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| 새 DB 생성     | `scripts/schema.sql` 실행 후 `scripts/sample-data.sql` 실행                                                    |
| 기존 DB 보강   | `scripts/migration.sql`                                                                                        |
| 롤백 참고      | `scripts/rollback.sql`                                                                                         |
| 부분 보강 참고 | `scripts/add-view-count.sql`, `scripts/add-login-salt.sql`, `scripts/add-bbsw.sql`, `scripts/add-bbs-file.sql` |

## 기본 확인 순서

1. `.env`에 `SESSION_SECRET`, `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` 설정
2. OracleDB에 `scripts/schema.sql` 또는 `scripts/migration.sql` 적용
3. `npm install`
4. `npm run verify:app`
5. `npm run lint`
6. `npm run format:check`
7. `git diff --check`
8. 브라우저에서 `http://localhost:3000/bbs/list` 확인
9. 회원가입, 로그인, 글쓰기, 상세, 댓글, reaction, 파일 업로드/다운로드 확인

## 유지보수 원칙

- URL은 기존 경로인 `/bbs/...`를 유지한다.
- DB 값은 bind variable을 사용하고, 검색/정렬 컬럼은 whitelist에서만 고른다.
- 삭제는 기본적으로 `OK = 0` soft delete를 사용한다.
- 주요 POST form에는 CSRF token을 포함한다.
- 업로드 파일은 DB 메타데이터와 실제 파일 경로를 함께 검증한다.
- `.env` 실제 값은 문서, 로그, Git에 남기지 않는다.
- 공개용 안정 상태는 `main`, 보안 실험과 추가 보안 개선은 `security-lab`에서 진행한다.
