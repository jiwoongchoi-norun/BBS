# Security Notes

## 핵심 보안 포인트

- 비밀번호는 bcrypt로 저장합니다.
- 기존 SHA-512 + salt 계정은 로그인 성공 시 bcrypt로 자동 전환합니다.
- 탈퇴 계정은 `LOGIN.OK = 0`으로 비활성화하고 로그인에서 차단합니다.
- SQL은 문자열 결합 대신 bind variable 사용을 우선합니다.
- 숫자 파라미터는 양의 정수만 허용합니다.
- 로그인 필요 기능은 `requireLogin()`을 통과해야 합니다.
- 작성자 본인만 게시글 수정/삭제, 댓글 수정/삭제가 가능합니다.
- 업로드 파일은 확장자와 크기를 제한합니다.

## 코드 리뷰 시 볼 부분

1. `routes/bbs.js`의 `requireLogin()`
2. `routes/bbs.js`의 `toValidNumber()`, `cleanText()`
3. `POST /bbs/logincheck`
4. `GET/POST /bbs/find-id`
5. `POST /bbs/signupsave`
6. `POST /bbs/updatesignsave`
7. `POST /bbs/withdraw`
8. `GET /bbs/read`
9. `POST /bbs/wupdate`, `POST /bbs/wdelete`
10. `POST /bbs/reaction`
11. `GET /bbs/download`

## 아직 남은 보안 개선

- CSRF token 추가
- 게시글 삭제 요청을 POST로 변경
- 추천/댓글/파일 관련 DB 작업 트랜잭션 처리
- 파일 삭제 정책 정리
- 로그인 실패 횟수 기반 잠금 정책
- 운영용 보안 헤더 적용
