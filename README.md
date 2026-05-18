# BBS 게시판 프로젝트

Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트입니다. 교수님 PPT 요구사항의 기본 게시판 흐름을 충족하고, 보안/사용성/디자인 개선 기능을 추가했습니다.

## 현재 구현 상태

게시글 CRUD, 검색, 페이징, 조회수, 로그인/로그아웃, 아이디 찾기, 회원가입, 회원정보 수정, 회원 탈퇴, 댓글/대댓글, 좋아요/싫어요, 파일 업로드/다운로드가 동작합니다. 목록 화면은 검색/정렬/페이지당 표시 개수 선택, 내 글만 보기, 댓글 수 표시를 지원하며, 비활성 글은 제외하고 현재 조회 결과 기준의 표시용 번호를 보여줍니다.

UI는 Bootstrap 5를 기반으로 하되 `DESIGN.md`의 Linear 디자인 가이드를 밝은 게시판 화면에 맞게 재해석한 커스텀 CSS를 적용했습니다.

## 기술 스택

| 구분      | 사용 기술                              |
| --------- | -------------------------------------- |
| Runtime   | Node.js                                |
| Framework | Express                                |
| Template  | EJS                                    |
| Database  | OracleDB XE                            |
| Session   | express-session                        |
| Upload    | multer                                 |
| Password  | bcrypt, legacy SHA-512 + salt fallback |
| UI        | Bootstrap 5, custom CSS                |
| Tooling   | ESLint, Prettier, nodemon              |

## 주요 기능

| 기능                      | 상태 | 주요 경로                                 |
| ------------------------- | ---- | ----------------------------------------- |
| 게시글 목록               | 완료 | `GET /bbs/list`                           |
| 게시글 검색               | 완료 | `GET /bbs/search`                         |
| 조회수/좋아요/작성일 정렬 | 완료 | `sort`, `order` query                     |
| 페이지당 표시 개수        | 완료 | `pageSize=10/20/30/50`                    |
| 게시글 작성               | 완료 | `GET /bbs/form`, `POST /bbs/save`         |
| 작성자 자동 처리          | 완료 | 로그인 사용자 이름 저장                   |
| 게시글 읽기               | 완료 | `GET /bbs/read?brdno={no}`                |
| 게시글 수정               | 완료 | `GET /bbs/update`, `POST /bbs/updatesave` |
| 게시글 삭제               | 완료 | `GET /bbs/delete`, soft delete            |
| 수정/삭제 확인 modal      | 완료 | `views/bbs/read.ejs`                      |
| 로그인/로그아웃           | 완료 | `POST /bbs/logincheck`, `GET /bbs/logout` |
| 상단 사용자 이름 표시     | 완료 | `views/bbs/partials/nav.ejs`              |
| 아이디 찾기               | 완료 | `GET/POST /bbs/find-id`                   |
| 내 정보 페이지            | 완료 | `GET /bbs/myinfo`                         |
| 회원 탈퇴                 | 완료 | `POST /bbs/withdraw`                      |
| 회원가입                  | 완료 | `POST /bbs/signupsave`                    |
| 아이디 중복확인           | 완료 | `GET /bbs/check-id`                       |
| 전화번호 입력/저장        | 완료 | `LOGIN.PHONE`                             |
| 회원정보 수정             | 완료 | `POST /bbs/updatesignsave`                |
| 댓글                      | 완료 | `POST /bbs/wsave`                         |
| 대댓글                    | 완료 | `POST /bbs/wreply`                        |
| 댓글 수정                 | 완료 | `POST /bbs/wupdate`                       |
| 댓글 삭제                 | 완료 | `POST /bbs/wdelete`                       |
| 좋아요/싫어요             | 완료 | `POST /bbs/reaction`                      |
| 파일 업로드               | 완료 | `POST /bbs/save`                          |
| 파일 다운로드             | 완료 | `GET /bbs/download`                       |
| 루트 접속 redirect        | 완료 | `GET /` -> `/bbs`                         |

## 제출용 추가 기능 정리

