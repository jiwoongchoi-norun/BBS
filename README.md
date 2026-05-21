# BBS 게시판 과제 프로젝트

Node.js, Express, EJS, OracleDB로 구현한 게시판 과제 프로젝트입니다. 교수님 PPT 요구사항을 기준으로 게시판 기본 기능을 복구하고, 제출 시연에 필요한 회원/댓글/파일/보안 기능을 추가했습니다.

> 최종 정리 기준: 2026-05-21  
> 상세 요구사항과 구현 상태는 `docs/requirements_summary.md`를 기준으로 관리합니다.

## 프로젝트 목표

- 게시판 과제 필수 기능 구현: 목록, 글쓰기, 글읽기, 수정, 삭제, 검색, 로그인, 회원가입, 세션, 댓글, 파일 업로드
- 과제 가산점 후보 반영: bcrypt 비밀번호 암호화, SQL Injection 완화, CSRF 방어, 작성자 권한 체크, 좋아요/싫어요, 대댓글, Bootstrap UI 개선
- GitHub 제출용 문서화: 실행 방법, DB 준비, 검증 명령, 주요 라우트, 프로젝트 구조 정리

## 현재 구현 상태

필수 기능은 구현 완료 상태입니다.

- 게시글: 목록, 상세, 작성, 수정, 삭제, 조회수, 검색, 정렬, 페이징, 페이지 크기 선택, 내 글만 보기
- 회원: 회원가입, 로그인, 로그아웃, ID 찾기, 비밀번호 재설정, 내 정보, 회원정보 수정, 회원 탈퇴
- 댓글: 댓글 작성, 대댓글 작성, 댓글 수정, 댓글 삭제
- 첨부파일: 글 작성 시 파일 업로드, 상세 화면 다운로드, 삭제 시 파일 메타데이터 비활성화
- 반응 기능: 게시글 좋아요/싫어요 토글
- 보안 개선: bcrypt 저장, 기존 SHA-512 계정 bcrypt 자동 전환, bind variable, 입력값 검증, CSRF token, 세션 cookie 옵션, 작성자 권한 검증
- UI 개선: Bootstrap 5 기반 공통 navigation/footer, flash message, 목록/상세/회원 화면 스타일 정리

## 기술 스택

| 구분      | 사용 기술                 |
| --------- | ------------------------- |
| Runtime   | Node.js                   |
| Framework | Express                   |
| Template  | EJS                       |
| Database  | OracleDB                  |
| Session   | express-session           |
| Security  | bcrypt, csurf             |
| Upload    | multer                    |
| UI        | Bootstrap 5, custom CSS   |
| Tooling   | ESLint, Prettier, nodemon |

## 프로젝트 구조

```text
BBS/
├─ app.js                         # Express 앱 설정, session, router, error handler
├─ bin/www                        # 서버 시작 진입점
├─ config/dbconfig.js             # .env 기반 OracleDB 접속 설정
├─ routes/bbs.js                  # 게시글, 회원, 댓글, 추천, 파일 핵심 라우터
├─ views/bbs/*.ejs                # EJS 화면 템플릿
├─ views/bbs/partials/*.ejs       # 공통 head/nav/footer/flash
├─ public/stylesheets/style.css   # Bootstrap 보완 스타일
├─ scripts/*.sql                  # DB schema, migration, rollback, sample data
├─ uploads/bbs                    # 업로드 파일 저장 경로
└─ docs/*.md                      # 요구사항, 아키텍처, 테스트, 유지보수 문서
```

## 설치

```powershell
npm install
```

`.env.example`을 참고해 `.env`를 작성합니다. 실제 DB 비밀번호와 session secret은 Git에 올리지 않습니다.

```env
PORT=3000
SESSION_SECRET=change-this-session-secret
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost/XEPDB1
```

`SESSION_SECRET`이 없으면 앱이 시작되지 않습니다.

## DB 준비

신규 DB 생성 기준:

