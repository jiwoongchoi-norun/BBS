# BBS 게시판 프로젝트

Node.js, Express, EJS, OracleDB로 구현한 게시판 과제 프로젝트이다.
교수님 PPT 요구사항을 기준으로 기본 게시판 흐름을 복구하고, 남은 필수 기능과 가산점 기능을 단계적으로 보완하는 것을 목표로 한다.

## 1. 프로젝트 개요

이 프로젝트는 `/bbs` 라우터를 중심으로 다음 기능을 제공한다.

- 회원가입
- 로그인 / 로그아웃
- 세션 기반 로그인 상태 유지
- 게시글 목록, 작성, 상세, 수정, 삭제
- 게시글 검색
- 회원정보 수정

현재 구현은 과제 제출을 위한 핵심 흐름을 우선 맞춘 상태이다.
실서비스 수준의 보안성보다 과제 요구사항 충족을 우선하지만, 보안 취약점은 별도 보완 과제로 관리한다.

## 2. 현재 구현 상태

### 구현 완료

- 게시글 목록
- 글쓰기
- 글읽기
- 글수정
- 글삭제
- 검색
- 로그인
- 로그아웃
- 회원가입
- 회원정보 수정
- 세션 처리
- Bootstrap 5 기반 반응형 UI
- `.env` 기반 DB 설정 분리
- `SESSION_SECRET` 환경변수 필수화
- 게시글 soft delete 방식 적용
- 비로그인 사용자의 글쓰기 / 수정 / 삭제 접근 제한
- 카드형 게시판, hover 효과, 일관된 버튼 스타일, 테이블 overflow 대응

### 미완료 또는 추가 보완 필요

- bcrypt 비밀번호 암호화 실제 적용
- SQL Injection 방지를 위한 bind variable 적용
- 조회수
- 페이징
- 댓글
- 파일 업로드
- 작성자 권한 체크
- 댓글 수정 / 삭제, 대댓글
- 입력값 검증 보강

## 3. 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| Runtime | Node.js |
| Web Framework | Express |
| Template Engine | EJS |
| Database | OracleDB |
| Session | express-session |
| Environment | dotenv |
| Logging | morgan |
| UI | Bootstrap 5, custom CSS |
| Prepared Dependencies | bcrypt, multer |

`bcrypt`, `multer`는 설치되어 있지만 현재 핵심 라우트에는 아직 본격 적용되지 않았다.

## 4. 프로젝트 구조

```text
BBS/
|- app.js
|- bin/
|  `- www
|- config/
|  `- dbconfig.js
|- docs/
|  |- requirements_summary.md
|  |- progress_report.md
|  `- dev_setup_report.md
|- public/
|  `- stylesheets/
|- routes/
|  |- bbs.js
|  |- index.js
|  `- users.js
|- scripts/
|  |- schema.sql
|  `- sample-data.sql
|- views/
|  `- bbs/
|     |- form.ejs
|     |- list.ejs
|     |- login.ejs
|     |- read.ejs
|     |- signup.ejs
|     |- updateform.ejs
|     |- updatesignform.ejs
|     `- partials/
|        |- head.ejs
|        `- nav.ejs
|- .env.example
|- .gitignore
|- package.json
`- README.md
```

## 5. 핵심 파일 설명

| 파일 | 역할 |
| --- | --- |
| `app.js` | Express 앱 초기화, EJS 설정, 세션 설정, 라우터 연결 |
| `bin/www` | 서버 실행 진입점 |
| `config/dbconfig.js` | OracleDB 환경변수 검증과 접속 설정 |
| `routes/bbs.js` | 게시판, 인증, 회원정보 수정 기능의 핵심 라우터 |
| `views/bbs/*.ejs` | 게시판과 인증 관련 화면 |
| `scripts/schema.sql` | 기본 테이블과 시퀀스 생성 |
| `scripts/sample-data.sql` | 테스트용 초기 데이터 삽입 |

