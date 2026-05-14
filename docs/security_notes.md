# Security Notes

## 현재 프로젝트 상태 분석

현재 프로젝트는 과제 시연을 위한 기본 기능이 우선 구현된 상태이다. 환경변수 분리와 세션 secret 필수화는 적용되어 있지만, 인증/SQL/권한 처리에는 개선이 필요하다.

## 적용된 보안 사항

- DB 접속 정보는 `.env`에서 읽는다.
- `.env`는 `.gitignore`에 포함되어 있다.
- `.env.example`만 저장소에 남긴다.
- `SESSION_SECRET`은 코드에 하드코딩하지 않는다.
- `SESSION_SECRET`이 없으면 앱 실행을 중단한다.
- `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING`이 없으면 DB 설정 로드 시 오류를 발생시킨다.
- 로그인 필요 기능에 `requireLogin()`이 적용되어 있다.
- 세션에는 비밀번호를 저장하지 않는다.
- 게시글 삭제는 실제 삭제가 아니라 `OK = 0` soft delete로 처리한다.
- gitleaks와 Semgrep 실행용 npm script가 준비되어 있다.

## SQL Injection 위험 코드 체크

`routes/bbs.js`의 주요 SQL은 문자열 결합 방식이다. 다음 라우트는 bind variable 전환이 필요하다.

| 라우트                     | 위험 입력                                   |
| -------------------------- | ------------------------------------------- |
| `POST /bbs/logincheck`     | `id`, `password`                            |
| `POST /bbs/signupsave`     | `id`, `pw1`, `name`, `email`                |
| `GET /bbs/updatesignup`    | `req.session.user.id`                       |
| `POST /bbs/updatesignsave` | `id`, `pw1`, `name`, `email`, session id    |
| `POST /bbs/save`           | `brdtitle`, `brdmemo`, `brdwriter`          |
| `GET /bbs/read`            | `brdno`                                     |
| `GET /bbs/delete`          | `brdno`                                     |
| `GET /bbs/update`          | `brdno`                                     |
| `POST /bbs/updatesave`     | `brdno`, `brdtitle`, `brdmemo`, `brdwriter` |
| `GET /bbs/search`          | `choice`, `search`                          |

`choice`는 allowlist가 있지만 `search`는 문자열 결합으로 들어간다. `brdno`도 숫자 검증 없이 SQL에 결합된다.

## 비밀번호 상태

현재 상태:

- `bcrypt`는 설치되어 있다.
- 회원가입 시 `LOGIN.PASSWORD`에 평문 비밀번호를 저장한다.
- 로그인 시 DB의 평문 비밀번호와 입력값을 직접 비교한다.
- 회원정보 수정 화면에 기존 비밀번호 값이 렌더링된다.

필요 작업:

- 회원가입 시 `bcrypt.hash()` 적용
- 로그인 시 `bcrypt.compare()` 적용
- 회원정보 수정 시 비밀번호 재입력/변경 정책 정리
- 기존 평문 데이터 마이그레이션 또는 샘플 데이터 재생성

## 세션 상태

현재 상태:

- `express-session` 사용
- `secret`은 `SESSION_SECRET` 환경변수 사용
- `resave: false`
- `saveUninitialized: false`

개선 필요:

- cookie 옵션 명시
  - `httpOnly: true`
  - `sameSite: 'lax'`
  - 운영 환경에서 `secure: true`
- session store는 기본 MemoryStore이므로 운영용으로는 부적합

## 권한 체크 상태

현재 상태:

- 로그인 여부만 확인한다.
- 게시글 작성자와 로그인 사용자가 같은지는 확인하지 않는다.
- 로그인한 사용자는 다른 사용자의 글도 수정/삭제할 수 있다.

필요 작업:

- 게시글 작성자 기준 권한 체크
- 작성자 컬럼과 회원 ID 매핑 정책 정리
- 관리자 권한을 추가할 경우 `LOGIN` 테이블 확장 필요

## 기타 보안 리스크

- `GET /bbs/delete`는 링크 클릭만으로 삭제 상태 변경이 가능하다.
- CSRF 방어가 없다.
- XSS 방어는 EJS `<%=` escape에 일부 의존하고 있지만, 입력값 검증은 부족하다.
- 파일 업로드 구현 시 확장자, MIME, 크기 제한이 필요하다.
- 서버 로그에 SQL이 출력되어 민감 정보가 남을 수 있다.

## 보안 개선 우선순위

1. bcrypt 적용
2. 인증/회원 SQL bind variable 적용
3. 게시판 SQL bind variable 적용
4. `brdno` 숫자 검증
5. 작성자 권한 체크
6. 삭제 POST 전환
7. session cookie 옵션 명시
8. 입력값 검증
9. 보안 스캔 정기 실행
