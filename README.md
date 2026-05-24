# BBS 게시판 과제 프로젝트

Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트입니다. 교수님 PPT 요구사항을 기준으로 게시판 필수 기능을 복구하고, 제출 시연에 필요한 회원, 댓글, 파일 업로드, 보안 개선 항목을 정리했습니다.

> 최종 정리 기준: 2026-05-25
> 상세 요구사항과 구현 상태는 `docs/requirements_summary.md`, 실제 수동 테스트 기록은 `docs/manual_test_result.md`를 기준으로 확인합니다.

## 실행 환경

| 구분      | 내용                      |
| --------- | ------------------------- |
| Runtime   | Node.js                   |
| Framework | Express                   |
| Template  | EJS                       |
| Database  | OracleDB                  |
| Session   | express-session           |
| Security  | bcrypt, csurf             |
| Upload    | multer                    |
| Tooling   | ESLint, Prettier, nodemon |

## 설치 방법

```powershell
npm install
```

`.env.example`을 참고해 `.env`를 작성합니다. 제출 문서에는 실제 값을 적지 않고 변수명만 기록합니다.

필요한 환경 변수:

```env
PORT
SESSION_SECRET
DB_USER
DB_PASSWORD
DB_CONNECT_STRING
```

`SESSION_SECRET`이 없으면 앱이 시작되지 않습니다.

## DB 준비 방법

신규 DB를 준비하는 경우:

```sql
@scripts/schema.sql
@scripts/sample-data.sql
```

기존 과제 DB를 보강하는 경우:

```sql
@scripts/migration.sql
```

주요 테이블은 `LOGIN`, `BBS`, `BBSW`, `BBS_REACTION`, `BBS_FILE`, `RESET_TOKEN`입니다. 자세한 내용은 `docs/schema_summary.md`에 정리되어 있습니다.

## 실행 명령

일반 실행:

```powershell
npm start
```

개발 실행:

```powershell
npm run dev
```

## 자동 검증 명령

제출 전 기본 검증:

```powershell
npm run verify:app
npm run lint
npm run format:check
git diff --check
```

선택 검증:

```powershell
npm run audit
npm run security:secrets
npm run security:semgrep
```

`npm run check`는 `lint`, `format:check`, `audit`를 함께 실행합니다.

## 주요 URL

| Method     | Path                                                        | 기능                                           |
| ---------- | ----------------------------------------------------------- | ---------------------------------------------- |
| GET        | `/bbs`, `/bbs/list`                                         | 게시글 목록                                    |
| GET        | `/bbs/search`                                               | 검색                                           |
| GET        | `/bbs/read`                                                 | 게시글 상세, 조회수, 댓글, 첨부파일, 반응 상태 |
| GET / POST | `/bbs/form`, `/bbs/save`                                    | 글쓰기, 파일 업로드                            |
| GET / POST | `/bbs/update`, `/bbs/updatesave`                            | 글수정                                         |
| GET / POST | `/bbs/delete`                                               | GET은 안내/이동, POST는 글 soft delete         |
| GET / POST | `/bbs/login`, `/bbs/logincheck`                             | 로그인                                         |
| GET        | `/bbs/logout`                                               | 로그아웃                                       |
| GET / POST | `/bbs/signup`, `/bbs/signupsave`                            | 회원가입                                       |
| GET        | `/bbs/check-id`                                             | ID 중복 확인                                   |
| GET / POST | `/bbs/find-id`                                              | ID 찾기                                        |
| GET / POST | `/bbs/reset-password/*`                                     | 비밀번호 재설정                                |
| GET        | `/bbs/myinfo`                                               | 내 정보                                        |
| GET / POST | `/bbs/updatesignup`, `/bbs/updatesignsave`                  | 회원정보 수정                                  |
| POST       | `/bbs/withdraw`                                             | 회원 탈퇴                                      |
| POST       | `/bbs/wsave`, `/bbs/wreply`, `/bbs/wupdate`, `/bbs/wdelete` | 댓글/대댓글 작성 및 수정/삭제                  |
| POST       | `/bbs/reaction`                                             | 좋아요/싫어요                                  |
| GET        | `/bbs/download`                                             | 첨부파일 다운로드                              |

