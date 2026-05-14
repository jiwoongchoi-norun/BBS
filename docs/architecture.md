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

## 현재 구조 문제점

- `routes/bbs.js`에 인증, 회원, 게시판 기능이 모두 섞여 있다.
- DB 연결, SQL 실행, connection release 코드가 반복된다.
- SQL이 문자열 결합 방식이라 보안 위험과 유지보수 문제가 있다.
- 작성자 권한 체크가 없다.
- 댓글, 파일 업로드, 페이징을 넣기 위한 확장 구조가 아직 없다.
- 사용하지 않는 Jade 기본 템플릿이 남아 있다.

## 권장 구조 개선

단기적으로는 과제 흐름을 유지하기 위해 대규모 분리는 하지 않는다. 우선순위는 다음과 같다.

1. SQL bind variable 적용
2. bcrypt 적용
3. 공통 DB 실행 helper 추가
4. 작성자 권한 체크 helper 추가
5. 댓글/파일 업로드를 위한 테이블과 라우트 추가
6. 제출 전 미사용 Jade 파일 정리 여부 결정
