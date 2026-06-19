# BBS 자유게시판

Node.js, Express, EJS, PostgreSQL 기반 자유게시판 프로젝트입니다.

이 저장소는 게시글, 댓글, 파일 업로드, 계정 관리, 관리자 운영 기능을 포함한 게시판 애플리케이션입니다.

## 실행 환경

| 구분      | 내용                             |
| --------- | -------------------------------- |
| Runtime   | Node.js                          |
| Framework | Express                          |
| Template  | EJS                              |
| Database  | PostgreSQL                       |
| Session   | express-session                  |
| Security  | bcrypt, CSRF, Helmet, rate limit |
| Upload    | multer                           |
| Tooling   | ESLint, Prettier                 |

## 설치와 실행

```bash
npm install
```

`.env.example`을 참고해 `.env`를 작성합니다.

```env
PORT=3000
HOST=127.0.0.1
SESSION_SECRET=change-this-session-secret
DATABASE_URL=postgres://bbs:bbs_dev_password@127.0.0.1:5432/bbs
PG_TIMEZONE=Asia/Seoul
```

개발용 PostgreSQL을 Docker로 실행합니다.

```bash
docker compose up -d postgres
```

DB 스키마와 샘플 데이터를 적용합니다.

```bash
psql "$DATABASE_URL" -f scripts/schema.sql
psql "$DATABASE_URL" -f scripts/sample-data.sql
```

모의해킹용 더미 데이터를 추가합니다.

```bash
npm run db:seed
```

실행:

```bash
npm start
```

개발 실행:

```bash
npm run dev
```

## 주요 기능

| 기능        | 내용                                  |
| ----------- | ------------------------------------- |
| 게시글      | 목록, 글쓰기, 글읽기, 글수정, 글삭제  |
| 검색/페이징 | 제목, 작성자, 내용 검색과 페이지 이동 |
| 계정        | 회원가입, 로그인, 로그아웃, 내 정보   |
| 보안        | 세션, CSRF, bcrypt 비밀번호 저장      |
| 상호작용    | 조회수, 댓글, 대댓글, 좋아요/싫어요   |
| 파일        | 첨부파일 업로드와 다운로드            |
| 운영        | 관리자, 공지글, 게시글/댓글 숨김 관리 |

## 주요 URL

| Method     | Path                                                        | 기능                                           |
| ---------- | ----------------------------------------------------------- | ---------------------------------------------- |
| GET        | `/bbs`, `/bbs/list`                                         | 게시글 목록                                    |
| GET        | `/bbs/search`                                               | 검색                                           |
| GET        | `/bbs/read`                                                 | 게시글 상세, 조회수, 댓글, 첨부파일, 반응 상태 |
| GET / POST | `/bbs/form`, `/bbs/save`                                    | 글쓰기, 파일 업로드                            |
| GET / POST | `/bbs/update`, `/bbs/updatesave`                            | 글수정                                         |
| GET / POST | `/bbs/delete`                                               | GET은 안내/이동, POST는 글 soft delete         |
| GET / POST | `/bbs/login`, `/bbs/logincheck`                             | 로그인                                         |
| GET        | `/bbs/logout`                                               | 로그아웃                                       |
| GET / POST | `/bbs/signup`, `/bbs/signupsave`                            | 회원가입                                       |
| GET        | `/bbs/check-id`                                             | ID 중복 확인                                   |
| GET / POST | `/bbs/find-id`                                              | ID 찾기                                        |
| GET / POST | `/bbs/reset-password/*`                                     | 비밀번호 재설정                                |
| GET        | `/bbs/myinfo`                                               | 내 정보                                        |
| GET / POST | `/bbs/updatesignup`, `/bbs/updatesignsave`                  | 회원정보 수정                                  |
| POST       | `/bbs/withdraw`                                             | 회원 탈퇴                                      |
| POST       | `/bbs/wsave`, `/bbs/wreply`, `/bbs/wupdate`, `/bbs/wdelete` | 댓글/대댓글 작성 및 수정/삭제                  |
| POST       | `/bbs/reaction`                                             | 좋아요/싫어요                                  |
| GET        | `/bbs/download`                                             | 첨부파일 다운로드                              |
| GET        | `/bbs/admin`, `/bbs/admin/posts`                            | 관리자 대시보드, 게시글 운영 관리              |
| POST       | `/bbs/admin/posts/*`, `/bbs/admin/comments/*`               | 공지 설정, 게시글/댓글 숨김 및 복구            |

## 개발 품질 확인

```bash
npm run verify:app
npm run lint
npm run format:check
git diff --check
```

선택 확인:

```bash
npm run audit
npm run db:seed
npm run security:secrets
npm run security:semgrep
```

`npm run check`는 `lint`, `format:check`, `audit`를 함께 실행합니다.

## 로컬 테스트 계정

`scripts/sample-data.sql` 또는 `npm run db:seed` 기준 개발용 계정입니다. 공개 운영 환경에서는 반드시 비밀번호를 변경합니다.

| ID     | 권한  | 비밀번호       |
| ------ | ----- | -------------- |
| admin  | ADMIN | `Password123!` |
| user01 | USER  | `Password123!` |
| user02 | USER  | `Password123!` |
| user03 | USER  | `Password123!` |
| user04 | USER  | `Password123!` |
| user05 | USER  | `Password123!` |

## 참고 문서

| 문서                      | 용도                         |
| ------------------------- | ---------------------------- |
| `docs/PROJECT_GUIDE.md`   | 프로젝트 파일 안내           |
| `docs/architecture.md`    | 서버 구조, 라우터, 보안 흐름 |
| `docs/schema_summary.md`  | DB 테이블과 상태 컬럼        |
| `docs/test_plan.md`       | 기능별 테스트 절차           |
| `docs/troubleshooting.md` | 자주 나는 오류와 해결 방법   |
