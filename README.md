# BBS 게시판 프로젝트

Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트이다. 교수님 수업자료 요구사항을 기준으로 게시판 기본 흐름을 복구하고, 제출 전 필수 기능과 보안 개선을 단계적으로 보완하는 것을 목표로 한다.

## 현재 프로젝트 상태 분석

현재 코드 기준으로 게시글 CRUD, 검색, 로그인, 로그아웃, 회원가입, 회원정보 수정, 세션 처리, 조회수 기능이 구현되어 있다. `routes/bbs.js` 하나에 게시판과 회원 기능이 집중되어 있으며, 화면은 `views/bbs/*.ejs`와 `views/bbs/partials/*.ejs`로 구성되어 있다.

아직 bcrypt 비밀번호 암호화는 실제 라우트에 적용되지 않았다. `bcrypt` 패키지는 설치되어 있지만 회원가입, 로그인, 회원정보 수정은 평문 비밀번호 저장 및 비교 구조이다. SQL은 대부분 문자열 결합 방식으로 작성되어 있어 SQL Injection 위험이 남아 있다.

댓글, 파일 업로드, 페이징은 아직 라우트, 뷰, DB 구조가 구현되지 않았다. `multer` 패키지는 설치되어 있지만 업로드 폴더와 업로드 라우트는 없다.

## 사용 기술 스택

| 구분            | 사용 기술                                   |
| --------------- | ------------------------------------------- |
| Runtime         | Node.js                                     |
| Web Framework   | Express                                     |
| Template Engine | EJS                                         |
| Database        | OracleDB                                    |
| Session         | express-session                             |
| Environment     | dotenv                                      |
| Logging         | morgan                                      |
| UI              | Bootstrap 5 CDN, custom CSS                 |
| Password 후보   | bcrypt 설치됨, 미적용                       |
| Upload 후보     | multer 설치됨, 미적용                       |
| Dev Tooling     | ESLint, Prettier, nodemon                   |
| 개발 환경       | Windows, WSL2, VSCode Remote-SSH, Codex CLI |
| Version Control | Git, GitHub 사용 예정                       |

## 현재 구현 기능

| 기능            | 상태   | 코드 기준                                 |
| --------------- | ------ | ----------------------------------------- |
| 게시글 목록     | 완료   | `GET /bbs/list`                           |
| 게시글 작성     | 완료   | `GET /bbs/form`, `POST /bbs/save`         |
| 게시글 읽기     | 완료   | `GET /bbs/read?brdno={no}`                |
| 게시글 수정     | 완료   | `GET /bbs/update`, `POST /bbs/updatesave` |
| 게시글 삭제     | 완료   | `GET /bbs/delete`, soft delete            |
| 게시글 검색     | 완료   | `GET /bbs/search`                         |
| 조회수          | 완료   | `BBS.VIEW_COUNT`, read 진입 시 증가       |
| 로그인          | 완료   | `POST /bbs/logincheck`                    |
| 로그아웃        | 완료   | `GET /bbs/logout`                         |
| 회원가입        | 완료   | `POST /bbs/signupsave`                    |
| 회원정보 수정   | 완료   | `POST /bbs/updatesignsave`                |
| 세션 처리       | 완료   | `req.session.user`                        |
| 비밀번호 암호화 | 미완료 | bcrypt 설치만 됨                          |
| 페이징          | 미완료 | 라우트/뷰 없음                            |
| 댓글            | 미완료 | 테이블/라우트/뷰 없음                     |
| 파일 업로드     | 미완료 | multer 설치만 됨                          |

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

`SESSION_SECRET`이 없으면 `app.js`에서 실행을 중단한다. DB 환경변수가 없으면 `config/dbconfig.js`에서 실행을 중단한다.

## OracleDB 스키마 생성

신규 DB에는 다음 순서로 실행한다.

```sql
@scripts/schema.sql
@scripts/sample-data.sql
```

이미 기존 `BBS` 테이블이 있고 조회수 컬럼만 추가해야 한다면 다음 스크립트를 실행한다.

```sql
@scripts/add-view-count.sql
```

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
| `npm run dev`              | nodemon으로 개발 서버 실행           |
| `npm run lint`             | JS 코드 ESLint 검사                  |
| `npm run format`           | Prettier 전체 포맷                   |
| `npm run format:check`     | Prettier 포맷 검사                   |
| `npm run audit`            | npm 취약점 검사                      |
| `npm run verify:app`       | Express 앱 모듈 로드 검증            |
| `npm run check`            | lint, format check, audit 연속 실행  |
| `npm run security:secrets` | gitleaks 설치 환경에서 secret scan   |
| `npm run security:semgrep` | semgrep 설치 환경에서 보안 패턴 scan |

## 디렉토리 구조

```text
BBS/
|- app.js
|- bin/
|  `- www
|- config/
|  `- dbconfig.js
|- docs/
|  |- architecture.md
|  |- change_log.md
|  |- codex_workflow.md
|  |- dev_setup_report.md
|  |- progress_report.md
|  |- requirements_summary.md
|  |- security_notes.md
|  |- test_plan.md
|  `- troubleshooting.md
|- public/
|  `- stylesheets/
|     `- style.css
|- routes/
|  |- bbs.js
|  |- index.js
|  `- users.js
|- scripts/
|  |- add-view-count.sql
|  |- sample-data.sql
|  `- schema.sql
|- views/
|  |- bbs/
|  |  |- form.ejs
|  |  |- list.ejs
|  |  |- login.ejs
|  |  |- read.ejs
|  |  |- signup.ejs
|  |  |- updateform.ejs
|  |  |- updatesignform.ejs
|  |  `- partials/
|  |     |- head.ejs
|  |     `- nav.ejs
|  |- error.ejs
|  |- error.jade
|  |- index.jade
|  `- layout.jade
|- .env.example
|- .prettierignore
|- .prettierrc
|- .vscode/
|  |- extensions.json
|  |- launch.json
|  `- settings.json
|- eslint.config.js
|- NOTION.md
|- package.json
`- README.md
```

