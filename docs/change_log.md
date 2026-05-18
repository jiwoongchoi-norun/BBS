# Change Log

## 2026-05-18

- 좋아요/싫어요 오류 수정
  - 추천 후 read 화면으로 돌아올 때 `skipViewCount` 분기에서 bind placeholder가 없는 `BEGIN NULL; END;`에 `{ brdno }`를 넘겨 `NJS-098`이 발생하던 문제 수정
  - 조회수 증가를 건너뛰는 경우 빈 bind `{}`를 넘기도록 정리
  - `docs/troubleshooting.md`에 원인과 수정 기준 추가
- 좋아요/싫어요 버튼 UI 개선
  - `public/images`의 통합 PNG를 기반으로 `reaction-icons-sprite.png` 생성
  - 상세 화면 추천 버튼을 이미지 아이콘 + 카운트 중심 UI로 변경
  - LIKE/DISLIKE POST 값과 기존 추천 처리 로직은 유지
- 공통 상단 표시 정리
  - 네비게이션 브랜드명을 `BBS 게시판`에서 `자유게시판`으로 변경
- 회원 기능 보강
  - 이름/이메일 기반 아이디 찾기 `GET/POST /bbs/find-id` 추가
  - 내 정보 화면에서 회원 탈퇴 `POST /bbs/withdraw` 추가
  - 탈퇴 계정은 `LOGIN.OK = 0`으로 비활성화하고 로그인 차단
  - 기존 DB용 `LOGIN.OK` 마이그레이션 추가
- 게시글 목록 개선
  - 로그인 사용자용 내 글만 보기 `mine=1` 필터 추가
  - 목록/검색 제목 옆 활성 댓글 수 표시
  - 검색 결과 없음, 내 글 없음, 전체 글 없음 상태별 empty state 추가
- 댓글/파일/UI 개선
  - 댓글 수정 `POST /bbs/wupdate` 문서 반영
  - 댓글 삭제를 `POST /bbs/wdelete` soft delete 기준으로 정리
  - 상세 화면 첨부파일 크기 표시 개선
  - 공통 footer partial과 모바일 화면 간격 보정 추가

검증:

- `npm run verify:app`: 통과
- 문서 파일 Prettier check: 통과
- 아이디 찾기, 회원 탈퇴, 내 글만 보기, 목록 댓글 수 수동 테스트

## 2026-05-16

- 게시글 목록 UI 개선
  - `content`, `status` 컬럼 미노출
  - 작성일 표시 형식 개선: 오늘은 `HH:mm`, 이전 날짜는 `YY.MM.DD`
  - 좋아요 수 표시
  - 조회수/좋아요/작성일 정렬 추가
  - 페이지당 표시 개수 선택 추가
  - 비활성 글 제외 기준 표시용 번호 적용
- 로그인/회원 기능 개선
  - 로그인 상태별 상단 버튼 조건부 표시
  - 상단 사용자 이름 표시
  - 내 정보 페이지 추가
  - 회원가입 아이디 중복확인 추가
  - PHONE 전화번호 입력/저장 추가
  - 전화번호 입력 시 하이픈 포함 형식 표시
- 게시글 작성/상세 개선
  - 글쓰기 작성자 입력 제거
  - 로그인 사용자 이름을 작성자로 자동 저장
  - 상세 화면 수정/삭제 확인 modal 적용
- 라우팅/UI 개선
  - 루트 주소 `/` 접속 시 `/bbs`로 redirect
  - Linear `DESIGN.md` 기준 밝은 게시판 UI 리디자인

검증:

- `bbs ejs compiled`
- `node --check routes/bbs.js`
- `npm run verify:app`

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
- 일반 읽기 시 조회수 +1, 좋아요 취소 시 조회수 유지 확인

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