## 6. 실행 방법

### 6.1 의존성 설치

```powershell
npm install
```

### 6.2 환경변수 설정

`.env.example`을 참고해 `.env`를 작성한다.

```env
PORT=3000
SESSION_SECRET=change-this-session-secret
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost/XEPDB1
```

필수값:

- `SESSION_SECRET`
- `DB_USER`
- `DB_PASSWORD`
- `DB_CONNECT_STRING`

`SESSION_SECRET`이 없으면 `app.js`에서 실행을 중단한다.
DB 관련 필수값이 없으면 `config/dbconfig.js`에서 실행을 중단한다.

### 6.3 OracleDB 스키마 생성

`scripts/schema.sql`을 실행하면 다음 객체가 생성된다.

- `LOGIN`
- `BBS`
- `BBS_SEQ`

그 다음 `scripts/sample-data.sql`을 실행하면 초기 테스트 데이터가 들어간다.

현재 샘플 데이터:

- 관리자 계정: `admin`
- 샘플 비밀번호: `1234`
- 샘플 게시글 1건

주의: 샘플 비밀번호는 과제용 초기 데이터이며, 아직 보안적으로 안전한 구현은 아니다.

### 6.4 서버 실행

```powershell
npm start
```

기본 접속 경로:

```text
http://localhost:3000/bbs/list
```

## 7. 애플리케이션 설정

### 7.1 뷰 엔진

`app.js`에서 EJS를 기본 뷰 엔진으로 사용한다.

### 7.2 세션

`express-session`을 사용한다.

- `secret`: `process.env.SESSION_SECRET`
- `resave: false`
- `saveUninitialized: false`

세션 secret은 코드에 직접 저장하지 않고 환경변수로 분리되어 있다.

### 7.3 정적 파일

`public/` 디렉터리를 정적 리소스 루트로 사용한다.