```sql
@scripts/schema.sql
@scripts/sample-data.sql
```

기존 과제 DB를 보강하는 경우:

```sql
@scripts/migration.sql
```

주요 테이블은 `LOGIN`, `BBS`, `BBSW`, `BBS_REACTION`, `BBS_FILE`, `RESET_TOKEN`입니다. 자세한 스키마는 `docs/schema_summary.md`에 정리되어 있습니다.

## 실행

일반 실행:

```powershell
npm start
```

개발 모드:

```powershell
npm run dev
```

브라우저 접속:

```text
http://localhost:3000/bbs/list
```

## 검증

기본 검증:

```powershell
npm run verify:app
npm run lint
npm run format:check
```

선택 검증:

```powershell
npm run audit
npm run security:secrets
npm run security:semgrep
```

제출 전에는 `docs/test_plan.md`를 기준으로 로그인, 글쓰기, 상세 조회, 수정, 삭제, 검색, 페이징, 댓글, 파일 업로드/다운로드를 수동 확인합니다.

## 주요 라우트

| Method     | Path                                                        | 기능                                           |
| ---------- | ----------------------------------------------------------- | ---------------------------------------------- |
| GET        | `/bbs`, `/bbs/list`                                         | 게시글 목록                                    |
| GET        | `/bbs/search`                                               | 검색                                           |
| GET        | `/bbs/read`                                                 | 게시글 상세, 조회수, 댓글, 첨부파일, 반응 상태 |
| GET / POST | `/bbs/form`, `/bbs/save`                                    | 글쓰기, 파일 업로드                            |
| GET / POST | `/bbs/update`, `/bbs/updatesave`                            | 글수정                                         |
| GET        | `/bbs/delete`                                               | 글삭제 soft delete                             |
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

## 문서

| 문서                           | 내용                                        |
| ------------------------------ | ------------------------------------------- |
| `docs/requirements_summary.md` | 교수님 PPT 기준 요구사항과 구현 상태        |
| `docs/architecture.md`         | 서버 구조, 라우트, 인증/보안/파일 처리 흐름 |
| `docs/schema_summary.md`       | OracleDB 테이블, 관계, 스크립트 기준        |
| `docs/test_plan.md`            | 제출 전 명령어, 수동 테스트, 보안 테스트    |
| `docs/maintenance_report.md`   | 서버 분석, 유지보수 보고서, backlog         |
| `docs/change_log.md`           | 변경 이력                                   |
| `docs/troubleshooting.md`      | 문제 해결 메모                              |
| `docs/notion-sync.md`          | Notion 동기화 설정                          |
| `DESIGN.md`                    | UI 디자인 참고 자료                         |

## 제출 전 체크리스트

1. `.env`에 `SESSION_SECRET`, `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` 설정
2. OracleDB에 `scripts/schema.sql` 또는 `scripts/migration.sql` 적용
3. `npm install`
4. `npm run verify:app`
5. `npm run lint`
6. `npm run format:check`
7. `http://localhost:3000/bbs/list` 접속 확인
8. 게시글 CRUD, 검색, 페이징, 로그인, 회원가입, 댓글, 파일 업로드/다운로드 수동 테스트
9. 권한 없는 수정/삭제, 잘못된 파라미터, 차단 확장자 업로드 보안 테스트

## 남은 개선 후보

- 자동화 테스트 확대
- 여러 SQL을 하나의 업무 단위로 묶는 transaction 경계 정리
- 관리자 기능 추가
- 계정 잠금 정책과 감사 로그 보강
- 업로드 파일 물리 삭제 실패 기록 및 재시도 정책 추가

## 참고

이 프로젝트는 과제 제출과 시연을 우선한 구조입니다. `routes/bbs.js`에 라우팅, 검증, DB 접근, 파일 처리가 함께 들어 있으므로 대규모 리팩토링보다는 기능 단위로 작게 수정하고 `docs/test_plan.md` 기준으로 검증하는 방식이 적합합니다.
