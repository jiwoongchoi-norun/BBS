# Change Log

## 2026-05-15

- 좋아요/싫어요 후 read 화면으로 돌아올 때 조회수가 증가하던 문제 수정
- 추천 리다이렉트 전용 1회용 `skip_view_token` 추가
- 일반 게시글 읽기는 기존처럼 조회수 증가 유지
- 관련 코드 주석 보강
- README와 docs 문서 최신화

검증:

- `npm run lint`
- `npm run format:check`
- `npm run verify:app`
- 일반 읽기 후 조회수 1, 좋아요/취소 후 조회수 1 유지 확인

## 2026-05-14

- 게시글 좋아요/싫어요 기능 추가
- `BBS_REACTION` 추천 기록 테이블 설계 반영
- 동일 사용자 중복 추천 방지
- 좋아요/싫어요 취소와 전환 처리
- list/read 화면에 좋아요/싫어요 수 표시
- bcrypt 기반 비밀번호 저장 적용
- 기존 SHA-512 + salt 계정 자동 bcrypt 마이그레이션 적용
- OracleDB 통합 마이그레이션/롤백/스키마 요약 문서 정리

## 이전 작업

- 게시글 목록/작성/읽기/수정/삭제 구현
- 검색과 페이징 구현
- 로그인/로그아웃/회원가입/회원정보 수정 구현
- express-session 기반 세션 처리
- 조회수 컬럼 추가
- 댓글/대댓글 구현
- 파일 업로드/다운로드 구현
- Bootstrap 기반 화면 정리
- ESLint/Prettier/npm scripts 정리