## 8. 주요 라우트

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/bbs/list` | 게시글 목록 |
| GET | `/bbs/read?brdno={no}` | 게시글 상세 |
| GET | `/bbs/form` | 글쓰기 화면 |
| POST | `/bbs/save` | 글 저장 |
| GET | `/bbs/update?brdno={no}` | 수정 화면 |
| POST | `/bbs/updatesave` | 수정 저장 |
| GET | `/bbs/delete?brdno={no}` | 게시글 soft delete |
| GET | `/bbs/search` | 게시글 검색 |
| GET | `/bbs/login` | 로그인 화면 |
| POST | `/bbs/logincheck` | 로그인 처리 |
| GET | `/bbs/logout` | 로그아웃 |
| GET | `/bbs/signup` | 회원가입 화면 |
| POST | `/bbs/signupsave` | 회원가입 처리 |
| GET | `/bbs/updatesignup` | 회원정보 수정 화면 |
| POST | `/bbs/updatesignsave` | 회원정보 수정 처리 |

## 9. 기능 동작 방식

### 9.1 게시글 목록

- `BBS.OK = 1`인 글만 조회한다.
- 최신 글이 먼저 보이도록 `ORDER BY NO DESC`를 사용한다.

### 9.2 글삭제

- 실제 `DELETE`를 실행하지 않는다.
- `OK = 0`으로 변경하는 soft delete 방식이다.
- 목록, 상세, 수정 화면에서는 `OK = 1`인 글만 다룬다.

### 9.3 검색

지원 검색 조건:

- 제목
- 내용
- 작성자
- 제목 + 내용

검색 결과는 활성 게시글 `OK = 1`만 반환한다.

### 9.4 로그인 / 세션

- 로그인 성공 시 `req.session.user`를 생성한다.
- 세션에는 현재 사용자 식별값 `id`와 `authorized`만 저장한다.
- 비밀번호는 세션에 저장하지 않는다.

### 9.5 접근 제한

`routes/bbs.js`의 `requireLogin()`으로 다음 기능을 보호한다.

- 글쓰기 화면
- 글 저장
- 글수정 화면
- 글수정 저장
- 글삭제
- 회원정보 수정 저장

## 10. DB 구조

### 10.1 LOGIN

| 컬럼 | 설명 |
| --- | --- |
| `ID` | 회원 ID, PK |
| `PASSWORD` | 비밀번호 |
| `NAME` | 이름 |
| `EMAIL` | 이메일 |
| `OK` | 회원 활성 상태 |

### 10.2 BBS

| 컬럼 | 설명 |
| --- | --- |
| `NO` | 게시글 번호, PK |
| `TITLE` | 제목 |
| `CONTENT` | 본문 |
| `WRITER` | 작성자 |
| `REGDATE` | 작성일 |
| `OK` | 게시글 활성 상태 |

### 10.3 BBS_SEQ

게시글 번호 증가용 시퀀스이다.

## 11. 화면 구성

| 화면 | 파일 |
| --- | --- |
| 목록 | `views/bbs/list.ejs` |
| 상세 | `views/bbs/read.ejs` |
| 작성 | `views/bbs/form.ejs` |
| 수정 | `views/bbs/updateform.ejs` |
| 로그인 | `views/bbs/login.ejs` |
| 회원가입 | `views/bbs/signup.ejs` |
| 회원정보 수정 | `views/bbs/updatesignform.ejs` |

공통 헤더와 내비게이션은 `partials/head.ejs`, `partials/nav.ejs`로 분리되어 있다.
현재 화면은 Bootstrap 5 기반으로 정리되어 있으며, 모바일 접속 시 내비게이션이 접힘 메뉴로 동작한다.
게시글 목록은 카드형 영역 안에 배치되어 있고, 테이블은 작은 화면에서 가로 스크롤로 overflow를 처리한다.
주요 버튼은 `btn-action` 클래스로 최소 너비와 모바일 전체 폭 표시를 맞췄다.

## 12. 요구사항 대응 현황

| 요구사항 | 상태 |
| --- | --- |
| 게시글 목록 | 완료 |
| 글쓰기 | 완료 |
| 글읽기 | 완료 |
| 글수정 | 완료 |
| 글삭제 | 완료 |
| 검색 | 완료 |
| 로그인 | 완료 |
| 로그아웃 | 완료 |
| 회원가입 | 완료 |
| 회원정보 수정 | 완료 |
| 세션 처리 | 완료 |
| 비밀번호 암호화 | 미완료 |
| 조회수 | 미완료 |
| 페이징 | 미완료 |
| 댓글 | 미완료 |
| 파일 업로드 | 미완료 |
| Bootstrap UI 개선 | 완료 |

## 13. 현재 기술 부채

- 비밀번호가 평문 저장 및 평문 비교 구조이다.
- SQL 문자열 직접 결합이 남아 있어 SQL Injection 위험이 있다.
- 글 수정 / 삭제에 작성자 권한 체크가 없다.
- 삭제 요청이 `GET /bbs/delete`로 처리된다.
- 댓글, 파일 업로드, 조회수, 페이징용 DB 구조가 아직 없다.
- 자동 테스트 코드가 없다.

## 14. 우선순위

1. bcrypt 실제 적용
2. 로그인 / 회원가입 / 회원정보 수정 SQL bind variable 적용
3. 게시판 CRUD SQL bind variable 적용
4. 조회수
5. 페이징
6. 댓글
7. 파일 업로드
8. 작성자 권한 체크
9. 입력값 검증 보강

## 15. 문서 구분

- `README.md`: 프로젝트 전체 이해를 위한 운영 및 구조 설명
- `docs/requirements_summary.md`: 교수님 요구사항 요약
- `docs/progress_report.md`: 제출용 진행 보고서
- `notion.md`: 현재 상태와 다음 작업을 빠르게 보기 위한 메모
