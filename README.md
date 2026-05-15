# BBS 게시판 프로젝트

Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트입니다. 교수님 PPT 요구사항의 기본 게시판 흐름을 충족하고, 보안/사용성/디자인 개선 기능을 추가했습니다.

## 현재 구현 상태

게시글 CRUD, 검색, 페이징, 조회수, 로그인/로그아웃, 회원가입, 회원정보 수정, 댓글/대댓글, 좋아요/싫어요, 파일 업로드/다운로드가 동작합니다. 목록 화면은 검색/정렬/페이지당 표시 개수 선택을 지원하며, 비활성 글은 제외하고 현재 조회 결과 기준의 표시용 번호를 보여줍니다.

UI는 Bootstrap 5를 기반으로 하되 `DESIGN.md`의 Linear 디자인 가이드를 밝은 게시판 화면에 맞게 재해석한 커스텀 CSS를 적용했습니다.

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| Runtime | Node.js |
| Framework | Express |
| Template | EJS |
| Database | OracleDB XE |
| Session | express-session |
| Upload | multer |
| Password | bcrypt, legacy SHA-512 + salt fallback |
| UI | Bootstrap 5, custom CSS |
| Tooling | ESLint, Prettier, nodemon |

## 주요 기능

| 기능 | 상태 | 주요 경로 |
| --- | --- | --- |
| 게시글 목록 | 완료 | `GET /bbs/list` |
| 게시글 검색 | 완료 | `GET /bbs/search` |
| 조회수/좋아요/작성일 정렬 | 완료 | `sort`, `order` query |
| 페이지당 표시 개수 | 완료 | `pageSize=10/20/30/50` |
| 게시글 작성 | 완료 | `GET /bbs/form`, `POST /bbs/save` |
| 작성자 자동 처리 | 완료 | 로그인 사용자 이름 저장 |
| 게시글 읽기 | 완료 | `GET /bbs/read?brdno={no}` |
| 게시글 수정 | 완료 | `GET /bbs/update`, `POST /bbs/updatesave` |
| 게시글 삭제 | 완료 | `GET /bbs/delete`, soft delete |
| 수정/삭제 확인 modal | 완료 | `views/bbs/read.ejs` |
| 로그인/로그아웃 | 완료 | `POST /bbs/logincheck`, `GET /bbs/logout` |
| 상단 사용자 이름 표시 | 완료 | `views/bbs/partials/nav.ejs` |
| 내 정보 페이지 | 완료 | `GET /bbs/myinfo` |
| 회원가입 | 완료 | `POST /bbs/signupsave` |
| 아이디 중복확인 | 완료 | `GET /bbs/check-id` |
| 전화번호 입력/저장 | 완료 | `LOGIN.PHONE` |
| 회원정보 수정 | 완료 | `POST /bbs/updatesignsave` |
| 댓글 | 완료 | `POST /bbs/wsave` |
| 대댓글 | 완료 | `POST /bbs/wreply` |
| 댓글 삭제 | 완료 | `GET /bbs/wdelete` |
| 좋아요/싫어요 | 완료 | `POST /bbs/reaction` |
| 파일 업로드 | 완료 | `POST /bbs/save` |
| 파일 다운로드 | 완료 | `GET /bbs/download` |
| 루트 접속 redirect | 완료 | `GET /` -> `/bbs` |

## 설치

```powershell
npm install
```

`.env.example`을 참고해 `.env`를 작성합니다. 실제 비밀번호나 secret은 문서에 기록하지 않습니다.

```env
PORT=3000
SESSION_SECRET=change-this-session-secret
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost/XEPDB1
```

## DB 준비

신규 DB는 아래 순서로 실행합니다.

```sql
@scripts/schema.sql
@scripts/sample-data.sql
```

기존 DB를 유지한다면 보강용 마이그레이션을 실행합니다.

```sql
@scripts/migration.sql
```

현재 회원가입 기능은 `LOGIN.PHONE` 컬럼을 사용합니다. 기존 DB에 컬럼이 없다면 추가합니다.

```sql
ALTER TABLE LOGIN ADD (PHONE VARCHAR2(30));
```

## 실행

```powershell
npm start
```

개발 중 자동 재시작이 필요하면:

```powershell
npm run dev
```

기본 접속:

```text
http://localhost:3000/
```

루트 주소는 `/bbs`로 이동합니다.

## 검증 명령

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

## 수동 테스트 체크리스트

1. `/` 접속 시 `/bbs`로 이동
2. 회원가입 아이디 중복확인, 전화번호 자동 하이픈 입력, 가입 저장
3. 로그인 후 상단 사용자 이름과 내 정보 표시 확인
4. 게시글 작성 시 작성자 입력 없이 로그인 사용자 이름 저장
5. 목록 검색, 정렬, 페이지당 표시 개수, 페이징 확인
6. 목록 번호가 비활성 글 제외 기준으로 자연스럽게 표시되는지 확인
7. 상세 화면 수정/삭제 modal 확인
8. 댓글, 대댓글, 좋아요/싫어요, 파일 업로드/다운로드 확인

## 주요 문서

| 문서 | 용도 |
| --- | --- |
| `DESIGN.md` | Linear 디자인 가이드 |
| `docs/requirements_summary.md` | 과제 요구사항과 현재 충족 상태 |
| `docs/progress_report.md` | 진행 보고서 |
| `docs/architecture.md` | 실행 구조와 라우팅 흐름 |
| `docs/schema_summary.md` | OracleDB 테이블/컬럼 요약 |
| `docs/test_plan.md` | 수동 테스트 기준 |
| `docs/security_report.md` | 보안 보강 내용 |
| `docs/change_log.md` | 변경 이력 |

## 남은 개선 후보

- 댓글 수정 기능
- 관리자 기능
- CSRF 방어
- 회원정보 수정 화면의 PHONE 수정 연동
- 자동화 테스트 추가
- 업로드 파일 물리 삭제 정책 정리
