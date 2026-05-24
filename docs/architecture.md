# BBS 서버 아키텍처

최종 업데이트: 2026-05-25

## 전체 구조

```text
Browser
  -> Express app.js
    -> /bbs routes/bbs.js
      -> routes/bbs/*.routes.js
      -> db/repositories/*.js
      -> OracleDB
      -> uploads/bbs
    -> views/bbs/*.ejs
    -> public/stylesheets/style.css
```

이 프로젝트는 과제 제출과 시연을 우선한 Express 라우터 구조이다. 5단계에서 `/bbs` 기능을 회원, 게시글 조회, 게시글 변경, 파일, 댓글, 반응 라우터로 분리했다. `routes/bbs.js`는 공통 CSRF 처리와 feature router 조립을 담당하고, 게시글/댓글/반응 SQL은 `db/repositories/*.js`로 분리되어 있다.

## 주요 파일

| 파일                           | 역할                                                                |
| ------------------------------ | ------------------------------------------------------------------- |
| `app.js`                       | Express 설정, EJS, static, session, router 연결, 전역 error handler |
| `bin/www`                      | HTTP 서버 시작                                                      |
| `config/dbconfig.js`           | `.env` 기반 OracleDB 접속 설정                                      |
| `routes/bbs.js`                | `/bbs` 공통 CSRF 처리, feature router mount, CSRF 오류 처리         |
| `routes/bbs/*.routes.js`       | 회원, 게시글 조회/변경, 파일, 댓글, 반응 기능별 라우터              |
| `db/repositories/*.js`         | 게시글, 댓글, 반응 SQL 실행 함수                                    |
| `routes/helpers/*.js`          | 응답, 업로드, 입력값 검증 helper                                    |
| `routes/middleware/auth.js`    | 로그인 필요 middleware                                              |
| `views/bbs/*.ejs`              | 화면 템플릿                                                         |
| `views/bbs/partials/*.ejs`     | 공통 head, nav, flash, footer                                       |
| `public/stylesheets/style.css` | Bootstrap 보완용 커스텀 스타일                                      |
| `scripts/*.sql`                | DB 생성, 마이그레이션, 롤백 참고 스크립트                           |
| `uploads/bbs`                  | 업로드된 첨부파일 저장 경로                                         |

## 런타임 설정

- 환경 변수는 `.env`에서 읽는다.
- `SESSION_SECRET`이 없으면 앱이 시작되지 않는다.
- DB 접속에는 `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING`이 필요하다.
- production 모드에서는 세션 cookie `secure` 옵션이 켜진다.

## 주요 라우트

| Method   | Path                          | 기능                                   |
| -------- | ----------------------------- | -------------------------------------- |
| GET      | `/bbs`                        | 목록으로 이동                          |
| GET      | `/bbs/list`                   | 게시글 목록, 페이징, 정렬, 내 글 보기  |
| GET      | `/bbs/search`                 | 검색 결과, 페이징, 정렬                |
| GET      | `/bbs/read`                   | 상세, 조회수, 댓글, 파일, 추천 상태    |
| GET      | `/bbs/form`                   | 글쓰기 화면                            |
| POST     | `/bbs/save`                   | 글 저장, 파일 업로드                   |
| GET      | `/bbs/update`                 | 글수정 화면                            |
| POST     | `/bbs/updatesave`             | 글수정 저장                            |
| GET      | `/bbs/delete`                 | 삭제 안내 후 상세/목록으로 이동        |
| POST     | `/bbs/delete`                 | 글 soft delete                         |
| GET      | `/bbs/login`                  | 로그인 화면                            |
| POST     | `/bbs/logincheck`             | 로그인 처리, legacy password migration |
| GET      | `/bbs/logout`                 | 로그아웃                               |
| GET/POST | `/bbs/find-id`                | ID 찾기                                |
| GET      | `/bbs/reset-password`         | 비밀번호 재설정 요청 화면              |
| POST     | `/bbs/reset-password/request` | reset token 생성                       |
| GET/POST | `/bbs/reset-password/confirm` | reset token 검증 및 새 비밀번호 저장   |
| GET      | `/bbs/signup`                 | 회원가입 화면                          |
| GET      | `/bbs/check-id`               | ID 중복 확인                           |
| POST     | `/bbs/signupsave`             | 회원가입 저장                          |
| GET      | `/bbs/myinfo`                 | 내 정보                                |
| GET      | `/bbs/updatesignup`           | 회원정보 수정 화면                     |
| POST     | `/bbs/updatesignsave`         | 회원정보 수정 저장                     |
| POST     | `/bbs/withdraw`               | 회원 탈퇴 soft deactivate              |
| POST     | `/bbs/reaction`               | 좋아요/싫어요 토글                     |
| POST     | `/bbs/wsave`                  | 댓글 작성                              |
| POST     | `/bbs/wreply`                 | 대댓글 작성                            |
| POST     | `/bbs/wupdate`                | 댓글 수정                              |
| POST     | `/bbs/wdelete`                | 댓글 soft delete                       |
| GET      | `/bbs/download`               | 첨부파일 다운로드                      |

