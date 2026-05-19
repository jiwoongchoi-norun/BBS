# 변경 이력

## 2026-05-19

- 문서 전체 정리
  - 깨진 한국어 문서를 UTF-8 기준으로 재작성
  - 중복 보고서를 `docs/maintenance_report.md`로 통합
  - 요구사항, 아키텍처, DB, 테스트 계획, 유지보수 보고서를 기준 문서로 정리
  - 오래된 중복 문서와 PDF 추출 중간 산출물 삭제
- README 최신화
  - 현재 구현 상태, 문서 구조, 실행 방법, 검증 방법, 주요 라우트 정리

## 2026-05-18

- SQL Injection 방어 점검 및 보강
  - 주요 Oracle query에 bind variable 사용
  - 검색 컬럼과 정렬 컬럼을 whitelist 방식으로 제한
  - 숫자 query/body parameter 검증 강화
- 좋아요/싫어요 오류 수정
  - 추천 후 상세 화면 복귀 시 조회수가 증가하지 않도록 skip token 흐름 정리
  - `NJS-098` bind placeholder 오류 수정
- 회원 기능 보강
  - ID 찾기 추가
  - 내 정보 화면 추가
  - 회원 탈퇴 추가, `LOGIN.OK = 0` soft deactivate 적용
- 게시글 목록 개선
  - 내 글만 보기
  - 댓글 수 표시
  - 검색/정렬/페이징 상태 유지
  - 빈 목록 상태 메시지 정리
- 댓글/파일/UI 개선
  - 댓글 수정/삭제
  - 대댓글
  - 첨부파일 크기 표시 개선
  - 공통 footer partial 추가

검증:

- `npm run verify:app`
- 주요 기능 수동 테스트

## 2026-05-16

- 목록 UI 개선
  - 목록 컬럼을 번호, 제목, 작성자, 조회수, 좋아요, 작성일 중심으로 정리
  - 작성일 표시 형식 개선
  - 조회수/좋아요/작성일 정렬 추가
  - 페이지 크기 선택 추가
- 회원 UI 개선
  - 로그인 상태별 상단 버튼 표시
  - 상단 사용자 이름 표시
  - 회원가입 ID 중복 확인
  - 전화번호 입력/저장
- 게시글 상세 개선
  - 수정/삭제 확인 modal 적용
  - 작성자 권한 체크 유지
- 라우트 개선
  - `/` 접속 시 `/bbs`로 redirect
  - Bootstrap 기반 UI 정리

검증:

- `node --check routes/bbs.js`
- `npm run verify:app`

## 2026-05-15

- 추천 후 상세 화면 복귀 시 조회수가 증가하던 문제 수정
- 추천 redirect 전용 `skip_view_token` 흐름 추가
- README와 docs 문서 최신화

검증:

- `npm run lint`
- `npm run format:check`
- `npm run verify:app`

## 2026-05-14

- 좋아요/싫어요 기능 추가
- `BBS_REACTION` 테이블 설계 반영
- 같은 사용자의 중복 추천 방지
- 추천 취소/전환 처리
- bcrypt 기반 비밀번호 저장 적용
- 기존 SHA-512 + salt 계정 자동 bcrypt 마이그레이션 적용
- OracleDB 통합 마이그레이션/롤백/스키마 문서 정리

## 이전 작업

- 게시글 목록/작성/읽기/수정/삭제
- 검색과 페이징
- 로그인, 로그아웃, 회원가입, 회원정보 수정
- express-session 기반 세션 처리
- 조회수 컬럼
- 댓글/대댓글
- 파일 업로드/다운로드
- Bootstrap 기반 화면 정리
- ESLint, Prettier, npm scripts 정리
