# BBS 자유게시판

Node.js, Express, EJS, OracleDB 기반 자유게시판 과제 프로젝트입니다.

이 repo는 게시판 본기능만 유지합니다. 취약점 학습 연구소는 별도 Security Labs repo에서 관리합니다.

## 실행 환경

| 구분      | 내용             |
| --------- | ---------------- |
| Runtime   | Node.js          |
| Framework | Express          |
| Template  | EJS              |
| Database  | OracleDB         |
| Session   | express-session  |
| Security  | bcrypt, csurf    |
| Upload    | multer           |
| Tooling   | ESLint, Prettier |

## 설치와 실행

```bash
npm install
```

`.env.example`을 참고해 `.env`를 작성합니다.

```env
PORT=3000
HOST=127.0.0.1
SESSION_SECRET=change-this-session-secret
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost/XEPDB1
```

신규 DB를 준비하는 경우:

```sql
@scripts/schema.sql
@scripts/sample-data.sql
```

기존 DB를 보강하는 경우:

```sql
@scripts/migration.sql
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

## 검증

```bash
npm run verify:app
npm run lint
npm run format:check
git diff --check
```

선택 검증:

```bash
npm run audit
npm run security:secrets
npm run security:semgrep
```

`npm run check`는 `lint`, `format:check`, `audit`를 함께 실행합니다.

## 참고 문서

| 문서                      | 용도                         |
| ------------------------- | ---------------------------- |
| `docs/PROJECT_GUIDE.md`   | 프로젝트 파일 안내           |
| `docs/architecture.md`    | 서버 구조, 라우터, 보안 흐름 |
| `docs/schema_summary.md`  | DB 테이블과 상태 컬럼        |
| `docs/test_plan.md`       | 기능별 테스트 절차           |
| `docs/troubleshooting.md` | 자주 나는 오류와 해결 방법   |
