# BBS 게시판 프로젝트

Node.js, Express, EJS, OracleDB를 사용한 게시판 웹 애플리케이션입니다.  
수업 과제와 웹 백엔드 학습을 목적으로 만든 프로젝트이며, 기본 게시판 기능과 로그인/회원가입 흐름을 구현하는 것을 목표로 합니다.

현재는 게시글 CRUD, 검색, 로그인/로그아웃, 회원가입, 회원정보 수정, 세션 처리, Bootstrap 기반 UI가 구현되어 있습니다. 댓글, 파일 업로드, 조회수, 페이징, 비밀번호 암호화 개선은 이후 작업 예정입니다.

## Tech Stack

| Category | Stack |
| --- | --- |
| Runtime | Node.js |
| Server | Express |
| View | EJS |
| Database | OracleDB |
| UI | Bootstrap |
| Session | express-session |
| Environment | dotenv |
| Password Hashing | bcrypt 설치됨, 적용 예정 |
| File Upload | multer 설치됨, 적용 예정 |

## Features

### Implemented

- 회원가입
- 로그인 / 로그아웃
- 세션 처리
- 게시글 목록 조회
- 게시글 작성
- 게시글 상세 조회
- 게시글 수정
- 게시글 삭제 처리, soft delete 방식
- 제목 / 작성자 / 내용 검색
- 회원정보 수정
- Bootstrap 기반 화면 구성
- `.env` 기반 DB 접속 정보 관리

### Planned

- 비밀번호 bcrypt 암호화 적용
- SQL Injection 방지를 위한 bind variable 적용
- 조회수 기능
- 페이징
- 댓글
- 파일 업로드
- 인증 미들웨어 분리
- 작성자 권한 체크
- Docker 개발 환경

## Project Structure

```text
BBS/
├─ app.js
├─ bin/
│  └─ www
├─ config/
│  └─ dbconfig.js
├─ docs/
│  └─ requirements_summary.md
├─ public/
│  ├─ images/
│  ├─ javascripts/
│  └─ stylesheets/
│     └─ style.css
├─ routes/
│  ├─ bbs.js
│  ├─ index.js
│  └─ users.js
├─ scripts/
│  ├─ schema.sql
│  └─ sample-data.sql
├─ views/
│  ├─ error.ejs
│  └─ bbs/
│     ├─ form.ejs
│     ├─ list.ejs
│     ├─ login.ejs
│     ├─ read.ejs
│     ├─ signup.ejs
│     ├─ updateform.ejs
│     ├─ updatesignform.ejs
│     └─ partials/
│        ├─ head.ejs
│        └─ nav.ejs
├─ .env.example
├─ .gitignore
├─ package.json
├─ package-lock.json
└─ README.md
```

### Folder Roles

| Path | Description |
| --- | --- |
| `app.js` | Express 앱 설정, 미들웨어, 라우터 연결 |
| `bin/www` | 서버 실행 엔트리포인트 |
| `config/dbconfig.js` | OracleDB 접속 설정 |
| `routes/bbs.js` | 게시판, 로그인, 회원 관련 라우터 |
| `views/bbs/` | EJS 화면 파일 |
| `views/bbs/partials/` | 공통 head, navigation partial |
| `public/` | 정적 파일, CSS, 이미지, JS |
| `scripts/` | OracleDB 테이블 및 샘플 데이터 SQL |
| `docs/` | 요구사항 요약 문서 |

## Getting Started

아래 절차는 Windows PowerShell 기준입니다.

### 1. Repository Clone

```powershell
git clone https://github.com/jiwoongchoi-norun/BBS.git
cd BBS
```

이미 프로젝트 폴더가 있다면 해당 폴더로 이동합니다.

```powershell
cd C:\BBS\BBS
```

### 2. Install Dependencies

```powershell
npm install
```

설치 확인:

```powershell
npm ls --depth=0
```

`oracledb`가 누락되어 있으면 다시 설치합니다.

```powershell
npm install
```

### 3. Prepare OracleDB

Oracle XE 또는 접속 가능한 OracleDB가 필요합니다.

예시 접속 정보:

```text
DB_USER=your_db_user
DB_CONNECT_STRING=localhost/XEPDB1
```

SQL 실행은 SQL*Plus 또는 SQL Developer를 사용할 수 있습니다.

### 4. Create `.env`

`.env.example`을 복사해서 `.env`를 만듭니다.

