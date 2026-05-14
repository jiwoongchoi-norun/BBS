# BBS 과제 요구사항 요약

## 프로젝트

Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트다. 교수님 수업자료의 게시판 흐름을 우선 충족하고, 이후 보안과 편의 기능을 가산점 후보로 확장한다.

## 교수님 PPT 기준 필수 기능

- 게시글 목록
- 글쓰기
- 글읽기
- 글수정
- 글삭제
- 검색
- 로그인
- 로그아웃
- 회원가입
- 회원정보 수정
- 세션 처리
- 비밀번호 암호화
- 조회수
- 페이징
- 댓글
- 파일업로드

## 현재 구현 완료

- Express/EJS/OracleDB 기본 실행 구조
- `.env` 기반 DB 설정 및 `SESSION_SECRET` 사용
- 게시글 목록, 작성, 읽기, 수정, soft delete
- 제목/내용/작성자/제목+내용 검색
- 로그인, 로그아웃, 회원가입, 회원정보 수정
- `req.session.user` 기반 세션 처리
- SHA-512 + salt 기반 비밀번호 저장 및 로그인 검증
- 조회수 증가 및 화면 표시
- 목록/검색 페이징
- 댓글 작성, 대댓글 작성, 본인 댓글 삭제
- 첨부파일 업로드 및 다운로드
- 작성자 기준 게시글 수정/삭제 권한 체크
- 주요 SQL bind variable 적용
- 서버 측 기본 입력값 검증
- Bootstrap 5 기반 반응형 UI
- ESLint, Prettier, npm scripts, VSCode debug 설정

## 현재 미완료 또는 개선 후보

- bcrypt 실제 적용: 패키지는 설치되어 있으나 현재 코드는 SHA-512 + salt 방식이다.
- 댓글 수정 기능
- 좋아요/싫어요 실제 처리 라우트
- 관리자 기능
- 자동화 테스트
- 업로드 파일 정리 정책
- 기존 평문 계정의 비밀번호 마이그레이션 절차

## DB 스크립트 현황

- 신규 DB: `scripts/schema.sql`, `scripts/sample-data.sql`
- 기존 DB 보강:
  - `scripts/add-view-count.sql`
  - `scripts/add-login-salt.sql`
  - `scripts/add-bbsw.sql`
  - `scripts/add-bbs-file.sql`

## 제출 준비 체크리스트

- `scripts/schema.sql`에 `LOGIN`, `BBS`, `BBSW`, `BBS_FILE` 및 각 시퀀스가 포함되어 있는지 확인한다.
- 화면 캡처 대상: 목록, 페이징, 검색, 글쓰기, 파일업로드, 글읽기, 다운로드, 댓글, 대댓글, 수정, 삭제, 로그인, 로그아웃, 회원가입, 회원정보 수정.
- `.env`, `node_modules`, `.git`, 실제 업로드 파일은 제출물에서 제외한다.
- 새 계정으로 회원가입 후 로그인, 글 작성, 댓글 작성, 파일 다운로드까지 수동 테스트한다.

## 다음 작업 우선순위

1. 현재 변경분 lint/format/app load 검증
2. OracleDB에서 신규 스키마 및 기존 DB 보강 스크립트 실행 확인
3. 댓글 수정 또는 좋아요/싫어요 중 하나를 선택해 추가 구현
4. bcrypt 마이그레이션 방식 결정 및 적용
5. 제출용 화면 캡처 정리