## 현재 파일 구조

```text
BBS/
├─ app.js                         # Express 앱 설정, session, router, error handler
├─ bin/www                        # 서버 시작 진입점
├─ config/dbconfig.js             # .env 기반 OracleDB 접속 설정
├─ db/oracle.js                   # OracleDB connection helper
├─ db/repositories/*.js           # 게시글/댓글/반응 SQL 실행 함수
├─ routes/bbs.js                  # /bbs 공통 CSRF, feature router 조립
├─ routes/bbs/*.routes.js         # 회원, 게시글, 파일, 댓글, 반응 라우트
├─ routes/helpers/*.js            # 응답, 업로드, 입력값 검증 helper
├─ routes/middleware/auth.js      # 로그인 필요 middleware
├─ views/bbs/*.ejs                # EJS 화면 템플릿
├─ views/bbs/partials/*.ejs       # 공통 head/nav/footer/flash
├─ public/stylesheets/style.css   # Bootstrap 보완 스타일
├─ scripts/*.sql                  # DB schema, migration, rollback, sample data
├─ uploads/bbs                    # 업로드 파일 저장 경로
└─ docs/*.md                      # 요구사항, 구조, 테스트, 유지보수 문서
```

## 구현 완료 기능

아래 항목은 코드 기준으로 구현되어 있습니다. 전체 브라우저/DB 수동 테스트 성공을 의미하지는 않습니다.

- 게시글: 목록, 상세, 작성, 수정, 삭제, 조회수, 검색, 정렬, 페이징, 페이지 크기 선택, 내 글만 보기
- 회원: 회원가입, 로그인, 로그아웃, ID 찾기, 비밀번호 재설정, 내 정보, 회원정보 수정, 회원 탈퇴
- 댓글: 댓글 작성, 대댓글 작성, 댓글 수정, 댓글 삭제
- 첨부파일: 글 작성/수정 시 파일 처리, 상세 화면 다운로드, 삭제 시 파일 메타데이터 비활성화
- 반응 기능: 게시글 좋아요/싫어요 토글
- 보안 개선: bcrypt 저장, 기존 SHA-512 계정 bcrypt 자동 전환, bind variable, 입력값 검증, CSRF token, 세션 cookie 옵션, 작성자 권한 검증
- UI 개선: Bootstrap 5 기반 공통 navigation/footer, flash message, 목록/상세/회원 화면 스타일 정리

## 제출 전 수동 테스트 체크리스트

- [ ] `.env`에 `SESSION_SECRET`, `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` 설정
- [ ] OracleDB에 신규 스키마 또는 마이그레이션 적용
- [ ] `npm install` 완료
- [ ] `npm run verify:app`, `npm run lint`, `npm run format:check`, `git diff --check` 통과
- [ ] `http://localhost:3000/bbs/list` 접근 확인
- [ ] 회원가입, 로그인, 로그아웃, 회원정보 수정 확인
- [ ] 게시글 목록, 글쓰기, 글읽기, 글수정, 글삭제 확인
- [ ] 검색, 정렬, 페이징, 조회수 확인
- [ ] 댓글, 대댓글, 댓글 수정/삭제 확인
- [ ] 좋아요/싫어요 확인
- [ ] 파일 업로드/다운로드 확인
- [ ] 작성자가 아닌 계정의 수정/삭제/다운로드 차단 확인

## 알려진 주의사항

- `.env` 값은 제출 문서나 Git에 기록하지 않습니다.
- `GET /bbs/delete`는 삭제를 실행하지 않고 안내 후 이동하며, 실제 삭제는 `POST /bbs/delete`에서 수행됩니다.
- 비밀번호 재설정은 과제 시연용 reset link 흐름이며 실제 이메일 발송 기능은 없습니다.
- 브라우저 전체 수동 테스트와 DB 데이터 변동 확인은 `docs/manual_test_result.md` 기준으로 별도 기록해야 합니다.
- 관리자 기능, 계정 잠금, 감사 로그, 자동화 테스트 확대는 남은 개선 후보입니다.
