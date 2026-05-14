# Architecture

## 전체 구조

```text
Browser
  -> app.js
    -> routes/bbs.js
      -> OracleDB
      -> uploads/bbs
    -> views/bbs/*.ejs
    -> public/stylesheets/style.css
```

이 프로젝트는 과제 완성도를 우선한 단일 Express 라우터 구조입니다. 별도 service/repository 계층을 두지 않고 `routes/bbs.js`에서 라우팅, 입력 검증, DB 접근, 화면 렌더링을 함께 처리합니다.

## 주요 파일

| 파일                           | 역할                                               |
| ------------------------------ | -------------------------------------------------- |
| `app.js`                       | Express 앱 설정, EJS, static, session, router 연결 |
| `bin/www`                      | HTTP 서버 실행                                     |
| `config/dbconfig.js`           | `.env` 기반 OracleDB 접속 설정                     |
| `routes/bbs.js`                | 게시판, 회원, 댓글, 추천, 파일 라우터              |
| `views/bbs/*.ejs`              | 화면 템플릿                                        |
| `views/bbs/partials/*.ejs`     | 공통 head/nav                                      |
| `public/stylesheets/style.css` | 화면 스타일                                        |
| `scripts/*.sql`                | DB 생성/마이그레이션/롤백 스크립트                 |
| `uploads/bbs`                  | 업로드 파일 저장 경로                              |

## 라우터 흐름

| Method | Path                  | 기능                                       |
| ------ | --------------------- | ------------------------------------------ |
| GET    | `/bbs`                | 목록으로 이동                              |
| GET    | `/bbs/list`           | 게시글 목록과 페이징                       |
| GET    | `/bbs/search`         | 검색 결과와 페이징                         |
| GET    | `/bbs/read`           | 게시글 상세, 조회수, 댓글, 파일, 추천 상태 |
| GET    | `/bbs/form`           | 글쓰기 화면                                |
| POST   | `/bbs/save`           | 글 저장, 파일 업로드                       |
| GET    | `/bbs/update`         | 글수정 화면                                |
| POST   | `/bbs/updatesave`     | 글수정 저장                                |
| GET    | `/bbs/delete`         | 글 soft delete                             |
| GET    | `/bbs/login`          | 로그인 화면                                |
| POST   | `/bbs/logincheck`     | 로그인 처리, bcrypt 전환                   |
| GET    | `/bbs/logout`         | 로그아웃                                   |
| GET    | `/bbs/signup`         | 회원가입 화면                              |
| POST   | `/bbs/signupsave`     | 회원가입 저장                              |
| GET    | `/bbs/updatesignup`   | 회원정보 수정 화면                         |
| POST   | `/bbs/updatesignsave` | 회원정보 수정 저장                         |
| POST   | `/bbs/reaction`       | 좋아요/싫어요 처리                         |
| POST   | `/bbs/wsave`          | 댓글 작성                                  |
| POST   | `/bbs/wreply`         | 대댓글 작성                                |
| GET    | `/bbs/wdelete`        | 댓글 soft delete                           |
| GET    | `/bbs/download`       | 첨부파일 다운로드                          |

## 핵심 처리 흐름

### 로그인

1. `POST /bbs/logincheck`
2. `LOGIN`에서 사용자 조회
3. `PASSWORD_ALGO` 또는 bcrypt prefix로 bcrypt 여부 판단
4. bcrypt 계정이면 `bcrypt.compare`
5. legacy SHA-512 계정이면 `PASSWORD + SALT` 검증
6. legacy 로그인 성공 시 bcrypt로 재저장
7. `req.session.user` 저장

### 게시글 읽기와 조회수

1. `GET /bbs/read?brdno=...`
2. 유효한 게시글 번호인지 검증
3. 추천 내부 이동이 아니면 `VIEW_COUNT + 1`
4. 게시글 본문 조회
5. 댓글 조회
6. 첨부파일 조회
7. 로그인 사용자라면 내 추천 상태 조회
8. `views/bbs/read.ejs` 렌더링

### 좋아요/싫어요

1. `POST /bbs/reaction`
2. 로그인 사용자만 허용
3. 게시글 번호와 반응 타입 검증
4. 기존 반응 조회
5. 기존 반응이 없으면 insert 및 카운터 증가
6. 같은 반응이면 delete 및 카운터 감소
7. 반대 반응이면 update 및 카운터 전환
8. read 화면으로 리다이렉트하되 조회수는 증가시키지 않음

## DB 개요

| 테이블         | 역할                      |
| -------------- | ------------------------- |
| `LOGIN`        | 회원과 비밀번호 해시      |
| `BBS`          | 게시글                    |
| `BBSW`         | 댓글과 대댓글             |
| `BBS_REACTION` | 게시글 좋아요/싫어요 기록 |
| `BBS_FILE`     | 첨부파일 메타데이터       |

## 구조상 주의점

- `routes/bbs.js`에 기능이 집중되어 있으므로 코드 리뷰 시 라우터 단위로 끊어서 보는 것이 좋습니다.
- `oracledb.autoCommit = true`라 여러 SQL을 한 트랜잭션으로 묶는 구조는 아닙니다.
- 게시글/댓글 삭제는 DB soft delete입니다.
- 업로드 파일은 DB 메타데이터와 실제 파일이 분리되어 있습니다.