현재 `middleware/`, `uploads/`, `public/uploads/` 디렉토리는 없다. Jade 템플릿 파일은 Express 기본 생성 파일로 남아 있지만 현재 뷰 엔진은 EJS이다.

## 주요 파일 역할

| 파일                           | 역할                                                |
| ------------------------------ | --------------------------------------------------- |
| `app.js`                       | Express 앱 초기화, EJS 설정, 세션 설정, 라우터 연결 |
| `bin/www`                      | 서버 실행 진입점                                    |
| `config/dbconfig.js`           | OracleDB 환경변수 검증 및 접속 설정                 |
| `routes/bbs.js`                | 게시판, 검색, 인증, 회원정보 수정 핵심 라우터       |
| `views/bbs/*.ejs`              | 게시판 및 회원 화면                                 |
| `views/bbs/partials/*.ejs`     | 공통 head, navigation                               |
| `public/stylesheets/style.css` | Bootstrap 보완용 CSS                                |
| `scripts/schema.sql`           | `LOGIN`, `BBS`, `BBS_SEQ` 생성                      |
| `scripts/sample-data.sql`      | 과제 테스트용 초기 데이터                           |
| `.vscode/launch.json`          | VSCode Express 디버깅 설정                          |

## DB 구조

### LOGIN

| 컬럼       | 설명                     |
| ---------- | ------------------------ |
| `ID`       | 회원 ID, PK              |
| `PASSWORD` | 비밀번호, 현재 평문 저장 |
| `NAME`     | 이름                     |
| `EMAIL`    | 이메일                   |
| `OK`       | 회원 활성 상태           |

### BBS

| 컬럼         | 설명             |
| ------------ | ---------------- |
| `NO`         | 게시글 번호, PK  |
| `TITLE`      | 제목             |
| `CONTENT`    | 본문             |
| `WRITER`     | 작성자           |
| `REGDATE`    | 작성일           |
| `VIEW_COUNT` | 조회수           |
| `OK`         | 게시글 활성 상태 |

### BBS_SEQ

게시글 번호 생성을 위한 Oracle sequence이다.

## 보안 적용 사항

현재 적용된 사항:

- `.env` 기반 DB 정보 분리
- `SESSION_SECRET` 환경변수 필수화
- 세션에는 사용자 ID와 인증 상태만 저장
- 비로그인 사용자의 글쓰기, 글 저장, 글수정, 글삭제, 회원정보 수정 저장 접근 제한
- `.gitignore`에 `.env`, 업로드 폴더, 로그 파일 제외
- secret scan과 Semgrep 실행용 npm script 추가

현재 남은 보안 문제:

- 비밀번호가 평문 저장 및 평문 비교 구조이다.
- SQL 문자열 직접 결합이 다수 남아 있다.
- 게시글 수정/삭제 시 작성자 권한 검사가 없다.
- 삭제가 `GET /bbs/delete`로 처리된다.
- CSRF 방어가 없다.
- 입력값 검증과 길이 제한이 서버 측에서 충분하지 않다.
- session cookie의 `httpOnly`, `secure`, `sameSite` 옵션이 명시되어 있지 않다.

## 개발 환경

- Windows 작업 디렉토리: `C:\BBS\BBS`
- WSL2 사용 가능
- VSCode Remote-SSH 사용
- Codex CLI로 코드 분석, 수정, 검증 진행
- Git 기반 변경 관리
- `rg` 중심 검색 권장

VSCode 권장 확장은 `.vscode/extensions.json`에 정리되어 있다. Node 디버깅은 VSCode의 `Debug Express` 구성을 사용한다.

## Git/GitHub 사용 방법

현재 변경 상태 확인:

```powershell
git status --short
```

변경 내용 확인:

```powershell
git diff
```

검증 후 커밋:

```powershell
npm run lint
npm run verify:app
git add README.md NOTION.md docs package.json .vscode
git commit -m "docs: sync project documentation with current implementation"
```

GitHub 원격 저장소가 연결되어 있으면 다음 명령으로 업로드한다.

```powershell
git push
```

## 추후 개발 예정 기능

우선순위:

1. bcrypt 비밀번호 암호화 적용
2. 로그인/회원가입/회원정보 수정 SQL bind variable 적용
3. 게시판 CRUD/검색/조회수 SQL bind variable 적용
4. 페이징 구현
5. 댓글 테이블과 댓글 작성/목록 구현
6. 파일 업로드 폼, multer 설정, 첨부파일 저장 구현
7. 작성자 권한 체크
8. 입력값 검증
9. 삭제 요청을 POST 방식으로 변경
10. 최소 자동 테스트 추가

## 관련 문서

- `NOTION.md`: 현재 진행 상황과 작업 메모
- `docs/architecture.md`: 구조 분석
- `docs/security_notes.md`: 보안 현황과 개선 계획
- `docs/test_plan.md`: 검증 계획
- `docs/troubleshooting.md`: 오류 해결 기록
- `docs/change_log.md`: 변경 이력
- `docs/codex_workflow.md`: Codex 작업 루틴