| 추가 기능              | 구현 상태 | 구현 내용                                                                                                                                                            | 관련 파일                                                                                           |
| ---------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| bcrypt 비밀번호 암호화 | 완료      | 신규 회원가입과 회원정보 수정 시 bcrypt 해시로 비밀번호를 저장한다. 기존 SHA-512 + salt 계정은 로그인 성공 시 bcrypt 방식으로 전환되도록 처리했다.                   | `routes/bbs.js`, `LOGIN`                                                                            |
| 작성자 권한 체크       | 완료      | 게시글 수정/삭제와 댓글 수정/삭제에서 로그인 사용자와 작성자를 비교한다. 권한이 없으면 수정/삭제가 진행되지 않도록 처리했다.                                         | `routes/bbs.js`, `views/bbs/read.ejs`                                                               |
| Notion Sync            | 완료      | `docs/**/*.md` 변경이 `main` 브랜치에 push되면 GitHub Actions가 Notion API로 지정 페이지 아래에 문서를 동기화한다. 토큰과 페이지 ID는 GitHub Secrets로 관리한다.     | `scripts/sync-notion.js`, `.github/workflows/sync-notion.yml`, `docs/notion-sync.md`                |
| 아이디 찾기            | 완료      | 이름과 이메일로 활성 계정을 조회해 가입 ID를 보여준다. 이미 로그인한 사용자는 목록으로 돌려보낸다.                                                                   | `routes/bbs.js`, `views/bbs/findid.ejs`, `views/bbs/login.ejs`                                      |
| 회원 탈퇴              | 완료      | 내 정보 화면에서 비밀번호와 확인 문구를 받은 뒤 `LOGIN.OK = 0`으로 비활성화하고 세션을 종료한다. 탈퇴 계정은 로그인에서 차단한다.                                    | `routes/bbs.js`, `views/bbs/myinfo.ejs`, `LOGIN.OK`                                                 |
| 내 글만 보기           | 완료      | 로그인 사용자가 목록/검색에서 `mine=1`로 본인 작성글만 볼 수 있고, 검색/정렬/페이징 상태를 유지한다.                                                                 | `routes/bbs.js`, `views/bbs/list.ejs`                                                               |
| 목록 댓글 수           | 완료      | 게시글 제목 옆에 활성 댓글/대댓글 수를 `[n]` 형식으로 표시한다.                                                                                                      | `routes/bbs.js`, `views/bbs/list.ejs`, `BBSW`                                                       |
| 댓글 수정              | 완료      | 본인이 작성한 댓글에만 수정 버튼을 표시하고, `POST /bbs/wupdate`에서 작성자 검증 후 댓글 내용을 수정한다.                                                            | `routes/bbs.js`, `views/bbs/read.ejs`, `BBSW`                                                       |
| 댓글 삭제              | 완료      | POST 요청과 삭제 확인 modal을 사용한다. 실제 행 삭제가 아니라 `BBSW.OK = 0`으로 soft delete 처리한다.                                                                | `routes/bbs.js`, `views/bbs/read.ejs`, `BBSW`                                                       |
| 좋아요/싫어요          | 완료      | 게시글별 사용자 반응을 `BBS_REACTION`에 저장하고, `BBS.LIKE_COUNT`, `BBS.DISLIKE_COUNT`를 갱신한다. 같은 버튼 재클릭 시 취소, 반대 버튼 클릭 시 전환된다.            | `routes/bbs.js`, `views/bbs/read.ejs`, `BBS`, `BBS_REACTION`                                        |
| 파일 업로드            | 완료      | 글 작성 시 `multer`로 파일을 저장하고 `BBS_FILE`에 원본명, 저장명, 경로, 크기, MIME 타입을 기록한다. 상세/수정 화면에서 기존 첨부파일을 확인하고 다운로드할 수 있다. | `routes/bbs.js`, `views/bbs/form.ejs`, `views/bbs/read.ejs`, `views/bbs/updateform.ejs`, `BBS_FILE` |
| 대댓글                 | 완료      | `BBSW.PARENT_NO`, `DEPTH`를 사용해 댓글과 답글을 연결하고, 상세 화면에서 들여쓰기와 배지로 일반 댓글/답글을 구분한다.                                                | `routes/bbs.js`, `views/bbs/read.ejs`, `BBSW`                                                       |

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

현재 회원가입과 회원 탈퇴 기능은 `LOGIN.PHONE`, `LOGIN.OK` 컬럼을 사용합니다. 기존 DB에 컬럼이 없다면 `scripts/migration.sql`을 적용하거나 아래처럼 추가합니다.

```sql
ALTER TABLE LOGIN ADD (PHONE VARCHAR2(30));
ALTER TABLE LOGIN ADD (OK NUMBER(1) DEFAULT 1 NOT NULL);
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
3. 아이디 찾기에서 이름/이메일로 ID 조회 확인
4. 로그인 후 상단 사용자 이름과 내 정보 표시 확인
5. 내 정보에서 비밀번호와 확인 문구로 회원 탈퇴 처리 확인
6. 게시글 작성 시 작성자 입력 없이 로그인 사용자 이름 저장
7. 목록 내 글만 보기, 댓글 수, 검색, 정렬, 페이지당 표시 개수, 페이징 확인
8. 목록 번호가 비활성 글 제외 기준으로 자연스럽게 표시되는지 확인
9. 상세 화면 수정/삭제 modal과 첨부파일 크기 표시 확인
10. 댓글, 댓글 수정/삭제, 대댓글, 좋아요/싫어요, 파일 업로드/다운로드 확인

## 주요 문서

| 문서                           | 용도                           |
| ------------------------------ | ------------------------------ |
| `DESIGN.md`                    | Linear 디자인 가이드           |
| `docs/requirements_summary.md` | 과제 요구사항과 현재 충족 상태 |
| `docs/progress_report.md`      | 진행 보고서                    |
| `docs/architecture.md`         | 실행 구조와 라우팅 흐름        |
| `docs/schema_summary.md`       | OracleDB 테이블/컬럼 요약      |
| `docs/test_plan.md`            | 수동 테스트 기준               |
| `docs/security_report.md`      | 보안 보강 내용                 |
| `docs/change_log.md`           | 변경 이력                      |

## 남은 개선 후보

- 관리자 기능
- CSRF 방어
- 회원정보 수정 화면의 PHONE 수정 연동
- 자동화 테스트 추가
- 업로드 파일 물리 삭제 정책 정리
