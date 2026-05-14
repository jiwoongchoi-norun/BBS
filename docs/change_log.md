# Change Log

## 2026-05-15

### bcrypt 및 추천 기능 보강

- 신규 회원가입과 회원정보 수정 비밀번호 저장을 bcrypt로 전환했다.
- 기존 SHA-512 + salt 계정은 로그인 성공 시 bcrypt로 자동 마이그레이션되도록 처리했다.
- `LOGIN.PASSWORD_ALGO`, `LOGIN.PASSWORD_UPDATED_AT` 기반 해시 버전 관리를 반영했다.
- 게시글 좋아요/싫어요 기능을 추가했다.
- `BBS_REACTION` 기록 테이블로 동일 사용자 중복 추천을 방지했다.
- 같은 추천을 다시 누르면 취소되고, 반대 추천을 누르면 전환되도록 구현했다.
- 목록/상세 화면에 좋아요/싫어요 count를 표시했다.
- 기존 DB 통합 보강용 `scripts/migration.sql`과 비파괴 `scripts/rollback.sql`을 추가했다.
- `docs/schema_summary.md`와 `docs/password_hash_test.md`를 최신화했다.

### 기능 보강

- 목록과 검색 결과에 페이징을 추가했다.
- 댓글 작성 기능을 추가했다.
- 대댓글 작성 기능을 추가했다.
- 본인 댓글 삭제 기능을 추가했다.
- 파일 업로드 기능을 추가했다.
- 첨부파일 목록과 다운로드 기능을 추가했다.
- 회원정보 수정 화면에서 기존 비밀번호를 노출하지 않도록 변경했다.

### 보안 보강

- 로그인, 회원가입, 회원정보 수정, 게시글 CRUD, 검색, 댓글, 대댓글, 다운로드 쿼리에 Oracle bind variable을 적용했다.
- 숫자 파라미터 검증을 추가했다.
- 검색 컬럼 allowlist를 적용했다.
- 게시글 수정/삭제에 작성자 권한 체크를 추가했다.
- 댓글 삭제에 작성자 권한 체크를 추가했다.
- 파일 업로드 확장자 allowlist와 차단 확장자 목록을 추가했다.
- 파일 업로드 크기를 10MB로 제한했다.
- 회원가입/회원정보 수정 입력값 검증을 강화했다.

### DB 스크립트

- `LOGIN.SALT`를 `scripts/schema.sql`에 반영했다.
- `BBSW` 댓글 테이블과 `BBSW_SEQ`를 `scripts/schema.sql`에 반영했다.
- `BBS_FILE` 파일 테이블과 `BBS_FILE_SEQ`를 `scripts/schema.sql`에 반영했다.
- 기존 DB 보강용 `scripts/add-login-salt.sql`을 추가했다.
- 기존 DB 보강용 `scripts/add-bbsw.sql`을 추가했다.
- 기존 DB 보강용 `scripts/add-bbs-file.sql`을 추가했다.
- `scripts/sample-data.sql`의 기본 계정을 SHA-512 + salt 해시 예시로 변경했다.

### 문서

- `README.md`를 현재 구현 상태 기준으로 다시 정리했다.
- `docs/requirements_summary.md`를 필수 기능 충족 현황 기준으로 갱신했다.
- `docs/progress_report.md`를 현재 코드 기준으로 갱신했다.
- `docs/change_log.md`를 최신 변경 이력 기준으로 갱신했다.
- `docs/todo.md`와 `docs/test_plan.md`를 제출 전 작업 기준으로 갱신했다.

## 2026-05-14

### 교수님 최종본 비교 분석

- `C:\BBS\BBS\BBS_pro_Ver`의 최종 프로젝트 파일과 현재 프로젝트를 비교했다.
- 비교 범위는 `app.js`, `routes/bbs.js`, `routes/index.js`, `views/bbs/*.ejs`, DB 생성 SQL, session 설정, crypto/hash 코드, OracleDB query 구조였다.
- 현재 프로젝트에 이미 구현된 CRUD, 검색, 인증, 세션, 조회수, Bootstrap UI를 완료 항목으로 확정했다.
- 교수님 최종본에 있고 현재 프로젝트에 부족했던 페이징, `BBSW` 댓글 테이블, 댓글 작성, `LOGIN.SALT` 기반 로그인 검증, 조회수 처리 방식을 TODO로 정리했다.
- 파일 업로드는 별도 구현 필요 항목으로 표시했다.

### 문서 최신화

- `README.md`를 실제 코드 기준으로 작성했다.
- `NOTION.md`를 현재 진행 상황, TODO, 보안 개선 계획 중심으로 정리했다.
- `docs/architecture.md`, `docs/security_notes.md`, `docs/test_plan.md`, `docs/troubleshooting.md`를 추가했다.
- 기존 `docs/*.md` 내용을 현재 구현 상태와 맞게 갱신했다.

### 개발환경 자동화

- ESLint 설정을 추가했다.
- Prettier 설정을 추가했다.
- npm scripts를 정리했다.
- VSCode 권장 확장, Express debug config, 검색 제외 설정을 추가했다.

### 기능 변경

- `BBS.VIEW_COUNT` 컬럼을 스키마에 추가했다.
- 기존 DB용 `scripts/add-view-count.sql`을 추가했다.
- 게시글 상세 조회 시 조회수가 증가하도록 처리했다.
- 목록과 상세 화면에 조회수를 표시했다.

### 검증

- `npm run lint` 통과
- `npm run verify:app` 통과
- 수정한 문서/설정 파일 Prettier check 통과

## 남은 주요 변경 예정

- 댓글 수정
- 관리자 기능
- 자동화 테스트 추가
