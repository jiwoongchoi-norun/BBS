# BBS

Node.js, Express, EJS, OracleDB 기반 자유게시판 프로젝트입니다. 게시글, 회원, 댓글, 첨부파일, 좋아요/싫어요, 기본 보안 처리를 포함한 서버 렌더링 게시판 예제입니다.

> 프로젝트 구조와 유지보수 기준은 `docs/PROJECT_GUIDE.md`를 먼저 확인합니다. 서버 구조는 `docs/architecture.md`, DB 구조는 `docs/schema_summary.md`, 테스트 절차는 `docs/test_plan.md`에 정리되어 있습니다.

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

`.env.example`을 참고해 `.env`를 작성합니다. 실제 secret과 DB 접속 정보는 Git에 커밋하지 않습니다.

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

기존 DB를 보강하는 경우:

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

기본 검증:

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

## 프로젝트 구조

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
├─ docs/PROJECT_GUIDE.md          # 프로젝트 파일 안내
└─ docs/*.md                      # 구조, DB, 테스트, 문제해결 문서
```

## 주요 기능

- 게시글: 목록, 상세, 작성, 수정, 삭제, 조회수, 검색, 정렬, 페이징, 페이지 크기 선택, 내 글만 보기
- 회원: 회원가입, 로그인, 로그아웃, ID 찾기, 비밀번호 재설정, 내 정보, 회원정보 수정, 회원 탈퇴
- 댓글: 댓글 작성, 대댓글 작성, 댓글 수정, 댓글 삭제
- 첨부파일: 글 작성/수정 시 파일 처리, 상세 화면 다운로드, 삭제 시 파일 메타데이터 비활성화
- 반응 기능: 게시글 좋아요/싫어요 토글
- 보안: bcrypt 저장, 기존 SHA-512 계정 bcrypt 자동 전환, bind variable, 입력값 검증, CSRF token, 세션 cookie 옵션, 작성자 권한 검증
- UI 개선: Bootstrap 5 기반 공통 navigation/footer, flash message, 목록/상세/회원 화면 스타일 정리

## 테스트 체크리스트

- `.env`에 `SESSION_SECRET`, `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` 설정
- OracleDB에 신규 스키마 또는 마이그레이션 적용
- `npm install` 완료
- `npm run verify:app`, `npm run lint`, `npm run format:check`, `git diff --check` 통과
- 브라우저에서 `http://localhost:3000/bbs/list` 접근 확인
- 회원, 게시글, 검색/페이징, 댓글, 첨부파일, reaction, 권한 차단 흐름 확인

## 알려진 주의사항

- `.env` 값은 문서나 Git에 기록하지 않습니다.
- `GET /bbs/delete`는 삭제를 실행하지 않고 안내 후 이동하며, 실제 삭제는 `POST /bbs/delete`에서 수행됩니다.
- 비밀번호 재설정은 reset link 생성 흐름이며 실제 이메일 발송 기능은 없습니다.
- 관리자 기능, 계정 잠금, 감사 로그, 자동화 테스트 확대는 남은 개선 후보입니다.
- 보안 실험과 추가 보안 개선은 `security-lab` 브랜치에서 진행합니다.

## 문서 안내

| 문서                      | 용도                         |
| ------------------------- | ---------------------------- |
| `docs/PROJECT_GUIDE.md`   | 프로젝트 파일 안내           |
| `docs/architecture.md`    | 서버 구조, 라우터, 보안 흐름 |
| `docs/schema_summary.md`  | DB 테이블과 상태 컬럼        |
| `docs/test_plan.md`       | 기능별 테스트 절차           |
| `docs/troubleshooting.md` | 자주 나는 오류와 해결 방법   |
