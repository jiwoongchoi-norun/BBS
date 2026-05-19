# BBS 게시판 과제 프로젝트

최종 업데이트: 2026-05-19

Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트이다. 교수님 PPT 요구사항의 기본 게시판 흐름을 충족하고, 보안/사용성 개선 기능을 가산점 후보로 반영했다.

## 현재 상태

필수 기능은 구현 완료 상태이다.

- 게시글 목록, 글쓰기, 글읽기, 글수정, 글삭제
- 검색, 정렬, 페이징, 페이지 크기 선택, 내 글만 보기
- 로그인, 로그아웃, 회원가입, ID 찾기, 비밀번호 재설정, 회원정보 수정, 회원 탈퇴
- 세션 처리, bcrypt 비밀번호 암호화, 기존 SHA-512 계정 자동 전환
- 조회수, 댓글, 대댓글, 댓글 수정/삭제
- 좋아요/싫어요
- 파일 업로드/다운로드
- SQL Injection 완화, CSRF 방어, 작성자 권한 체크, 입력값 검증

## 문서 구조

| 문서                           | 용도                                                 |
| ------------------------------ | ---------------------------------------------------- |
| `docs/requirements_summary.md` | 과제 요구사항과 구현 상태                            |
| `docs/architecture.md`         | 서버 구조, 라우트, 보안 흐름                         |
| `docs/schema_summary.md`       | OracleDB 테이블, 관계, 스크립트 기준                 |
| `docs/test_plan.md`            | 제출 전 명령어/수동/보안 테스트                      |
| `docs/maintenance_report.md`   | 서버 분석, 유지보수 보고서, backlog, 재사용 프롬프트 |
| `docs/change_log.md`           | 변경 이력                                            |
| `docs/troubleshooting.md`      | 문제 해결 메모                                       |
| `docs/notion-sync.md`          | Notion 동기화 설정                                   |
| `DESIGN.md`                    | UI 디자인 참고 자료                                  |

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

## 설치

```powershell
npm install
```

`.env.example`을 참고해 `.env`를 작성한다. 실제 비밀번호와 secret은 문서나 Git에 기록하지 않는다.

```env
PORT=3000
SESSION_SECRET=change-this-session-secret
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost/XEPDB1
```

## DB 준비

신규 DB:

```sql
@scripts/schema.sql
@scripts/sample-data.sql
```

기존 DB 보강:

```sql
@scripts/migration.sql
```

## 실행

```powershell
npm start
```

개발 모드:

```powershell
npm run dev
```

브라우저에서 접속:

```text
http://localhost:3000/bbs/list
```

## 검증

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

상세 수동 테스트는 `docs/test_plan.md`를 기준으로 진행한다.

## 주요 라우트

| Method   | Path                                                        | 기능              |
| -------- | ----------------------------------------------------------- | ----------------- |
| GET      | `/bbs/list`                                                 | 게시글 목록       |
| GET      | `/bbs/search`                                               | 검색              |
| GET      | `/bbs/read`                                                 | 게시글 상세       |
| GET/POST | `/bbs/form`, `/bbs/save`                                    | 글쓰기            |
| GET/POST | `/bbs/update`, `/bbs/updatesave`                            | 글수정            |
| GET      | `/bbs/delete`                                               | 글삭제            |
| GET/POST | `/bbs/login`, `/bbs/logincheck`                             | 로그인            |
| GET      | `/bbs/logout`                                               | 로그아웃          |
| GET/POST | `/bbs/signup`, `/bbs/signupsave`                            | 회원가입          |
| GET/POST | `/bbs/find-id`                                              | ID 찾기           |
| GET/POST | `/bbs/reset-password/*`                                     | 비밀번호 재설정   |
| GET/POST | `/bbs/updatesignup`, `/bbs/updatesignsave`                  | 회원정보 수정     |
| POST     | `/bbs/withdraw`                                             | 회원 탈퇴         |
| POST     | `/bbs/wsave`, `/bbs/wreply`, `/bbs/wupdate`, `/bbs/wdelete` | 댓글/대댓글       |
| POST     | `/bbs/reaction`                                             | 좋아요/싫어요     |
| GET      | `/bbs/download`                                             | 첨부파일 다운로드 |

## 제출 전 체크

1. OracleDB 스키마 적용 확인
2. `.env` 설정 확인
3. `npm run verify:app`
4. `npm run lint`
5. `npm run format:check`
6. 게시글 CRUD, 검색, 페이징, 로그인, 회원가입, 댓글, 파일 업로드/다운로드 수동 테스트
7. 권한 없는 수정/삭제, 차단 확장자 업로드, 잘못된 파라미터 보안 테스트

## 남은 개선 후보

- 자동화 테스트 확대
- transaction 경계 정리
- 관리자 기능
- 계정 잠금 정책과 감사 로그
- 업로드 파일 삭제 실패 재처리
