# BBS 과제 요구사항 요약

## 프로젝트

Node.js, Express, EJS, OracleDB를 사용한 게시판 과제 프로젝트이다.

## 교수님 요구사항 기준 구현 범위

- Node.js / Express / EJS / OracleDB 연결 설정
- BBS 테이블 생성
- 게시글 목록
- 게시글 작성
- 게시글 읽기
- 게시글 수정
- 게시글 삭제 또는 비활성화
- Bootstrap 스타일 적용
- 제목 / 내용 / 작성자 검색
- 로그인
- 로그아웃
- 세션 처리
- 회원가입
- 회원정보 수정
- 비밀번호 암호화
- 조회수
- 페이징
- 댓글
- 파일 업로드

## 현재 코드 기준 완료

- Express 앱 실행 구조
- EJS 뷰 엔진 설정
- OracleDB 접속 설정
- `.env` 기반 환경변수 분리
- `SESSION_SECRET` 필수화
- 게시글 목록
- 게시글 작성
- 게시글 읽기
- 게시글 수정
- 게시글 soft delete
- 검색
- 로그인
- 로그아웃
- 회원가입
- 회원정보 수정
- 세션 처리
- 조회수
- Bootstrap 5 기반 반응형 UI
- 개발 자동화 기본 설정
  - ESLint
  - Prettier
  - npm scripts
  - VSCode debug config

## 현재 코드 기준 미완료

- bcrypt 비밀번호 암호화 실제 적용
- SQL bind variable 적용
- 페이징
- 댓글
- 파일 업로드
- 작성자 권한 체크
- 서버 측 입력값 검증
- 자동 테스트

## 제출물

- 프로젝트 진행 및 사용 설명 문서
- 테이블 생성 SQL
- 게시판 모든 기능 화면 캡처
- 소스코드 정리본

## 가산점 후보

- SQL Injection 방지
- bcrypt 비밀번호 암호화
- 댓글 수정 / 삭제
- 대댓글
- 좋아요 / 싫어요
- 작성자 권한 체크
- 관리자 기능
- 입력값 검증
- Bootstrap UI 개선
- README 정리
- 개발 자동화 문서화

## 작업 우선순위

1. bcrypt 비밀번호 암호화 적용
2. 인증/회원 SQL bind variable 적용
3. 게시판 SQL bind variable 적용
4. 페이징 구현
5. 댓글 구현
6. 파일 업로드 구현
7. 작성자 권한 체크
8. 입력값 검증
9. 테스트 자동화
