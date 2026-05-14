# Test Plan

## 기본 검증 명령

```powershell
npm run lint
npm run format:check
npm run verify:app
```

제출 전 추가 검증:

```powershell
npm run audit
```

선택 보안 도구가 설치된 경우:

```powershell
npm run security:secrets
npm run security:semgrep
```

## 환경 준비

1. `.env` 작성
2. OracleDB 실행 확인
3. 신규 DB라면 `scripts/schema.sql` 실행
4. 샘플 데이터가 필요하면 `scripts/sample-data.sql` 실행
5. 기존 DB라면 `scripts/migration.sql` 실행
6. 서버 실행

```powershell
npm start
```

## 기존 DB 보강 스크립트

```sql
@scripts/migration.sql
```

기존 SHA-512 + salt 계정은 로그인 성공 시 bcrypt로 자동 전환된다. 기존 평문 비밀번호 계정은 별도 마이그레이션 데이터가 없으면 로그인에 실패할 수 있다.

## 수동 기능 테스트

| 기능             | 테스트 절차                                    | 기대 결과                              |
| ---------------- | ---------------------------------------------- | -------------------------------------- |
| 목록             | `/bbs/list` 접속                               | 게시글 목록 표시                       |
| 페이징           | 게시글 11개 이상 생성 후 `page=2` 이동         | 페이지별 목록 표시                     |
| 검색             | 제목/작성자/내용/제목+내용 검색                | 조건에 맞는 게시글 표시                |
| 상세             | 목록에서 게시글 클릭                           | 상세 화면 표시, 조회수 증가            |
| 글쓰기 접근 제한 | 로그아웃 상태에서 `/bbs/form` 접속             | 로그인 화면으로 이동                   |
| 글쓰기           | 로그인 후 제목/내용 입력, 선택적으로 파일 첨부 | 목록 이동, 새 글 표시                  |
| 파일 업로드      | 허용 확장자 파일 첨부                          | `uploads/bbs` 저장, `BBS_FILE` 행 생성 |
| 파일 다운로드    | 상세 화면의 다운로드 클릭                      | 원본 파일명으로 다운로드               |
| 파일 차단        | `.exe`, `.js`, `.sh` 등 업로드 시도            | 업로드 실패                            |
| 글수정           | 작성자가 글 수정                               | 수정 내용 반영                         |
| 글삭제           | 작성자가 글 삭제                               | 목록에서 제외, `BBS.OK = 0`            |
| 권한 체크        | 다른 사용자로 글 수정/삭제 시도                | 403 응답                               |
| 댓글             | 로그인 후 댓글 작성                            | 상세 화면 댓글 목록에 표시             |
| 대댓글           | 댓글의 답글달기 사용                           | 들여쓰기된 답글 표시                   |
| 댓글 삭제        | 본인 댓글 삭제                                 | 댓글 soft delete                       |
| 댓글 권한 체크   | 다른 사용자 댓글 삭제 시도                     | 403 응답                               |
| 좋아요           | 로그인 후 상세 화면에서 좋아요 클릭            | 좋아요 +1, 버튼이 취소 상태로 표시     |
| 좋아요 취소      | 같은 계정으로 좋아요 다시 클릭                 | 좋아요 -1, 추천 기록 삭제              |
| 싫어요 전환      | 좋아요 상태에서 싫어요 클릭                    | 좋아요 -1, 싫어요 +1                   |
| 비로그인 추천    | 로그아웃 상태에서 추천 영역 확인               | 로그인 후 추천 안내 표시               |
| 로그인 실패      | 없는 ID 또는 틀린 비밀번호 입력                | 오류 alert 표시                        |
| 로그인 성공      | 새 계정으로 로그인                             | 목록으로 이동                          |
| bcrypt 전환      | SHA-512 계정으로 로그인                        | 로그인 성공 후 `PASSWORD_ALGO=bcrypt`  |
| 로그아웃         | `/bbs/logout` 호출                             | 세션 삭제 후 목록 이동                 |
| 회원가입         | 신규 ID 입력                                   | 로그인 화면 이동                       |
| 회원정보 수정    | 로그인 후 ID/비밀번호/이름/이메일 수정         | 세션 ID 및 DB 값 변경                  |

## 보안 테스트

| 항목             | 테스트                                                    |
| ---------------- | --------------------------------------------------------- |
| SQL Injection    | `/bbs/read?brdno=1 OR 1=1` 요청 시 bad request            |
| 로그인 Injection | ID/PW에 `' OR '1'='1` 입력 시 로그인 실패                 |
| 검색 컬럼 변조   | 허용되지 않은 searchChoice 값 전달 시 기본 제목 검색 처리 |
| 숫자 파라미터    | `brdno=abc`, `fno=abc` 요청 시 bad request                |
| 비밀번호 노출    | 회원정보 수정 화면에서 기존 비밀번호가 비어 있음          |
| 세션             | 로그아웃 후 보호 기능 접근 시 로그인 화면 이동            |

## DB 확인 쿼리

비밀번호와 salt 값은 화면 캡처에 출력하지 않는다.

```sql
SELECT ID, NAME, EMAIL, OK FROM LOGIN;
SELECT ID, PASSWORD_ALGO, SALT, PASSWORD_UPDATED_AT, OK FROM LOGIN;
SELECT NO, TITLE, WRITER, VIEW_COUNT, LIKE_COUNT, DISLIKE_COUNT, OK FROM BBS ORDER BY NO;
SELECT BBSNO, USER_ID, REACTION_TYPE FROM BBS_REACTION ORDER BY BBSNO, USER_ID;
SELECT NO, BBSNO, PARENT_NO, WRITER, DEPTH, OK FROM BBSW ORDER BY NO;
SELECT NO, BBSNO, ORG_FILENAME, FILESIZE, OK FROM BBS_FILE ORDER BY NO;
```

## 제출용 화면 캡처 체크리스트

| 분류   | 캡처 화면                                         |
| ------ | ------------------------------------------------- |
| 기본   | 목록, 상세, 글쓰기, 글수정, 삭제 후 목록          |
| 검색   | 제목 검색, 작성자 검색, 내용 검색, 제목+내용 검색 |
| 페이징 | 1페이지, 2페이지, 이전/다음 버튼                  |
| 인증   | 로그인 성공, 로그인 실패, 로그아웃                |
| 회원   | 회원가입, 회원정보 수정                           |
| 댓글   | 댓글 작성, 대댓글 작성, 댓글 삭제                 |
| 추천   | 좋아요, 좋아요 취소, 싫어요 전환, 비로그인 안내   |
| 파일   | 파일 첨부 글쓰기, 상세 첨부파일 목록, 다운로드    |
| 보안   | 다른 사용자 수정/삭제 차단 또는 설명 캡처         |

## 자동화 테스트 추가 계획

1. `node --test` 기반 helper 함수 테스트
2. DB 연결 없는 라우트 유효성 검증 테스트
3. Playwright 기반 브라우저 smoke test
4. OracleDB 테스트 데이터 fixture 구성
