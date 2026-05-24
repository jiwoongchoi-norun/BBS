# BBS 서버 분석 및 유지보수 보고서

최종 업데이트: 2026-05-25

## 요약

현재 BBS 서버는 과제 필수 요구사항을 충족하며, 주요 가산점 후보인 bcrypt, SQL Injection 방어, 작성자 권한 체크, 댓글 수정/삭제, 대댓글, 좋아요/싫어요, 파일 업로드, CSRF 방어, 입력값 검증까지 반영된 상태이다.

문서 구조는 중복 보고서를 줄이고 다음 기준 문서로 통합한다.

- 요구사항: `docs/requirements_summary.md`
- 서버 구조: `docs/architecture.md`
- DB 구조: `docs/schema_summary.md`
- 검증 절차: `docs/test_plan.md`
- 유지보수 보고서: `docs/maintenance_report.md`
- 변경 이력: `docs/change_log.md`

## 기술 스택

| 구분      | 사용 기술                       |
| --------- | ------------------------------- |
| Runtime   | Node.js                         |
| Framework | Express                         |
| Template  | EJS                             |
| Database  | OracleDB                        |
| Session   | express-session                 |
| Security  | bcrypt, csurf, cookie hardening |
| Upload    | multer                          |
| UI        | Bootstrap 5, custom CSS         |
| Tooling   | ESLint, Prettier, nodemon       |

## 현재 구현 분석

### 강점

- 과제 필수 기능이 대부분 하나의 흐름으로 연결되어 시연하기 쉽다.
- 목록, 검색, 정렬, 페이징, 내 글 보기 등 게시판 사용성이 좋다.
- 신규 비밀번호는 bcrypt로 저장하고 기존 SHA-512 계정도 로그인 성공 시 전환한다.
- SQL에 bind variable과 whitelist를 적용해 주요 Injection 위험을 낮췄다.
- 게시글/댓글/다운로드 권한 체크가 있어 작성자 보호 흐름이 있다.
- CSRF token을 주요 POST form에 적용했다.
- 파일 업로드는 크기, 개수, 확장자, MIME type을 제한한다.
- production 오류 메시지는 일반화되어 내부 오류 노출을 줄인다.

### 구조상 한계

- 5단계에서 `routes/bbs.js`를 feature router 조립 파일로 줄였지만, 기능별 라우트와 repository 변경 시 URL 호환성과 DB 수동 테스트가 여전히 필요하다.
- `oracledb.autoCommit = true` 중심이라 여러 SQL을 하나의 transaction으로 묶는 보장이 약하다.
- 자동화 테스트가 부족해 수동 테스트 의존도가 높다.
- 관리자 기능, 계정 잠금, 감사 로그는 아직 없다.
- reset password는 과제 시연용이며 실제 이메일 발송 기능이 없다.
- 첨부파일 물리 삭제는 best-effort라 실패 기록과 재처리 정책이 없다.

## 보안 상태

| 항목                      | 상태   | 비고                                          |
| ------------------------- | ------ | --------------------------------------------- |
| SQL Injection 방어        | 양호   | bind variable, 숫자 검증, 검색/정렬 whitelist |
| 비밀번호 평문 저장 방지   | 양호   | bcrypt 사용, legacy 자동 전환                 |
| 세션 secret 하드코딩 제거 | 양호   | `SESSION_SECRET` 필수                         |
| 세션 cookie 보호          | 양호   | `httpOnly`, `sameSite=lax`, production secure |
| XSS 출력 방어             | 양호   | 사용자 입력은 EJS escaped output 사용         |
| CSRF 방어                 | 양호   | `/bbs` POST form 적용                         |
| 권한 체크                 | 양호   | 게시글/댓글/첨부 다운로드 작성자 검증         |
| 파일 업로드 제한          | 양호   | 1개, 10MB, 확장자/MIME allowlist              |
| 오류 메시지 노출          | 개선됨 | production generic message                    |
| 계정 잠금/감사 로그       | 미구현 | 추가 개선 후보                                |

## 운영 및 유지보수 절차

### 로컬 실행

```powershell
npm install
npm start
```

개발 모드:

```powershell
npm run dev
```

검증:

```powershell
npm run verify:app
npm run lint
npm run format:check
```

### DB 변경 절차

1. 신규 환경이면 `scripts/schema.sql` 실행
2. 시연 데이터가 필요하면 `scripts/sample-data.sql` 실행
3. 기존 환경이면 `scripts/migration.sql` 실행
4. 변경 후 `docs/schema_summary.md` 갱신
5. 관련 기능을 `docs/test_plan.md` 기준으로 수동 확인

### 문서 유지보수 규칙

- 새 기능이 추가되면 `requirements_summary.md`와 `test_plan.md`를 먼저 갱신한다.
- DB가 바뀌면 `schema_summary.md`와 `migration.sql`을 함께 확인한다.
- 보안 또는 운영상 의미 있는 변경은 이 보고서와 `change_log.md`에 남긴다.
- 같은 주제의 별도 보고서를 새로 만들기보다 이 문서의 섹션으로 추가한다.

## 우선순위별 개선 backlog

| 우선순위 | 작업                                                | 이유                                     |
| -------- | --------------------------------------------------- | ---------------------------------------- |
| P1       | 핵심 route 자동화 테스트 추가                       | 제출 전 회귀 위험 감소                   |
| P1       | 게시글 저장 + 파일 메타데이터 저장 transaction 정리 | DB/파일 상태 불일치 완화                 |
| P2       | 계정 잠금 정책                                      | 반복 로그인 실패 방어                    |
| P2       | 관리자 기능                                         | 가산점 후보, 운영 편의                   |
| P2       | 감사 로그                                           | 탈퇴, 삭제, 다운로드 같은 민감 작업 추적 |
| P3       | 분리된 feature router의 자동화 테스트 추가          | route split 이후 회귀 위험 감소          |
| P3       | 업로드 파일 삭제 실패 재처리                        | 물리 파일 정리 안정화                    |

## 교수님 제출 관점 체크

- 필수 기능은 코드 기준 구현 완료 상태로 정리되어 있으며, 수동 테스트 성공 여부는 `docs/manual_test_result.md`에서 별도로 확인한다.
- 보안 개선은 가산점 항목으로 설명 가능하다.
- 시연 순서는 회원가입 -> 로그인 -> 글쓰기/파일첨부 -> 목록/검색/페이징 -> 상세/댓글/추천 -> 수정/삭제 -> 회원정보 수정/탈퇴가 자연스럽다.
- 실패 케이스는 권한 없는 수정/삭제, 차단 확장자 업로드, CSRF/잘못된 파라미터 차단을 짧게 보여주면 된다.

## 유지보수용 Codex 프롬프트

아래 프롬프트는 다음 작업을 맡길 때 그대로 사용할 수 있다.

```text
C:\BBS\BBS 프로젝트에서 작업해줘.
먼저 AGENTS.md와 docs/requirements_summary.md를 읽고, 필요한 관련 파일만 확인해.
node_modules, .git, package-lock.json 세부 diff, .env 전체 내용은 읽지 마.
한 번에 한 기능만 수정하고 대규모 리팩토링은 피한다.
수정 전에는 짧은 분석과 작업 계획을 먼저 말해줘.
수정 후에는 변경 파일 목록, 수정 이유, 테스트 방법만 요약해줘.
과제 요구사항 충족을 우선하고, SQL Injection, bcrypt, 세션 secret, 작성자 권한, CSRF, 파일 업로드 제한은 유지해야 한다.
```
