# BBS 게시판 프로젝트

Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트입니다. 교수님 PPT 요구사항의 기본 게시판 흐름을 우선 충족하고, 추가 점수 후보인 bcrypt, 파일업로드, 댓글/대댓글, 좋아요/싫어요, SQL bind variable 적용까지 보강했습니다.

## 현재 상태

현재 구현 기준으로 게시글 CRUD, 검색, 페이징, 조회수, 로그인/로그아웃, 회원가입, 회원정보 수정, bcrypt 비밀번호 저장, 기존 SHA-512 + salt 계정 자동 bcrypt 마이그레이션, 댓글/대댓글, 댓글 삭제, 게시글 좋아요/싫어요, 파일 업로드/다운로드가 동작합니다.

좋아요/싫어요를 누른 뒤 읽기 화면으로 돌아오는 내부 이동은 조회수를 올리지 않도록 처리했습니다. 일반적으로 목록에서 게시글을 클릭해 읽는 경우에는 조회수가 증가합니다.

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

## 구현 기능

| 기능                     | 상태 | 주요 경로                                 |
| ------------------------ | ---- | ----------------------------------------- |
| 게시글 목록              | 완료 | `GET /bbs/list`                           |
| 게시글 검색              | 완료 | `GET /bbs/search`                         |
| 게시글 작성              | 완료 | `GET /bbs/form`, `POST /bbs/save`         |
| 게시글 읽기              | 완료 | `GET /bbs/read?brdno={no}`                |
| 게시글 수정              | 완료 | `GET /bbs/update`, `POST /bbs/updatesave` |
| 게시글 삭제              | 완료 | `GET /bbs/delete`, soft delete            |
| 조회수                   | 완료 | `BBS.VIEW_COUNT`                          |
| 로그인/로그아웃          | 완료 | `POST /bbs/logincheck`, `GET /bbs/logout` |
| 회원가입                 | 완료 | `POST /bbs/signupsave`                    |
| 회원정보 수정            | 완료 | `POST /bbs/updatesignsave`                |
| bcrypt 저장              | 완료 | 신규/수정 비밀번호 bcrypt 저장            |
| legacy 계정 마이그레이션 | 완료 | SHA-512 로그인 성공 시 bcrypt 재저장      |
| 댓글                     | 완료 | `POST /bbs/wsave`                         |
| 대댓글                   | 완료 | `POST /bbs/wreply`                        |
| 댓글 삭제                | 완료 | `GET /bbs/wdelete`                        |
| 좋아요/싫어요            | 완료 | `POST /bbs/reaction`                      |
| 파일 업로드              | 완료 | `POST /bbs/save`                          |
| 파일 다운로드            | 완료 | `GET /bbs/download`                       |

## 설치

```powershell
npm install
```

`.env.example`을 참고해 `.env`를 작성합니다.

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

기존 DB를 유지하면서 보강할 때는 통합 마이그레이션을 실행합니다.

```sql
@scripts/migration.sql
```

되돌림 검토용 스크립트는 아래 파일입니다. 데이터 삭제나 DROP TABLE은 하지 않도록 작성되어 있습니다.

```sql
@scripts/rollback.sql
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
http://localhost:3000/bbs/list
```

## 검증 명령

```powershell
npm run lint
npm run format:check
npm run verify:app
```

선택 검증:

```powershell
npm run audit
npm run security:secrets
npm run security:semgrep
```

## 주요 문서

| 문서                           | 용도                           |
| ------------------------------ | ------------------------------ |
| `docs/requirements_summary.md` | 과제 요구사항과 현재 충족 상태 |
| `docs/progress_report.md`      | 진행 보고서                    |
| `docs/architecture.md`         | 실행 구조와 라우터 흐름        |
| `docs/schema_summary.md`       | OracleDB 테이블/컬럼 요약      |
| `docs/test_plan.md`            | 수동 테스트와 제출 캡처 기준   |
| `docs/security_report.md`      | 보안 보강 내용                 |
| `docs/code_review_guide.md`    | 코드 리뷰와 공부 순서          |
| `docs/change_log.md`           | 변경 이력                      |

## 코드 리뷰 추천 순서

1. `app.js`에서 Express, session, router 연결 확인
2. `config/dbconfig.js`에서 OracleDB 접속 설정 확인
3. `routes/bbs.js` 상단 helper 함수 확인
4. 로그인/회원가입 라우터 확인
5. 목록/검색/읽기/작성/수정/삭제 라우터 확인
6. 댓글/대댓글 라우터 확인
7. 좋아요/싫어요 라우터와 조회수 예외 처리 확인
8. 파일 업로드/다운로드 라우터 확인
9. `views/bbs/*.ejs`에서 화면 표시 방식 확인
10. `scripts/schema.sql`, `scripts/migration.sql`로 DB 구조 확인

## 남은 개선 후보

- 댓글 수정 기능
- 관리자 기능
- CSRF 방어
- 업로드 파일 물리 삭제 정책 정리
- 자동화 테스트 추가
