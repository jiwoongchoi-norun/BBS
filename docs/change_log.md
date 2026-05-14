# Change Log

## 2026-05-14

### 교수님 최종본 비교 분석

- `C:\BBS\BBS\BBS_pro_Ver`의 최종 프로젝트 파일을 현재 프로젝트와 비교했다.
- 비교 범위는 `app.js`, `routes/bbs.js`, `routes/index.js`, `views/bbs/*.ejs`, DB 생성 SQL, session 설정, crypto/hash 코드, OracleDB query 구조이다.
- 현재 프로젝트에 이미 구현된 CRUD, 검색, 인증, 세션, 조회수, Bootstrap UI를 완료 항목으로 재확인했다.
- 교수님 최종본에 있고 현재 프로젝트에 부족한 페이징, `BBSW` 댓글 테이블/댓글 작성, `LOGIN.SALT` 기반 로그인 검증, `COUNT` 기반 조회수 방식을 TODO로 정리했다.
- 파일 업로드는 교수님 최종본에도 `<input type="file">`만 있고 서버 처리 코드가 없어 별도 구현 필요 항목으로 표시했다.
- 과제 제출 요구사항인 테이블 생성 SQL, 모든 기능 화면 캡처, 소스코드 압축 체크리스트를 문서에 반영했다.

### 문서 최신화

- `README.md`를 실제 코드 기준으로 재작성했다.
- `NOTION.md`를 현재 진행 상황, TODO, 보안 개선 계획 중심으로 정리했다.
- `docs/architecture.md`, `docs/security_notes.md`, `docs/test_plan.md`, `docs/troubleshooting.md`를 추가했다.
- 기존 `docs/*.md` 내용을 현재 구현 상태와 맞게 갱신했다.

### 개발환경 자동화

- ESLint 설정 추가
- Prettier 설정 추가
- npm scripts 정리
  - `lint`
  - `format`
  - `format:check`
  - `audit`
  - `check`
  - `verify:app`
  - `security:secrets`
  - `security:semgrep`
- VSCode 설정 추가
  - 권장 확장
  - Express debug config
  - 검색 제외 설정

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

- bcrypt 비밀번호 암호화 적용
- SQL bind variable 적용
- 페이징 구현
- 댓글 구현
- 파일 업로드 구현
- 작성자 권한 체크
- 자동 테스트 추가
