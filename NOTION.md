# BBS 프로젝트 상태 메모

## 현재 진행 상황

현재 프로젝트는 Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트이다. 기본 게시판 CRUD, 검색, 회원가입, 로그인, 로그아웃, 회원정보 수정, 세션 처리, 조회수 표시와 증가 기능이 코드에 존재한다.

과제 요구사항 중 댓글, 파일 업로드, 페이징, 비밀번호 암호화는 아직 완료되지 않았다. bcrypt와 multer는 설치되어 있지만 실제 기능 라우트에는 적용되지 않았다. 회원가입에는 SHA-512 + salt 코드가 일부 들어가 있으나 로그인 검증과 회원정보 수정 흐름이 일관되지 않아 암호화 기능은 완료로 보지 않는다.

## 2026-05-14 교수님 최종본 비교 결과

교수님 최종 프로젝트는 `C:\BBS\BBS\BBS_pro_Ver`에 있으며, 현재 프로젝트와 핵심 라우트/뷰/SQL을 비교했다. 교수님 최종본 코드는 그대로 복사하지 않고 기능 차이와 DB 구조 차이만 작업 기준으로 정리한다.

### 현재 프로젝트에 이미 구현된 기능

- 게시글 목록, 작성, 조회, 수정, soft delete
- 제목/작성자/내용/제목+내용 검색
- 로그인, 로그아웃, 회원가입, 회원정보 수정
- `req.session.user` 기반 세션 처리
- `VIEW_COUNT` 조회수 증가 및 표시
- Bootstrap 5 partial 기반 UI
- `.env` 기반 DB 설정과 `SESSION_SECRET` 필수화

### 교수님 최종본에 있고 현재 프로젝트에 부족한 기능

- 페이징: 교수님 최종본은 `currentPage`, `pageSize=5`, `OFFSET ... FETCH NEXT` 방식으로 구현한다.
- 댓글: 교수님 최종본은 `BBSW` 테이블, `BBSW_SEQ`, `/bbs/wsave`, 상세 화면 댓글 목록을 사용한다.
- 비밀번호 검증: 교수님 최종본은 `LOGIN.SALT`를 조회해 SHA-512 + salt로 로그인 검증한다.
- 조회수 방식: 교수님 최종본은 `COUNT` 컬럼과 `/bbs/read_count` 라우트를 사용한다.
- 댓글 부가 기능: 상세 화면에 좋아요/싫어요/댓글쓰기/댓글지우기 링크가 있으나 실제 라우트 구현은 확인되지 않아 완성 기능으로 보지 않는다.

### 현재 프로젝트가 교수님 최종본과 다른 부분

- 현재 프로젝트는 DB 접속 정보를 `config/dbconfig.js`와 `.env`로 분리했지만 교수님 최종본은 라우트 내부 하드코딩이다.
- 현재 프로젝트는 세션 secret을 환경변수로 강제하지만 교수님 최종본은 `"Session-Key"` 하드코딩이다.
- 현재 프로젝트는 `VIEW_COUNT` 컬럼을 사용하지만 교수님 최종본은 `COUNT` 컬럼을 사용한다.
- 현재 프로젝트는 `views/bbs/partials/head.ejs`, `nav.ejs`로 Bootstrap UI를 분리했지만 교수님 최종본은 각 EJS에 직접 HTML을 작성한다.
- 현재 프로젝트는 활성 글만 목록/상세/수정에서 조회하도록 `OK=1` 조건을 더 많이 적용한다.

### 다음 작업 우선순위

1. `scripts/schema.sql`에 교수님 최종본 기준 `LOGIN.SALT`, `BBSW`, `BBSW_SEQ` 반영
2. 비밀번호 저장/로그인 검증을 bcrypt 또는 SHA-512 + salt 중 하나로 일관화
3. 페이징 구현
4. 댓글 작성/목록 구현
5. 파일 업로드/다운로드 구현
6. 작성자 권한 체크와 SQL bind variable 적용

### Codex 작업 계획

다음 단계부터는 한 번에 한 기능만 반영한다. 우선 DB 제출 SQL을 확정한 뒤, 인증 암호화 정합성, 페이징, 댓글, 파일 업로드 순서로 코드 작업을 진행한다.

## 최근 작업 내용

- ESLint, Prettier 설정 추가
- `npm run lint`, `npm run format:check`, `npm run audit`, `npm run verify:app` 검증 루틴 추가
- 선택 보안 검사 명령 추가
  - `npm run security:secrets`
  - `npm run security:semgrep`
- VSCode 설정 추가
  - 권장 확장
  - `Debug Express` launch config
  - format on save, search exclude
