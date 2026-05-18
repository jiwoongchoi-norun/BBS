# Code Review Guide

이 문서는 지금까지 구현한 BBS 프로젝트를 공부할 때 어떤 파일을 어떤 순서로 보면 좋은지 정리한 가이드입니다.

## 1. 전체 진입점

### `app.js`

먼저 Express 앱이 어떻게 만들어지는지 봅니다.

- EJS view engine 설정
- static 파일 경로
- cookie parser
- session 설정
- `/bbs` router 연결
- 404/error handler

여기까지 보면 브라우저 요청이 `routes/bbs.js`로 들어가는 구조가 잡힙니다.

### `bin/www`

실제 HTTP 서버가 켜지는 파일입니다.

- `PORT` 결정
- `app`을 HTTP server에 연결
- listen/error 이벤트 처리

## 2. DB 연결

### `config/dbconfig.js`

OracleDB 접속 정보가 `.env`에서 들어옵니다.

- `DB_USER`
- `DB_PASSWORD`
- `DB_CONNECT_STRING`

실제 계정 정보는 문서나 git에 올리지 않습니다.

## 3. 라우터 공통 helper

### `routes/bbs.js` 상단

먼저 helper 함수부터 봅니다.

- `requireLogin()`: 로그인 필요 기능 공통 가드
- `cleanText()`: 문자열 입력 정리
- `toValidNumber()`: 숫자 파라미터 검증
- `createPasswordHash()`: legacy SHA-512 검증
- `isBcryptPassword()`: bcrypt 계정 판별
- `createBcryptPassword()`: bcrypt hash 생성
- `createSkipViewCountToken()`: 추천 후 조회수 증가 방지 토큰 생성
- `shouldSkipViewCount()`: read 화면 조회수 증가 여부 판단

이 helper들을 이해하면 아래 라우터들이 훨씬 쉽게 보입니다.

## 4. 로그인과 회원

읽을 순서:

1. `GET /bbs/login`
2. `POST /bbs/logincheck`
3. `GET/POST /bbs/find-id`
4. `GET /bbs/logout`
5. `GET /bbs/signup`
6. `POST /bbs/signupsave`
7. `GET /bbs/updatesignup`
8. `POST /bbs/updatesignsave`
9. `POST /bbs/withdraw`

핵심 포인트:

- 로그인 성공 시 `req.session.user` 저장
- `LOGIN.OK = 1`인 활성 계정만 로그인 허용
- 아이디 찾기는 이름과 이메일이 일치하는 활성 계정만 조회
- 회원 탈퇴는 비밀번호 확인 후 `LOGIN.OK = 0`으로 비활성화
- bcrypt 계정은 `bcrypt.compare`
- legacy SHA-512 계정은 성공 시 bcrypt로 재저장
- 신규 가입과 회원정보 수정은 bcrypt만 저장

## 5. 게시글 기본 기능

읽을 순서:

1. `GET /bbs/list`
2. `GET /bbs/search`
3. `GET /bbs/form`
4. `POST /bbs/save`
5. `GET /bbs/read`
6. `GET /bbs/update`
7. `POST /bbs/updatesave`
8. `GET /bbs/delete`

핵심 포인트:

- 목록/검색은 페이징을 사용합니다.
- 로그인 사용자는 `mine=1`로 본인 작성글만 볼 수 있습니다.
- 목록 제목 옆에는 활성 댓글/대댓글 수가 표시됩니다.
- 글 작성은 로그인 필요입니다.
- 글 수정/삭제는 작성자만 가능합니다.
- 삭제는 `OK = 0` soft delete입니다.
- read 화면은 게시글, 댓글, 첨부파일, 내 추천 상태를 함께 조회합니다.

## 6. 조회수와 추천

읽을 순서:

1. `GET /bbs/read`
2. `POST /bbs/reaction`
3. `redirectReadWithoutViewCount()`
4. `shouldSkipViewCount()`

핵심 포인트:

- 일반 read 요청은 `VIEW_COUNT`를 증가시킵니다.
- 좋아요/싫어요 처리 후 read 화면으로 돌아가는 요청은 조회수를 증가시키지 않습니다.
- 추천 기록은 `BBS_REACTION`에 저장합니다.
- 카운터는 `BBS.LIKE_COUNT`, `BBS.DISLIKE_COUNT`에 저장합니다.

## 7. 댓글과 대댓글

읽을 순서:

1. `POST /bbs/wsave`
2. `POST /bbs/wreply`
3. `POST /bbs/wupdate`
4. `POST /bbs/wdelete`
5. `views/bbs/read.ejs` 댓글 출력 부분

핵심 포인트:

- 댓글과 대댓글은 모두 `BBSW` 테이블에 저장합니다.
- 대댓글은 `PARENT_NO`와 `DEPTH`로 구분합니다.
- 댓글 수정/삭제는 작성자 본인만 가능합니다.

## 8. 파일 업로드와 다운로드

읽을 순서:

1. multer 설정
2. `POST /bbs/save`
3. `GET /bbs/download`
4. `views/bbs/read.ejs` 첨부파일 출력 부분

핵심 포인트:

- 실제 파일은 `uploads/bbs`에 저장합니다.
- DB에는 파일 메타데이터만 저장합니다.
- 다운로드 시 DB의 원본 파일명을 사용합니다.

## 9. 화면 템플릿

추천 순서:

1. `views/bbs/partials/head.ejs`
2. `views/bbs/partials/nav.ejs`
3. `views/bbs/partials/footer.ejs`
4. `views/bbs/list.ejs`
5. `views/bbs/read.ejs`
6. `views/bbs/form.ejs`
7. `views/bbs/update.ejs`
8. 로그인/회원가입/아이디 찾기 관련 EJS

## 10. DB 스크립트

추천 순서:

1. `scripts/schema.sql`
2. `scripts/migration.sql`
3. `scripts/rollback.sql`
4. `docs/schema_summary.md`

## 리뷰 체크리스트

- 라우터마다 로그인 필요 여부가 맞는가?
- 사용자 입력이 bind variable로 들어가는가?
- 숫자 파라미터가 검증되는가?
- DB connection이 release되는가?
- 게시글/댓글 권한 체크가 있는가?
- 좋아요/싫어요가 중복 추천을 막는가?
- 추천 후 조회수가 증가하지 않는가?
- 파일 다운로드가 임의 경로 접근을 허용하지 않는가?