```powershell
Copy-Item .env.example .env
notepad .env
```

`.env` 예시:

```env
PORT=3000
SESSION_SECRET=change-this-session-secret

DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost/XEPDB1
```

주의:

- 실제 DB 비밀번호는 README에 작성하지 않습니다.
- `.env`는 GitHub에 올리지 않습니다.
- `.env.example`은 필요한 환경변수 이름을 공유하기 위한 예시 파일입니다.

### 5. Create Tables

SQL*Plus 예시:

```sql
@scripts/schema.sql
@scripts/sample-data.sql
```

SQL Developer를 사용하는 경우:

1. OracleDB 계정으로 접속합니다.
2. `scripts/schema.sql` 내용을 실행합니다.
3. `scripts/sample-data.sql` 내용을 실행합니다.
4. `COMMIT`이 실행되었는지 확인합니다.

현재 SQL 스크립트는 기본 `LOGIN`, `BBS`, `BBS_SEQ`를 생성합니다.

### 6. Start Server

```powershell
npm start
```

브라우저에서 접속합니다.

```text
http://localhost:3000/bbs/list
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Express 서버 포트, 기본값 3000 |
| `SESSION_SECRET` | Yes | express-session secret |
| `DB_USER` | Yes | OracleDB 사용자명 |
| `DB_PASSWORD` | Yes | OracleDB 비밀번호 |
| `DB_CONNECT_STRING` | Yes | OracleDB 접속 문자열 |

`SESSION_SECRET`, `DB_PASSWORD` 같은 값은 공개 저장소에 올리면 안 됩니다.

## OracleDB Notes

이 프로젝트는 OracleDB 연결에 `oracledb` 패키지를 사용합니다.

현재 기본 스키마:

- `LOGIN`: 회원 계정 정보
- `BBS`: 게시글 정보
- `BBS_SEQ`: 게시글 번호 sequence

아직 포함되지 않은 테이블:

- 댓글 테이블
- 파일 업로드 메타데이터 테이블
- 조회수 관련 컬럼 또는 테이블

## Git and GitHub Notes

다음 파일과 폴더는 Git에 올리지 않습니다.

```text
.env
.env.local
node_modules/
uploads/
public/uploads/
*.log
docs/*.pdf
docs/*.ppt
docs/*.pptx
```

GitHub 공개 저장소에 올리기 전 확인:

```powershell
git status --short
git check-ignore -v .env
git check-ignore -v node_modules
```

민감정보 검색 예시:

```powershell
Select-String -Path app.js,routes\*.js,config\*.js -Pattern "password|secret|connectString|TEST_USER|1234"
```

## Known Issues

- SQL 문자열을 직접 결합하고 있어 SQL Injection 위험이 있습니다.
- 회원 비밀번호가 현재 평문으로 저장됩니다.
- `bcrypt`는 설치되어 있지만 아직 로그인/회원가입 로직에 적용되지 않았습니다.
- 세션에 사용자 비밀번호가 저장되는 구조가 남아 있습니다.
- 게시글 작성, 수정, 삭제에 대한 인증/권한 체크가 부족합니다.
- 삭제 요청이 `GET /bbs/delete`로 처리됩니다.
- 댓글, 파일 업로드, 조회수, 페이징 기능은 아직 구현되지 않았습니다.
- Docker 설정은 아직 없습니다.
- 자동 테스트 코드는 아직 없습니다.

## Screenshots

추후 화면 캡처를 추가할 예정입니다.

- 게시판 목록 화면
- 게시글 작성 화면
- 게시글 상세 화면
- 로그인 화면
- 회원가입 화면
- 회원정보 수정 화면

## Roadmap

### Assignment Priority

- bcrypt 비밀번호 암호화 적용
- Oracle bind variable 적용
- 조회수 기능
- 페이징
- 댓글
- 파일 업로드
- 기능별 테스트 체크리스트 정리
- 제출용 화면 캡처 정리

### Portfolio Improvement

- 라우터 / 컨트롤러 / 서비스 계층 분리
- DB query 모듈 분리
- 인증 미들웨어 추가
- 작성자 권한 체크
- Dockerfile 추가
- docker-compose 개발 환경 구성
- 테스트 코드 추가
- GitHub Actions CI 적용
- 배포 환경 구성

## License

이 프로젝트는 학습 및 수업 과제 제출을 목적으로 작성되었습니다.
