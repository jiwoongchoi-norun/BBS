# BBS 프로젝트 상태 메모

## 현재 진행 상황

현재 프로젝트는 Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트이다. 기본 게시판 CRUD, 검색, 회원가입, 로그인, 로그아웃, 회원정보 수정, 세션 처리, 조회수 표시와 증가 기능이 코드에 존재한다.

과제 요구사항 중 댓글, 파일 업로드, 페이징, 비밀번호 암호화는 아직 완료되지 않았다. bcrypt와 multer는 설치되어 있지만 실제 기능 라우트에는 적용되지 않았다.

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
