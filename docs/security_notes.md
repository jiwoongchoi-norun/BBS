# Security Notes

## 적용된 보안 보강

- DB 접속 정보는 `.env`에서 읽는다.
- `.env`는 저장소에 포함하지 않는다.
- `SESSION_SECRET`은 코드에 하드코딩하지 않고 환경변수로 받는다.
- 세션에는 비밀번호를 저장하지 않는다.
- 로그인 필요 기능은 `requireLogin()`으로 보호한다.
- 게시글 삭제는 실제 `DELETE`가 아니라 `OK = 0` soft delete로 처리한다.
- 게시글 수정/삭제는 작성자만 가능하다.
- 댓글 삭제는 작성자만 가능하다.
- 주요 SQL은 Oracle bind variable을 사용한다.
- 숫자 파라미터는 양의 정수만 허용한다.
- 검색 컬럼은 allowlist로 제한한다.
- 파일 업로드는 허용 확장자와 10MB 크기 제한을 적용한다.
- 저장 파일명은 난수 기반 이름을 사용한다.

## SQL Injection 대응 현황

| 라우트                     | 대응                                  |
| -------------------------- | ------------------------------------- |
| `POST /bbs/logincheck`     | bind variable                         |
| `POST /bbs/signupsave`     | bind variable                         |
| `GET /bbs/updatesignup`    | bind variable                         |
| `POST /bbs/updatesignsave` | bind variable                         |
| `GET /bbs/list`            | bind variable                         |
| `POST /bbs/save`           | bind variable                         |
| `GET /bbs/read`            | bind variable, 숫자 검증              |
| `GET /bbs/delete`          | bind variable, 숫자 검증, 작성자 체크 |
| `GET /bbs/update`          | bind variable, 숫자 검증              |
| `POST /bbs/updatesave`     | bind variable, 숫자 검증, 작성자 체크 |
| `GET /bbs/search`          | 검색 컬럼 allowlist, bind variable    |
| `POST /bbs/wsave`          | bind variable, 숫자 검증              |
| `POST /bbs/wreply`         | bind variable, 숫자 검증              |
| `GET /bbs/wdelete`         | bind variable, 숫자 검증, 작성자 체크 |
| `GET /bbs/download`        | bind variable, 숫자 검증              |

## 비밀번호 상태

현재 방식:

- 회원가입과 회원정보 수정 시 salt를 생성한다.
- `password + salt`를 SHA-512로 해시한다.
- `LOGIN.PASSWORD`에는 해시값을 저장한다.
- `LOGIN.SALT`에는 salt를 저장한다.
- 로그인 시 저장된 salt로 입력 비밀번호를 다시 해시해 비교한다.

주의:

- `bcrypt` 패키지는 설치되어 있지만 런타임에서는 아직 사용하지 않는다.
- 기존 평문 비밀번호 계정은 `SALT`와 해시값이 없어 로그인 실패 가능성이 있다.
- 테스트와 제출 캡처에서는 `PASSWORD`, `SALT` 값을 출력하지 않는다.

## 남은 보안 개선 후보

1. bcrypt 전환 및 기존 계정 마이그레이션 방식 결정
2. `GET /bbs/delete`, `GET /bbs/wdelete`를 POST 방식으로 전환
3. CSRF 방어 추가
4. session cookie 옵션 명시
5. 업로드 파일 MIME 검증 강화
6. 운영 환경용 session store 적용
7. 자동화 보안 검사 정기 실행

## 수동 보안 테스트

- `/bbs/read?brdno=1 OR 1=1` 요청 시 bad request
- 로그인 ID/PW에 SQL Injection 문자열 입력 시 실패
- 다른 사용자 게시글 수정/삭제 시 403
- 다른 사용자 댓글 삭제 시 403
- 차단 확장자 파일 업로드 실패
- 로그아웃 후 글쓰기/댓글 작성 시 로그인 화면 이동
