# Architecture

## 현재 프로젝트 상태 분석

이 프로젝트는 Express 애플리케이션 하나 안에서 EJS 화면 렌더링과 OracleDB 접근을 직접 처리하는 구조이다. 별도 service, repository, middleware 디렉토리는 없고, 대부분의 기능이 `routes/bbs.js`에 집중되어 있다.

## 런타임 구조

```text
browser
  -> Express app.js
    -> routes/bbs.js
      -> OracleDB
    -> views/bbs/*.ejs
    -> public/stylesheets/style.css
```

## 주요 구성

| 영역               | 파일                                           | 설명                                       |
| ------------------ | ---------------------------------------------- | ------------------------------------------ |
| 앱 초기화          | `app.js`                                       | Express, EJS, static, session, router 연결 |
| 서버 진입점        | `bin/www`                                      | HTTP 서버 실행                             |
| DB 설정            | `config/dbconfig.js`                           | `.env` 기반 OracleDB 접속 설정             |
| 게시판/회원 라우트 | `routes/bbs.js`                                | CRUD, 검색, 인증, 회원정보 수정            |
| 기본 라우트        | `routes/index.js`, `routes/users.js`           | Express 기본 라우트                        |
| 화면               | `views/bbs/*.ejs`                              | 게시판/회원 화면                           |
| 공통 화면          | `views/bbs/partials/*.ejs`                     | head, navigation                           |
| 스타일             | `public/stylesheets/style.css`                 | Bootstrap 보완 스타일                      |
| DB 스크립트        | `scripts/*.sql`                                | 테이블/샘플/조회수 컬럼 추가               |
| 개발 설정          | `.vscode/*`, `eslint.config.js`, `.prettierrc` | IDE, lint, format                          |

## 라우트 구조

| 메서드 | 경로                  | 기능                     | 상태              |
| ------ | --------------------- | ------------------------ | ----------------- |
| GET    | `/bbs`                | 목록으로 redirect        | 구현              |
| GET    | `/bbs/list`           | 게시글 목록              | 구현              |
| GET    | `/bbs/search`         | 게시글 검색              | 구현              |
| GET    | `/bbs/read`           | 게시글 상세, 조회수 증가 | 구현              |
| GET    | `/bbs/form`           | 글쓰기 화면              | 구현, 로그인 필요 |
| POST   | `/bbs/save`           | 글 저장                  | 구현, 로그인 필요 |
| GET    | `/bbs/update`         | 글수정 화면              | 구현, 로그인 필요 |
| POST   | `/bbs/updatesave`     | 글수정 저장              | 구현, 로그인 필요 |
| GET    | `/bbs/delete`         | 글 soft delete           | 구현, 로그인 필요 |
| GET    | `/bbs/login`          | 로그인 화면              | 구현              |
| POST   | `/bbs/logincheck`     | 로그인 처리              | 구현              |
| GET    | `/bbs/logout`         | 로그아웃                 | 구현              |
| GET    | `/bbs/signup`         | 회원가입 화면            | 구현              |
| POST   | `/bbs/signupsave`     | 회원가입 저장            | 구현              |
| GET    | `/bbs/updatesignup`   | 회원정보 수정 화면       | 구현, 로그인 필요 |
| POST   | `/bbs/updatesignsave` | 회원정보 수정 저장       | 구현, 로그인 필요 |

## DB 구조

### LOGIN

- `ID`
- `PASSWORD`
- `NAME`
- `EMAIL`
- `OK`

현재 `PASSWORD`는 평문 저장 구조이다.

### BBS

- `NO`
- `TITLE`
- `CONTENT`
- `WRITER`
- `REGDATE`
- `VIEW_COUNT`
- `OK`

삭제는 `OK = 0`으로 처리하는 soft delete 방식이다.

## 교수님 최종본 구조 비교

분석 기준일: 2026-05-14

