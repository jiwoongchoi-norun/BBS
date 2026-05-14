# Architecture

## 현재 구조

프로젝트는 하나의 Express 애플리케이션에서 EJS 화면 렌더링과 OracleDB 접근을 처리하는 과제형 구조다. 별도 service/repository 계층은 두지 않고, 게시판과 회원 기능 대부분은 `routes/bbs.js`에 모여 있다.

```text
browser
  -> Express app.js
    -> routes/bbs.js
      -> OracleDB
      -> uploads/bbs
    -> views/bbs/*.ejs
    -> public/stylesheets/style.css
```

## 주요 구성

| 영역               | 파일                                           | 설명                                        |
| ------------------ | ---------------------------------------------- | ------------------------------------------- |
| 앱 초기화          | `app.js`                                       | Express, EJS, static, session, router 연결  |
| 서버 진입점        | `bin/www`                                      | HTTP 서버 실행                              |
| DB 설정            | `config/dbconfig.js`                           | `.env` 기반 OracleDB 접속 설정              |
| 게시판/회원 라우트 | `routes/bbs.js`                                | CRUD, 검색, 인증, 회원정보, 댓글, 파일 처리 |
| 화면               | `views/bbs/*.ejs`                              | 게시판 및 회원 화면                         |
| 공통 화면          | `views/bbs/partials/*.ejs`                     | head, navigation                            |
| 스타일             | `public/stylesheets/style.css`                 | Bootstrap 보완 CSS                          |
| 업로드 저장소      | `uploads/bbs`                                  | 첨부파일 저장 경로                          |
| DB 스크립트        | `scripts/*.sql`                                | 신규/기존 DB 생성 및 보강                   |
| 개발 설정          | `.vscode/*`, `eslint.config.js`, `.prettierrc` | IDE, lint, format                           |

## 라우트 구조

| 메서드 | 경로                  | 기능                              | 상태                     |
| ------ | --------------------- | --------------------------------- | ------------------------ |
| GET    | `/bbs`                | 목록으로 redirect                 | 구현                     |
| GET    | `/bbs/list`           | 게시글 목록, 페이징               | 구현                     |
| GET    | `/bbs/search`         | 게시글 검색, 페이징               | 구현                     |
| GET    | `/bbs/read`           | 상세, 조회수 증가, 댓글/파일 표시 | 구현                     |
| GET    | `/bbs/form`           | 글쓰기 화면                       | 구현, 로그인 필요        |
| POST   | `/bbs/save`           | 글 저장, 파일 업로드              | 구현, 로그인 필요        |
| GET    | `/bbs/update`         | 글수정 화면                       | 구현, 로그인/작성자 필요 |
| POST   | `/bbs/updatesave`     | 글수정 저장                       | 구현, 로그인/작성자 필요 |
| GET    | `/bbs/delete`         | 글 soft delete                    | 구현, 로그인/작성자 필요 |
| GET    | `/bbs/login`          | 로그인 화면                       | 구현                     |
| POST   | `/bbs/logincheck`     | 로그인 처리                       | 구현                     |
| GET    | `/bbs/logout`         | 로그아웃                          | 구현                     |
| GET    | `/bbs/signup`         | 회원가입 화면                     | 구현                     |
| POST   | `/bbs/signupsave`     | 회원가입 저장                     | 구현                     |
| GET    | `/bbs/updatesignup`   | 회원정보 수정 화면                | 구현, 로그인 필요        |
| POST   | `/bbs/updatesignsave` | 회원정보 수정 저장                | 구현, 로그인 필요        |
| POST   | `/bbs/wsave`          | 댓글 작성                         | 구현, 로그인 필요        |
| POST   | `/bbs/wreply`         | 대댓글 작성                       | 구현, 로그인 필요        |
| GET    | `/bbs/wdelete`        | 댓글 soft delete                  | 구현, 로그인/작성자 필요 |
| GET    | `/bbs/download`       | 첨부파일 다운로드                 | 구현                     |

## DB 구조

### LOGIN

- `ID`: 회원 ID, PK
- `PASSWORD`: SHA-512 + salt 해시값
- `SALT`: 비밀번호 salt
- `NAME`: 이름
- `EMAIL`: 이메일
- `OK`: 계정 활성 상태

### BBS

- `NO`: 게시글 번호, PK
- `TITLE`: 제목
- `CONTENT`: 본문
- `WRITER`: 작성자
- `REGDATE`: 작성일
- `VIEW_COUNT`: 조회수
- `OK`: 게시글 활성 상태

삭제는 `OK = 0`으로 처리하는 soft delete 방식이다.

### BBSW

- `NO`: 댓글 번호, PK
- `BBSNO`: 게시글 번호
- `PARENT_NO`: 부모 댓글 번호
- `WRITER`: 작성자
- `CONTENT`: 내용
- `DEPTH`: 댓글 깊이
- `CHILD_COUNT`: 자식 댓글 수
- `LIKE_COUNT`: 좋아요 수
- `DISLIKE_COUNT`: 싫어요 수
- `REGDATE`: 작성일
- `UPDATEDATE`: 수정일
- `OK`: 댓글 활성 상태

### BBS_FILE

- `NO`: 파일 번호, PK
- `BBSNO`: 게시글 번호
- `ORG_FILENAME`: 원본 파일명
- `SAVE_FILENAME`: 서버 저장 파일명
- `FILEPATH`: 상대 파일 경로
- `FILESIZE`: 파일 크기
- `MIMETYPE`: MIME 타입
- `REGDATE`: 업로드일
- `OK`: 파일 활성 상태

## 현재 구조상 주의점

- `routes/bbs.js`에 기능이 집중되어 있어 큰 리팩토링보다 과제 완성을 우선한다.
- OracleDB connection release 누락 여부는 기능 추가 때마다 확인해야 한다.
- 업로드 파일의 물리 삭제 정책은 아직 정하지 않았다.
- 댓글 좋아요/싫어요 컬럼은 있으나 실제 처리 라우트는 없다.
- bcrypt 패키지는 설치되어 있으나 현재 비밀번호 로직은 SHA-512 + salt 방식이다.
