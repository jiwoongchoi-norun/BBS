# BBS 과제 요구사항 요약

## 프로젝트 목표

Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트다. 1차 목표는 교수님 PPT 기준 필수 게시판 기능 충족이며, 2차 목표는 보안과 사용성 개선을 포함한 가산점 후보 기능 반영이다.

## 필수 요구사항 충족 현황

| 요구사항 | 상태 | 구현 위치 |
| --- | --- | --- |
| 게시글 목록 | 완료 | `GET /bbs/list`, `views/bbs/list.ejs` |
| 글쓰기 | 완료 | `GET /bbs/form`, `POST /bbs/save` |
| 글읽기 | 완료 | `GET /bbs/read` |
| 글수정 | 완료 | `GET /bbs/update`, `POST /bbs/updatesave` |
| 글삭제 | 완료 | `GET /bbs/delete`, `BBS.OK = 0` soft delete |
| 검색 | 완료 | `GET /bbs/search` |
| 로그인 | 완료 | `GET /bbs/login`, `POST /bbs/logincheck` |
| 로그아웃 | 완료 | `GET /bbs/logout` |
| 회원가입 | 완료 | `GET /bbs/signup`, `POST /bbs/signupsave` |
| 회원정보 수정 | 완료 | `GET /bbs/updatesignup`, `POST /bbs/updatesignsave` |
| 세션 처리 | 완료 | `express-session`, `req.session.user` |
| 비밀번호 암호화 | 완료 | bcrypt 저장, legacy SHA-512 fallback |
| 조회수 | 완료 | `BBS.VIEW_COUNT` |
| 페이징 | 완료 | 목록/검색 `page`, `pageSize` query |
| 댓글 | 완료 | `BBSW`, `POST /bbs/wsave` |
| 대댓글 | 완료 | `BBSW.PARENT_NO`, `DEPTH` |
| 댓글 삭제 | 완료 | `GET /bbs/wdelete` soft delete |
| 파일 업로드 | 완료 | `multer`, `BBS_FILE` |
| 파일 다운로드 | 완료 | `GET /bbs/download` |

## 최근 반영된 화면/기능 개선

- 게시글 목록 UI 개선
  - 목록 컬럼을 `번호`, `제목`, `작성자`, `조회수`, `좋아요`, `작성일` 중심으로 정리
  - `content`, `status` 컬럼은 목록에서 미노출
  - 비활성 글(`OK = 0`)을 제외한 현재 조회 결과 기준 표시용 번호 적용
  - 상세 링크에는 실제 DB 게시글 번호(`BBS.NO`) 유지
- 작성일 표시 개선
  - 오늘 작성글은 `HH:mm`
  - 오늘 이전 글은 `YY.MM.DD`
- 목록 좋아요 수 표시
  - `NVL(LIKE_COUNT, 0)` 값 표시
- 목록 정렬
  - 조회수, 좋아요, 작성일 기준 `sort/order` query 정렬
  - sort/order 화이트리스트 검증 적용
- 페이지당 표시 개수 선택
  - 10, 20, 30, 50개 선택
  - 검색/정렬/페이징 이동 시 `pageSize` 유지
- 로그인 상태별 상단 버튼 표시
  - 비로그인: 로그인, 회원가입
  - 로그인: 사용자 이름, 내 정보, 로그아웃, 회원정보 수정
- 회원가입 개선
  - 아이디 중복확인 `GET /bbs/check-id`
  - 서버 측 최종 중복 검증
  - `PHONE` 전화번호 입력 및 저장
  - 전화번호 입력 시 하이픈 포함 형식 표시
- 게시글 상세 개선
  - 수정/삭제 확인 Bootstrap modal 적용
  - 기존 수정/삭제 라우트와 권한 체크 유지
- 내 정보 페이지 추가
  - `GET /bbs/myinfo`
  - 아이디, 이름, 전화번호, 정보 갱신일 표시
  - 회원정보 수정 페이지로 이동 가능
- 글쓰기 작성자 자동 처리
  - 작성자 입력 항목 제거
  - 서버에서 로그인 계정 이름을 작성자로 저장
  - 이름이 없으면 아이디 fallback
- 루트 접속 처리
  - `GET /` 접속 시 `/bbs`로 redirect
- UI 리디자인
  - Linear `DESIGN.md` 기준 밝은 화면 중심 재해석
  - 버튼, 입력창, 테이블, 카드, 모달, 페이지네이션, 네비게이션 공통 CSS 정리

## 보안/품질 개선 현황

- SQL Injection 완화: 주요 SQL에 Oracle bind variable 적용
- 비밀번호 암호화: 신규 가입/회원정보 수정 bcrypt 저장
- legacy 계정 전환: SHA-512 + salt 계정 로그인 성공 시 bcrypt 재저장
- 작성자 권한 체크: 게시글 수정/삭제, 댓글 삭제에 작성자 확인 적용
- 입력값 검증: 주요 body/query 값에 길이 제한 및 숫자 검증 helper 적용
- 세션 secret: `.env`의 `SESSION_SECRET` 사용
- 파일 업로드 제한: 허용 확장자 및 크기 제한 적용

## DB 스크립트 현황

| 파일 | 용도 |
| --- | --- |
| `scripts/schema.sql` | 신규 DB 생성용 전체 스키마 |
| `scripts/sample-data.sql` | 샘플 데이터 |
| `scripts/migration.sql` | 기존 DB 보강용 통합 마이그레이션 |
| `scripts/rollback.sql` | FK/index 중심 되돌리기 참고 스크립트 |
| `scripts/add-view-count.sql` | 조회수 컬럼 보강 |
| `scripts/add-login-salt.sql` | legacy 비밀번호 salt 보강 |
| `scripts/add-bbsw.sql` | 댓글 테이블 보강 |
| `scripts/add-bbs-file.sql` | 파일 테이블 보강 |

추가로 현재 코드의 회원가입은 `LOGIN.PHONE` 컬럼이 존재한다는 전제로 동작한다.

```sql
ALTER TABLE LOGIN ADD (PHONE VARCHAR2(30));
```

## 제출 전 확인 항목

1. OracleDB에서 `scripts/schema.sql` 또는 `scripts/migration.sql` 적용 여부 확인
2. 기존 DB라면 `LOGIN.PHONE` 컬럼 존재 여부 확인
3. `npm run verify:app`
4. 로그인, 회원가입, 아이디 중복확인, 내 정보, 회원정보 수정 수동 테스트
5. 게시글 목록, 검색, 정렬, 페이지당 표시 개수, 페이징 수동 테스트
6. 글쓰기, 글읽기, 수정/삭제 modal, 댓글, 대댓글, 파일 업로드/다운로드 수동 테스트
7. UI 화면 캡처 정리

## 남은 개선 후보

- 댓글 수정 기능
- 관리자 기능
- CSRF 방어
- 회원정보 수정 화면의 PHONE 수정 연동
- 자동화 테스트 추가
- 업로드 파일 물리 삭제 정책 정리
