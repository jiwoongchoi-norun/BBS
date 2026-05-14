# BBS 프로젝트 정리

## 현재 완성 상태

Node.js + Express + EJS + OracleDB 기반 게시판 과제 프로젝트입니다. 필수 기능과 주요 추가 기능이 구현되어 있습니다.

## 완료 기능

- 게시글 목록
- 게시글 검색
- 게시글 작성
- 게시글 읽기
- 게시글 수정
- 게시글 삭제
- 조회수
- 페이징
- 로그인
- 로그아웃
- 회원가입
- 회원정보 수정
- 세션 처리
- bcrypt 비밀번호 저장
- 기존 SHA-512 + salt 계정 자동 bcrypt 전환
- 댓글
- 대댓글
- 댓글 삭제
- 좋아요/싫어요
- 좋아요/싫어요 취소와 전환
- 추천 후 조회수 증가 방지
- 파일 업로드
- 파일 다운로드
- 작성자 권한 체크
- 주요 SQL bind variable 적용

## 제출 전 볼 문서

1. `README.md`
2. `docs/requirements_summary.md`
3. `docs/progress_report.md`
4. `docs/test_plan.md`
5. `docs/schema_summary.md`
6. `docs/code_review_guide.md`

## 코드 공부 순서

1. `app.js`
2. `config/dbconfig.js`
3. `routes/bbs.js` helper 함수
4. 로그인/회원가입 라우터
5. 게시글 CRUD 라우터
6. 댓글/대댓글 라우터
7. 좋아요/싫어요 라우터
8. 파일 업로드/다운로드 라우터
9. `views/bbs/*.ejs`
10. `scripts/*.sql`

## 마지막 검증 명령

```powershell
npm run lint
npm run format:check
npm run verify:app
```

## 남은 개선 후보

- 댓글 수정
- 관리자 기능
- CSRF 방어
- 삭제 요청 POST 전환
- 자동화 테스트
