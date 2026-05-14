# BBS 과제 요구사항 요약

## 프로젝트 목표

Node.js, Express, EJS, OracleDB 기반 게시판 과제 프로젝트입니다. 1차 목표는 교수님 PPT의 필수 게시판 기능 충족이고, 2차 목표는 보안과 편의 기능을 추가해 제출 완성도를 높이는 것입니다.

## 필수 요구사항 충족 현황

| 요구사항        | 상태 | 구현 위치                                           |
| --------------- | ---- | --------------------------------------------------- |
| 게시글 목록     | 완료 | `GET /bbs/list`                                     |
| 글쓰기          | 완료 | `GET /bbs/form`, `POST /bbs/save`                   |
| 글읽기          | 완료 | `GET /bbs/read`                                     |
| 글수정          | 완료 | `GET /bbs/update`, `POST /bbs/updatesave`           |
| 글삭제          | 완료 | `GET /bbs/delete`, `BBS.OK = 0`                     |
| 검색            | 완료 | `GET /bbs/search`                                   |
| 로그인          | 완료 | `GET /bbs/login`, `POST /bbs/logincheck`            |
| 로그아웃        | 완료 | `GET /bbs/logout`                                   |
| 회원가입        | 완료 | `GET /bbs/signup`, `POST /bbs/signupsave`           |
| 회원정보 수정   | 완료 | `GET /bbs/updatesignup`, `POST /bbs/updatesignsave` |
| 세션 처리       | 완료 | `req.session.user`                                  |
| 비밀번호 암호화 | 완료 | bcrypt, legacy SHA-512 fallback                     |
| 조회수          | 완료 | `BBS.VIEW_COUNT`                                    |
| 페이징          | 완료 | 목록/검색 `page` query                              |
| 댓글            | 완료 | `BBSW`, `POST /bbs/wsave`                           |
| 파일업로드      | 완료 | `multer`, `BBS_FILE`                                |

## 추가 구현 완료

- SQL Injection 완화: 주요 SQL에 Oracle bind variable 적용
- bcrypt 비밀번호 저장: 신규 가입과 회원정보 수정 시 bcrypt 저장
- SHA-512 + salt 자동 마이그레이션: 기존 계정 로그인 성공 시 bcrypt로 재저장
- 대댓글: `BBSW.PARENT_NO`, `DEPTH` 기반
- 댓글 삭제: 작성자 본인만 soft delete
- 게시글 좋아요/싫어요: `BBS_REACTION`으로 중복 추천 방지
- 좋아요/싫어요 취소와 전환
- 추천 후 read 화면 이동 시 조회수 증가 방지
- 작성자 권한 체크: 게시글 수정/삭제, 댓글 삭제
- Bootstrap 기반 반응형 UI
- ESLint/Prettier/app load 검증 스크립트

## DB 스크립트 현황

| 파일                         | 용도                               |
| ---------------------------- | ---------------------------------- |
| `scripts/schema.sql`         | 신규 DB 생성용 전체 스키마         |
| `scripts/sample-data.sql`    | 샘플 데이터                        |
| `scripts/migration.sql`      | 기존 DB 보강용 통합 마이그레이션   |
| `scripts/rollback.sql`       | FK/index 중심 되돌림 참고 스크립트 |
| `scripts/add-view-count.sql` | 조회수 컬럼 보강                   |
| `scripts/add-login-salt.sql` | legacy 비밀번호 salt 보강          |
| `scripts/add-bbsw.sql`       | 댓글 테이블 보강                   |
| `scripts/add-bbs-file.sql`   | 파일 테이블 보강                   |

## 제출 전 확인 항목

1. OracleDB에서 신규 스키마 또는 `scripts/migration.sql` 실행 확인
2. `npm run lint`
3. `npm run format:check`
4. `npm run verify:app`
5. 로그인, 글쓰기, 읽기, 조회수, 댓글, 대댓글, 좋아요/싫어요, 파일업로드 수동 테스트
6. 기존 SHA-512 계정이 있다면 로그인 후 bcrypt 전환 확인
7. 제출용 화면 캡처 정리

## 남은 개선 후보

- 댓글 수정
- 관리자 기능
- CSRF 방어
- 업로드 파일 물리 삭제 정책 보강
- 자동화 테스트 추가