| 영역          | 현재 프로젝트                                  | 교수님 최종본                               | 차이점                                   |
| ------------- | ---------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| 앱 진입       | `app.js`에서 `/`, `/users`, `/bbs` 라우터 연결 | `/bbs`만 연결                               | 현재 프로젝트가 Express 기본 구조 유지   |
| DB 설정       | `config/dbconfig.js`, `.env`                   | `routes/bbs.js` 내부 하드코딩               | 현재 프로젝트가 제출/보안 관리에 유리    |
| 세션          | 환경변수 secret, 저장 최소화                   | 하드코딩 secret, saveUninitialized true     | 현재 프로젝트가 더 안전                  |
| 게시판 라우트 | CRUD, 검색, 조회수, 인증/회원                  | CRUD, 검색, 페이징, 댓글, 조회수, 인증/회원 | 교수님 최종본 기능 일부 더 많음          |
| 조회수        | `VIEW_COUNT`, 상세 조회 시 증가                | `COUNT`, `/bbs/read_count` 경유             | 컬럼명/흐름 통일 필요                    |
| 페이징        | 없음                                           | `OFFSET ... FETCH NEXT`, `currentPage`      | 추가 필요                                |
| 댓글          | 없음                                           | `BBSW`, `/bbs/wsave`, 상세 목록             | 추가 필요                                |
| 파일 업로드   | multer 설치만 있음                             | 파일 input만 있음                           | 둘 다 서버 처리 없음                     |
| 뷰 구조       | Bootstrap partial 사용                         | 각 EJS 독립 HTML                            | 현재 프로젝트 UI 구조가 더 유지보수 쉬움 |

## 교수님 최종본 DB 구조

교수님 최종본의 `CREATE TABLE BBS.txt` 기준 주요 구조이다.

| 객체       | 포함 내용                                                    | 현재 프로젝트 반영 상태        |
| ---------- | ------------------------------------------------------------ | ------------------------------ |
| `LOGIN`    | `ID`, `PASSWORD`, `NAME`, `EMAIL`, `OK`, `SALT`              | `SALT` 누락                    |
| `BBS`      | `NO`, `TITLE`, `WRITER`, `CONTENT`, `REGDATE`, `OK`, `COUNT` | `COUNT` 대신 `VIEW_COUNT` 사용 |
| `BBSW`     | 댓글 번호, 게시글 번호, 작성자, 내용, 작성일, `WCOUNT`, `OK` | 미구현                         |
| `BBS_SEQ`  | 게시글 sequence                                              | 구현                           |
| `BBSW_SEQ` | 댓글 sequence                                                | 미구현                         |

제출용 SQL은 현재 프로젝트의 `VIEW_COUNT` 정책을 유지할지, 교수님 최종본의 `COUNT` 명칭으로 맞출지 먼저 결정해야 한다. 코드 변경 범위를 줄이려면 `VIEW_COUNT`를 유지하고 문서/SQL을 현재 코드 기준으로 통일하는 편이 안전하다.

## 현재 구조 문제점

- `routes/bbs.js`에 인증, 회원, 게시판 기능이 모두 섞여 있다.
- DB 연결, SQL 실행, connection release 코드가 반복된다.
- SQL이 문자열 결합 방식이라 보안 위험과 유지보수 문제가 있다.
- 작성자 권한 체크가 없다.
- 댓글, 파일 업로드, 페이징을 넣기 위한 확장 구조가 아직 없다.
- 사용하지 않는 Jade 기본 템플릿이 남아 있다.
- 교수님 최종본의 `BBSW` 댓글 구조와 현재 스키마가 맞지 않는다.
- 현재 회원가입/로그인/회원정보 수정의 비밀번호 저장 방식이 서로 일관되지 않다.

## 권장 구조 개선

단기적으로는 과제 흐름을 유지하기 위해 대규모 분리는 하지 않는다. 우선순위는 다음과 같다.

1. SQL bind variable 적용
2. bcrypt 적용
3. 공통 DB 실행 helper 추가
4. 작성자 권한 체크 helper 추가
5. 댓글/파일 업로드를 위한 테이블과 라우트 추가
6. 제출 전 미사용 Jade 파일 정리 여부 결정
