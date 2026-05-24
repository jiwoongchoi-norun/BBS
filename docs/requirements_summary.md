# BBS 과제 요구사항 요약

최종 업데이트: 2026-05-25

이 문서는 교수님 PPT 기준 게시판 과제 요구사항과 현재 구현 상태를 확인하기 위한 기준 문서이다. 구현 근거는 `routes/bbs.js`, `routes/bbs/*.routes.js`, `db/repositories/*.js`, `views/bbs/*.ejs`, `scripts/schema.sql`, `scripts/migration.sql`을 기준으로 한다.

## 프로젝트 목표

- 1차 목표: Node.js, Express, EJS, OracleDB 기반 게시판 필수 기능 완성
- 2차 목표: 보안, 사용성, UI, 유지보수성 개선으로 가산점 후보 반영
- 과제 우선순위: 실서비스 수준의 완벽한 보안보다 수업 요구 흐름 충족을 우선하되, 명확한 취약점은 개선

## 현재 구조 요약

5단계에서 `/bbs` 라우트가 기능별 파일로 분리되었다. URL은 기존 `/bbs/...` 경로를 유지한다.

| 파일                               | 역할                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `routes/bbs.js`                    | `/bbs` 공통 CSRF 처리, `res.locals.csrfToken`, `/` -> `/list` redirect, feature router mount, CSRF 오류 처리 |
| `routes/bbs/auth.routes.js`        | 로그인, 로그아웃, 회원가입, 회원정보, ID 찾기, 비밀번호 재설정, 회원 탈퇴                                    |
| `routes/bbs/posts-read.routes.js`  | 목록, 검색, 상세 읽기, 조회수, 상세 화면 데이터 조회                                                         |
| `routes/bbs/posts-write.routes.js` | 글쓰기, 글수정, 글삭제, 파일 업로드 연계                                                                     |
| `routes/bbs/files.routes.js`       | 첨부파일 다운로드                                                                                            |
| `routes/bbs/comments.routes.js`    | 댓글, 대댓글, 댓글 수정/삭제                                                                                 |
| `routes/bbs/reactions.routes.js`   | 좋아요/싫어요                                                                                                |
| `db/repositories/*.js`             | 게시글/댓글/반응 관련 SQL 실행 함수                                                                          |

## 필수 기능 상태

아래 상태는 코드 기준 구현 여부이다. 실제 브라우저/DB 수동 테스트 성공 여부는 `docs/manual_test_result.md`에서 별도로 관리한다.

| 요구사항        | 코드 기준 상태 | 구현 위치                                                                        |
| --------------- | -------------- | -------------------------------------------------------------------------------- |
| 게시글 목록     | 구현 확인      | `GET /bbs/list`, `routes/bbs/posts-read.routes.js`, `views/bbs/list.ejs`         |
| 글쓰기          | 구현 확인      | `GET /bbs/form`, `POST /bbs/save`, `routes/bbs/posts-write.routes.js`            |
| 글읽기          | 구현 확인      | `GET /bbs/read`, `routes/bbs/posts-read.routes.js`                               |
| 글수정          | 구현 확인      | `GET /bbs/update`, `POST /bbs/updatesave`, `routes/bbs/posts-write.routes.js`    |
| 글삭제          | 구현 확인      | `GET /bbs/delete` 안내/이동, `POST /bbs/delete` soft delete                      |
| 검색            | 구현 확인      | `GET /bbs/search`, `routes/bbs/posts-read.routes.js`                             |
| 로그인          | 구현 확인      | `GET /bbs/login`, `POST /bbs/logincheck`, `routes/bbs/auth.routes.js`            |
| 로그아웃        | 구현 확인      | `GET /bbs/logout`, `routes/bbs/auth.routes.js`                                   |
| 회원가입        | 구현 확인      | `GET /bbs/signup`, `POST /bbs/signupsave`, `routes/bbs/auth.routes.js`           |
| 회원정보 수정   | 구현 확인      | `GET /bbs/updatesignup`, `POST /bbs/updatesignsave`, `routes/bbs/auth.routes.js` |
| 세션 처리       | 구현 확인      | `express-session`, `req.session.user`                                            |
| 비밀번호 암호화 | 구현 확인      | bcrypt 저장, legacy SHA-512 자동 전환                                            |
| 조회수          | 구현 확인      | `BBS.VIEW_COUNT`, 상세 조회 처리                                                 |
| 페이징          | 구현 확인      | 목록/검색 `page`, `pageSize`                                                     |
| 댓글            | 구현 확인      | `BBSW`, `POST /bbs/wsave`, `routes/bbs/comments.routes.js`                       |
| 파일업로드      | 구현 확인      | `multer`, `BBS_FILE`, `routes/helpers/upload.js`                                 |

