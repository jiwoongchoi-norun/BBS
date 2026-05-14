# Change Log

## 2026-05-14

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
