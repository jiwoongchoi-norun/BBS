# BBS 게시판 프로젝트

Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트다. 교수님 PPT 요구사항을 기준으로 게시판 기본 흐름을 복구하고, 보안/편의 기능을 단계적으로 보강한다.

## 현재 상태

현재 코드 기준으로 게시글 CRUD, 검색, 로그인/로그아웃, 회원가입, 회원정보 수정, 세션 처리, 비밀번호 해시 저장, 조회수, 페이징, 댓글/대댓글, 파일 업로드/다운로드가 구현되어 있다. 주요 SQL은 Oracle bind variable 방식으로 정리되어 있고, 글/댓글 삭제와 게시글 수정/삭제에는 작성자 권한 체크가 적용되어 있다.

아직 bcrypt 전환, 댓글 수정, 좋아요/싫어요 실제 처리, 관리자 기능, 자동화 테스트는 남은 개선 후보이다.

## 사용 기술

| 구분            | 기술                                 |
| --------------- | ------------------------------------ |
| Runtime         | Node.js                              |
| Web Framework   | Express                              |
| Template Engine | EJS                                  |
| Database        | OracleDB                             |
| Session         | express-session                      |
| Environment     | dotenv                               |
| Logging         | morgan                               |
| UI              | Bootstrap 5 CDN, custom CSS          |
| Upload          | multer                               |
| Password        | SHA-512 + salt, bcrypt 패키지 설치됨 |
| Dev Tooling     | ESLint, Prettier, nodemon            |

## 구현 기능

| 기능            | 상태 | 주요 경로                                           |
| --------------- | ---- | --------------------------------------------------- |
| 게시글 목록     | 완료 | `GET /bbs/list`                                     |
| 글쓰기          | 완료 | `GET /bbs/form`, `POST /bbs/save`                   |
| 글읽기          | 완료 | `GET /bbs/read?brdno={no}`                          |
| 글수정          | 완료 | `GET /bbs/update`, `POST /bbs/updatesave`           |
| 글삭제          | 완료 | `GET /bbs/delete`, soft delete                      |
| 검색            | 완료 | `GET /bbs/search`                                   |
| 로그인          | 완료 | `GET /bbs/login`, `POST /bbs/logincheck`            |
| 로그아웃        | 완료 | `GET /bbs/logout`                                   |
| 회원가입        | 완료 | `GET /bbs/signup`, `POST /bbs/signupsave`           |
| 회원정보 수정   | 완료 | `GET /bbs/updatesignup`, `POST /bbs/updatesignsave` |
| 세션 처리       | 완료 | `req.session.user`                                  |
| 비밀번호 암호화 | 완료 | SHA-512 + salt                                      |
| 조회수          | 완료 | `BBS.VIEW_COUNT`                                    |
| 페이징          | 완료 | 목록/검색 `page` query                              |
| 댓글            | 완료 | `POST /bbs/wsave`                                   |
| 대댓글          | 완료 | `POST /bbs/wreply`                                  |
| 댓글 삭제       | 완료 | `GET /bbs/wdelete`                                  |
| 파일 업로드     | 완료 | `POST /bbs/save`                                    |
| 파일 다운로드   | 완료 | `GET /bbs/download`                                 |

## 설치 방법

```powershell
npm install
```

`.env.example`을 참고해 `.env`를 작성한다.

```env
PORT=3000
SESSION_SECRET=change-this-session-secret

DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost/XEPDB1
```

필수 환경변수:

- `SESSION_SECRET`
- `DB_USER`
- `DB_PASSWORD`
- `DB_CONNECT_STRING`

## OracleDB 스키마 생성

신규 DB에는 다음 순서로 실행한다.

```sql
@scripts/schema.sql
@scripts/sample-data.sql
```

기존 DB에 기능별로 보강할 때는 필요한 스크립트를 실행한다.

```sql
@scripts/add-view-count.sql
@scripts/add-login-salt.sql
@scripts/add-bbsw.sql
@scripts/add-bbs-file.sql
```

`sample-data.sql`의 기본 관리자 계정은 SHA-512 + salt 해시 예시를 사용한다.

## 실행 방법

```powershell
npm start
```

개발 중 자동 재시작이 필요하면 다음 명령을 사용한다.

```powershell
npm run dev
```

기본 접속 주소:

```text
http://localhost:3000/bbs/list
```

## npm scripts

| 명령                       | 설명                                 |
| -------------------------- | ------------------------------------ |
| `npm start`                | Express 서버 실행                    |
| `npm run dev`              | nodemon 개발 서버 실행               |
| `npm run lint`             | JS 코드 ESLint 검사                  |
| `npm run format`           | Prettier 전체 포맷                   |
| `npm run format:check`     | Prettier 포맷 검사                   |
| `npm run audit`            | npm 취약점 검사                      |
| `npm run verify:app`       | Express 앱 모듈 로드 검증            |
| `npm run check`            | lint, format check, audit 연속 실행  |
| `npm run security:secrets` | gitleaks 설치 환경에서 secret scan   |
| `npm run security:semgrep` | semgrep 설치 환경에서 보안 패턴 scan |

## 디렉터리 구조

```text
BBS/
|- app.js
|- bin/www
|- config/dbconfig.js
|- docs/
|- public/stylesheets/style.css
|- routes/bbs.js
|- scripts/
|  |- add-bbs-file.sql
|  |- add-bbsw.sql
|  |- add-login-salt.sql
|  |- add-view-count.sql
|  |- sample-data.sql
|  `- schema.sql
|- uploads/bbs/
|- views/bbs/
|- package.json
`- README.md
```

`uploads/bbs/`에는 실제 업로드 파일이 저장된다. 제출물이나 git 관리 대상에는 실제 업로드 파일을 포함하지 않는다.

## 주요 문서

- `docs/requirements_summary.md`: 과제 요구사항과 현재 충족 상태
- `docs/progress_report.md`: 진행 보고서
- `docs/change_log.md`: 변경 이력
- `docs/security_report.md`: 보안 보강 내용
- `docs/password_hash_test.md`: 비밀번호 해시 수동 테스트 절차
- `docs/test_plan.md`: 제출 전 테스트 계획
- `docs/todo.md`: 남은 작업 목록

## 제출 전 확인

- `npm run lint`
- `npm run format:check`
- `npm run verify:app`
- OracleDB 신규 스키마 생성 확인
- 회원가입, 로그인, 글 작성, 파일 업로드, 댓글/대댓글, 검색, 페이징, 수정, 삭제 수동 테스트