## 추가 구현 기능

| 기능                   | 코드 기준 상태 | 구현 내용                                                                   |
| ---------------------- | -------------- | --------------------------------------------------------------------------- |
| 댓글 수정/삭제         | 구현 확인      | 작성자 본인만 `POST /bbs/wupdate`, `POST /bbs/wdelete` 가능                 |
| 대댓글                 | 구현 확인      | `BBSW.PARENT_NO`, `DEPTH`, `POST /bbs/wreply`                               |
| 좋아요/싫어요          | 구현 확인      | `BBS_REACTION`, 게시글별 반응 토글                                          |
| 작성자 권한 체크       | 구현 확인      | 게시글/댓글 수정, 삭제, 다운로드 권한 확인                                  |
| SQL Injection 방지     | 구현 확인      | Oracle bind variable, 숫자/정렬/검색 컬럼 whitelist                         |
| bcrypt 비밀번호 암호화 | 구현 확인      | 신규 계정 bcrypt, 기존 SHA-512 계정 로그인 시 bcrypt 전환                   |
| 입력값 검증            | 구현 확인      | 제목, 내용, ID, 이메일, 전화번호, 비밀번호 정책                             |
| CSRF 방어              | 구현 확인      | `/bbs` POST form에 `_csrf` 토큰 적용                                        |
| 파일 업로드 제한       | 구현 확인      | 1개 파일, 10MB, 확장자/MIME allowlist                                       |
| 세션 보안              | 구현 확인      | `SESSION_SECRET` 필수, `httpOnly`, `sameSite=lax`, production secure cookie |
| 비밀번호 재설정        | 구현 확인      | 과제 시연용 reset token flow, 실제 이메일 발송 없음                         |
| Bootstrap UI 개선      | 구현 확인      | 공통 nav/footer, 카드/버튼/테이블/모달 스타일 정리                          |

## 주요 화면 및 흐름

- 목록: 검색, 정렬, 페이징, 페이지 크기 선택, 내 글만 보기, 댓글 수 표시
- 상세: 조회수 증가, 첨부파일 다운로드, 좋아요/싫어요, 댓글/대댓글, 수정/삭제 modal
- 글쓰기/수정: 로그인 사용자 이름을 작성자로 사용, 파일 첨부 가능
- 회원: 가입, 로그인, 로그아웃, ID 찾기, 비밀번호 재설정, 내 정보, 회원정보 수정, 회원 탈퇴
- 보안: 주요 POST는 CSRF 토큰 필요, 사용자 입력은 EJS escaped output으로 출력

## DB 스크립트 기준

| 파일                         | 용도                                 |
| ---------------------------- | ------------------------------------ |
| `scripts/schema.sql`         | 신규 DB 생성용 전체 스키마           |
| `scripts/sample-data.sql`    | 시연용 초기 데이터                   |
| `scripts/migration.sql`      | 기존 DB 보강용 통합 마이그레이션     |
| `scripts/rollback.sql`       | FK/index 중심 되돌리기 참고 스크립트 |
| `scripts/add-view-count.sql` | 조회수 컬럼 보강                     |
| `scripts/add-login-salt.sql` | legacy 비밀번호 salt 보강            |
| `scripts/add-bbsw.sql`       | 댓글 테이블 보강                     |
| `scripts/add-bbs-file.sql`   | 파일 테이블 보강                     |

신규 설치는 `schema.sql`과 `sample-data.sql`을 사용하고, 기존 DB는 `migration.sql`을 적용한다.

## 제출 전 확인 목록

1. `.env`에 `SESSION_SECRET`, `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` 설정
2. OracleDB에 `scripts/schema.sql` 또는 `scripts/migration.sql` 적용
3. `npm install`
4. `npm run verify:app`
5. `npm run lint`
6. `npm run format:check`
7. `git diff --check`
8. `http://localhost:3000/bbs/list` 접근 확인
9. 로그인, 글쓰기, 상세, 수정, 삭제, 검색, 페이징, 댓글, 파일 업로드/다운로드 수동 테스트

## 남은 확인 항목

- 전체 브라우저 수동 테스트와 DB 데이터 변동 확인
- `.env` 실제 설정과 OracleDB 접속 가능 여부 확인
- 회원가입부터 로그아웃까지 실제 계정 흐름 확인
- 게시글 CRUD, 댓글, reaction, 파일 업로드/다운로드 실제 데이터 확인
- 작성자 계정과 다른 계정을 사용한 권한 차단 확인

## 남은 개선 후보

- 자동화 테스트 확대
- 여러 SQL을 하나의 업무 단위로 묶는 transaction 경계 정리
- 관리자 기능
- 계정 잠금 정책과 감사 로그
- 업로드 파일의 물리 삭제 실패 기록 및 재시도 정책