- `SESSION_SECRET` 환경변수 필수화
- DB 접속 정보 `.env` 분리
- 게시글 조회수 컬럼 `VIEW_COUNT` 추가
- 게시글 상세 조회 시 조회수 증가 처리 추가
- 목록/상세 화면에 조회수 표시 추가
- 기존 DB에 조회수 컬럼을 추가하기 위한 `scripts/add-view-count.sql` 추가
- 프로젝트 문서 최신화

## 주요 오류 및 해결 내용

| 문제                                    | 원인                                               | 해결                                                       |
| --------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `SESSION_SECRET` 누락 시 앱 실행 불안정 | 세션 secret 하드코딩 제거 후 환경변수 필요         | `app.js`에서 누락 시 명시적으로 throw                      |
| DB 환경변수 누락                        | `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` 필요 | `config/dbconfig.js`에서 필수값 검증                       |
| ESLint 실패                             | 사용하지 않는 콜백 인자 다수                       | 미사용 인자 제거 및 `_next` 처리                           |
| 조회수 컬럼 없음                        | 기존 `BBS` 테이블에는 조회수 구조가 없었음         | `schema.sql`, `add-view-count.sql`에 `VIEW_COUNT` 추가     |
| 전체 `format:check` 실패 가능           | 기존 문서/파일 포맷이 섞여 있음                    | 수정 파일 중심으로 Prettier 적용, 전체 포맷은 제출 전 정리 |
| Windows PowerShell 출력 한글 깨짐 가능  | 콘솔 인코딩 표시 문제                              | 파일은 UTF-8 기준으로 관리, 문서/뷰 수정 시 UTF-8 유지     |

## 현재 구현됨

- 게시글 목록
- 게시글 작성
- 게시글 상세 조회
- 게시글 수정
- 게시글 soft delete
- 제목/작성자/내용/제목+내용 검색
- 조회수 증가 및 표시
- 로그인
- 로그아웃
- 회원가입
- 회원정보 수정
- 세션 처리
- EJS 기반 화면 구성
- Bootstrap 5 기반 반응형 UI
- `.env` 기반 DB 설정
- `SESSION_SECRET` 환경변수 필수화
- VSCode 디버깅 설정
- Codex 작업 루틴 문서화

## 아직 해야 할 작업

1. bcrypt 비밀번호 암호화 적용
2. 기존 평문 비밀번호 처리 정책 정리
3. Oracle bind variable 적용
4. 페이징 구현
5. 댓글 테이블/라우트/뷰 구현
6. 파일 업로드 구현
7. 작성자 권한 체크
8. 입력값 검증
9. 삭제 요청 POST 전환
10. 자동 테스트 추가
11. 회원가입 아이디 중복 버튼 만들기
12. 제출용 화면 캡처 체크리스트 준비
13. 제출용 소스 압축 제외 목록 점검

## 리팩토링 예정 사항

- `routes/bbs.js`에 인증, 회원, 게시판 기능이 모두 섞여 있으므로 기능별 helper 함수 분리를 검토한다.
- DB 연결/실행/해제 반복 코드가 많으므로 공통 함수화를 검토한다.
- SQL 문자열 결합을 bind variable로 전환하면서 쿼리 작성 패턴을 통일한다.
- Jade 기본 템플릿 파일은 현재 사용하지 않으므로 제출 전 유지 여부를 결정한다.
- 화면의 반복 버튼/레이아웃은 partial 추가를 검토한다.

## 보안 개선 예정 사항

- `bcrypt.hash()`로 회원가입/회원정보 수정 시 비밀번호 저장
- `bcrypt.compare()`로 로그인 검증
- 모든 사용자 입력 SQL을 bind variable로 변경
- `GET /bbs/delete`를 POST 방식으로 변경
- 수정/삭제 시 `req.session.user.id`와 작성자 비교
- session cookie 옵션 명시
  - `httpOnly`
  - `sameSite`
  - 운영 환경에서 `secure`
- 서버 측 입력값 검증 추가
- gitleaks 또는 Semgrep 정기 실행

## Codex 작업 로그 요약

- 프로젝트 루트 `C:\BBS\BBS` 기준으로 작업한다.
- 작업 전 `docs/requirements_summary.md`와 관련 파일만 읽는다.
- `node_modules`, `.git`, `package-lock.json` 세부 diff는 읽지 않는다.
- 한 번에 한 기능만 수정한다.
- 수정 후 기본 검증은 다음 순서로 실행한다.

```powershell
npm run lint
npm run verify:app
```

제출 전 또는 큰 변경 후에는 다음도 실행한다.

```powershell
npm run format:check
npm run audit
```

선택 보안 도구가 설치되어 있으면 다음을 실행한다.

```powershell
npm run security:secrets
npm run security:semgrep
```

## 다음 추천 작업

다음 기능 작업은 `bcrypt 비밀번호 암호화`를 우선한다. 이유는 과제 필수 요구사항이면서 보안 개선 효과가 크고, 이후 SQL bind variable 전환과 함께 인증 영역을 안정화할 수 있기 때문이다.