## 인증과 세션 흐름

1. 로그인 성공 시 `req.session.user`에 사용자 ID, 이름, 이메일 등 화면에 필요한 최소 정보 저장
2. 로그인 필요 기능은 `requireLogin()`으로 보호
3. 회원 탈퇴 계정은 `LOGIN.OK = 0`으로 비활성화하고 로그인/내 정보 조회에서 제외
4. 로그아웃 시 세션 제거 후 목록으로 이동

## 비밀번호 흐름

1. 신규 회원가입과 회원정보 수정은 bcrypt로 비밀번호 저장
2. 기존 SHA-512 + salt 계정은 로그인 성공 시 bcrypt로 자동 전환
3. 비밀번호 재설정은 과제 시연용 reset token을 화면에 표시하며 실제 이메일 발송은 하지 않음
4. reset token은 1시간 유효, 사용 후 `USED = 1`로 변경

## 게시글 상세 흐름

1. `brdno` 숫자 검증
2. 추천 처리 후 되돌아온 요청이 아니면 `VIEW_COUNT + 1`
3. 게시글, 댓글, 첨부파일, 로그인 사용자의 추천 상태 조회
4. `views/bbs/read.ejs` 렌더링

## 파일 저장 정책

- 업로드 파일은 `uploads/bbs` 아래에 서버 생성 파일명으로 저장한다.
- `BBS_FILE`은 원본 파일명, 저장 파일명, 상대 경로, 크기, MIME type, 활성 상태를 기록한다.
- 1개 파일, 10MB까지 허용한다.
- 확장자와 MIME type allowlist를 모두 확인한다.
- 다운로드 시 DB 경로와 실제 해석 경로가 `uploads/bbs` 내부인지 확인한다.
- 게시글 삭제 시 DB는 soft delete를 유지하고, 첨부파일 row를 비활성화한 뒤 물리 파일 삭제를 best-effort로 시도한다.

## 보안 설계 요약

- SQL Injection 완화: bind variable, 숫자 파라미터 검증, 검색/정렬 whitelist
- XSS 완화: 사용자 입력은 EJS `<%= %>` escaped output 사용
- CSRF 완화: `/bbs` POST form에 session 기반 CSRF token 적용
- 권한 확인: 게시글/댓글 수정 삭제, 다운로드에서 작성자 검증
- 세션 보안: hardcoded secret 제거, `httpOnly`, `sameSite=lax`, production secure cookie
- 오류 메시지: production에서는 일반화된 오류 메시지 표시

## 구조상 주의점

- 라우트가 기능별 파일로 분리되었지만 URL은 기존 `/bbs/...` 경로를 유지하므로, 변경 시 기존 경로 동작을 함께 확인한다.
- `oracledb.autoCommit = true` 기반 코드가 있어 여러 SQL을 하나의 업무 단위로 묶는 transaction 안정성은 추가 개선 후보이다.
- 삭제는 게시글/댓글/회원 대부분 soft delete를 사용한다.
- 첨부파일은 DB 메타데이터와 실제 파일이 함께 관리되므로 삭제/롤백 작업 시 양쪽 상태를 함께 확인해야 한다.
