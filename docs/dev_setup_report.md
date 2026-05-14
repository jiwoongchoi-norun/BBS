# 개발 환경 분석 보고서

## 1. 분석 목적

이 문서는 현재 BBS 프로젝트의 개발 환경과 디렉터리 구조를 정리하기 위해 작성한다.
이후 nodemon, ESLint, Prettier, 파일 업로드, 보안 개선, 테스트 자동화 작업을 단계적으로 적용하기 전에 현재 상태를 기준점으로 남긴다.

## 2. 현재 프로젝트 구조

```text
BBS/
|- app.js
|- bin/
|  `- www
|- config/
|  `- dbconfig.js
|- docs/
|  |- progress_report.md
|  |- requirements_summary.md
|  `- dev_setup_report.md
|- public/
|  `- stylesheets/
|     `- style.css
|- routes/
|  |- bbs.js
|  |- index.js
|  `- users.js
|- scripts/
|  |- schema.sql
|  `- sample-data.sql
|- views/
|  |- error.ejs
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
|  |- error.jade
|  |- index.jade
|  `- layout.jade
|- .env
|- .env.example
|- .gitignore
|- package.json
`- README.md
```

## 3. package.json 분석

현재 `package.json`의 실행 스크립트는 다음과 같다.

```json
{
  "scripts": {
    "start": "node ./bin/www"
  }
}
```

현재 확인된 주요 패키지는 다음과 같다.

| 구분 | 패키지 | 상태 |
| --- | --- | --- |
| 서버 | `express` | 설치됨 |
| 템플릿 | `ejs` | 설치됨 |
| DB | `oracledb` | 설치됨 |
| 세션 | `express-session` | 설치됨 |
| 환경변수 | `dotenv` | 설치됨 |
| 비밀번호 암호화 후보 | `bcrypt` | 설치됨 |
| 파일 업로드 후보 | `multer` | 설치됨 |
| 개발 자동 재시작 | `nodemon` | 설치됨 |

문제점:

- `nodemon`은 설치되어 있지만 `npm run dev` 스크립트가 아직 없다.
- ESLint, Prettier, Playwright는 아직 설정되어 있지 않다.

개선 이유:

- `npm run dev`를 추가하면 코드 수정 후 서버를 수동 재시작하지 않아도 된다.
- ESLint와 Prettier를 추가하면 문법 오류와 코드 스타일 문제를 더 빨리 확인할 수 있다.
- Playwright를 추가하면 로그인, 글쓰기, 수정, 삭제 같은 주요 흐름을 반복 테스트할 수 있다.

## 4. routes 구조 분석

현재 라우트 파일은 다음과 같다.

| 파일 | 역할 |
| --- | --- |
| `routes/bbs.js` | 게시판 CRUD, 검색, 로그인, 로그아웃, 회원가입, 회원정보 수정 |
| `routes/index.js` | 기본 index 라우트 |
| `routes/users.js` | Express 기본 users 라우트 |

현재 핵심 기능은 대부분 `routes/bbs.js`에 집중되어 있다.
교수님 수업 구조를 유지해야 하므로 전체 라우터 분리는 하지 않고, 기능별 개선도 `routes/bbs.js` 내부에서 최소 변경으로 진행하는 것이 적절하다.

## 5. views 구조 분석

현재 게시판 화면은 `views/bbs/*.ejs`에 모여 있다.

| 파일 | 역할 |
| --- | --- |
| `views/bbs/list.ejs` | 게시글 목록과 검색 |
| `views/bbs/read.ejs` | 게시글 상세 |
| `views/bbs/form.ejs` | 게시글 작성 |
| `views/bbs/updateform.ejs` | 게시글 수정 |
| `views/bbs/login.ejs` | 로그인 |
| `views/bbs/signup.ejs` | 회원가입 |
| `views/bbs/updatesignform.ejs` | 회원정보 수정 |
| `views/bbs/partials/head.ejs` | 공통 head |
| `views/bbs/partials/nav.ejs` | 공통 navigation |

문제점:

- 파일 업로드 입력 필드가 아직 작성 폼에 없다.
- 댓글, 페이징, 조회수 관련 화면 요소가 아직 없다.
- Jade 기본 템플릿 파일이 남아 있지만 현재 뷰 엔진은 EJS이다.

개선 이유:

- 기존 EJS 구조를 유지하면서 필요한 화면 요소만 추가하면 수업 코드 흐름을 크게 흔들지 않을 수 있다.

## 6. public 및 uploads 구조 분석

현재 `public`에는 스타일시트만 있다.

```text
public/
`- stylesheets/
   `- style.css
```

현재 `uploads/`와 `public/uploads/` 폴더는 존재하지 않는다.

문제점:

- 파일 업로드 기능을 구현하기 위한 저장 폴더가 아직 없다.
- 업로드 파일을 직접 공개할지, 서버 내부 저장소로만 둘지 정책이 정해져 있지 않다.

개선 방향:

- 과제 흐름상 단순 파일 첨부라면 `uploads/`를 서버 내부 저장소로 사용한다.
- 브라우저에서 첨부 파일 접근이 필요하면 `public/uploads/` 또는 별도 다운로드 라우트를 고려한다.
- 업로드 폴더는 GitHub에 올리지 않고 `.gitignore`로 제외한다.

## 7. dbconfig 구조 분석

현재 `config/dbconfig.js`는 `dotenv`를 사용해 DB 접속 정보를 환경변수에서 읽는다.

필수 환경변수:

- `DB_USER`
- `DB_PASSWORD`
- `DB_CONNECT_STRING`

현재 구조:

```js
module.exports = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
};
```

문제점:

- DB 환경변수 분리는 이미 적용되어 있어 큰 구조 변경은 필요하지 않다.
- 이후 작업에서는 `.env` 값을 출력하지 않도록 주의해야 한다.

개선 이유:

- DB 계정 정보가 코드에 남지 않아 GitHub 업로드 위험이 줄어든다.
- 개발자별 OracleDB 접속 정보를 각자의 `.env`에서 관리할 수 있다.

## 8. .gitignore 확인

현재 `.gitignore`에는 다음 항목이 포함되어 있다.

- `node_modules/`
- `.env`, `.env.local`, `.env.*`
- `uploads/`
- `public/uploads/`
- `docs/*.pdf`
- `docs/*.ppt`
- `docs/*.pptx`
- `AGENTS.md`
- `notion.md`
- `docs/result.txt`
- `pdftotext.exe`

현재 기준으로 GitHub에 올리면 안 되는 환경변수, 업로드 파일, 로컬 추출 도구는 제외되어 있다.

## 9. 다음 단계 작업 계획

### 9.1 개발 편의성 설정

- `package.json`에 `dev` 스크립트 추가
- 예상 스크립트:

```json
{
  "dev": "nodemon ./bin/www"
}
```

### 9.2 코드 스타일 및 오류 검사

- ESLint 설치
- Prettier 설치
- JS 중심으로 우선 검사
- EJS는 전체 자동 포맷보다 문법 오류와 위험 패턴 점검 중심으로 접근

### 9.3 파일 업로드 기능

- `uploads/` 폴더 생성
- `multer` 설정
- 파일명 중복 방지
- 크기 제한
- 허용 타입 제한: JPEG, PNG, PDF
- `form.ejs`와 `/bbs/save` 라우터에 최소 통합

### 9.4 보안 개선

- 현재 비밀번호 저장 방식 확인
- 회원가입, 로그인, 회원정보 수정에 암호화 적용
- SQL bind variable 적용 가능 구간부터 단계적으로 전환

### 9.5 자동 테스트

- Playwright 설치
- 로그인, 글쓰기, 글수정, 글삭제, 댓글 작성 테스트 작성
- OracleDB와 테스트 데이터 의존성이 있으므로 실행 전 `.env`와 테스트 계정 준비가 필요하다.

## 10. 작업 시 주의사항

- 기존 교수님 수업 구조인 `routes/bbs.js`, `views/bbs/*.ejs`를 유지한다.
- 전체 리팩토링은 하지 않는다.
- 한 번에 여러 기능을 섞어 수정하지 않는다.
- 위험한 변경 전에는 커밋 또는 백업을 권장한다.
- `.env` 내용은 문서나 로그에 출력하지 않는다.
- OracleDB 기반 구조를 유지한다.
