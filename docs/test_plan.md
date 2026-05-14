# Test Plan

## 현재 프로젝트 상태 분석

현재 자동 테스트 코드는 없다. 따라서 검증은 `npm run lint`, `npm run verify:app`, 브라우저 수동 확인, OracleDB 데이터 확인을 조합해 진행한다.

## 기본 검증 명령

```powershell
npm run lint
npm run verify:app
```

제출 전 추가 검증:

```powershell
npm run format:check
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
5. 기존 DB에 조회수 컬럼이 없다면 `scripts/add-view-count.sql` 실행
6. 서버 실행

```powershell
npm start
```

## 수동 기능 테스트

| 기능             | 테스트 절차                        | 기대 결과                    |
| ---------------- | ---------------------------------- | ---------------------------- |
| 목록             | `/bbs/list` 접속                   | 게시글 목록 표시             |
| 검색             | 제목/작성자/내용 검색              | 조건에 맞는 게시글 표시      |
| 상세             | 목록에서 게시글 클릭               | 상세 화면 표시, 조회수 증가  |
| 글쓰기 접근 제한 | 로그아웃 상태에서 `/bbs/form` 접속 | 로그인 화면으로 이동         |
| 글쓰기           | 로그인 후 글 작성                  | 목록으로 이동, 새 글 표시    |
| 글수정           | 로그인 후 수정 저장                | 상세/목록에서 수정 내용 확인 |
| 글삭제           | 로그인 후 삭제                     | 목록에서 사라짐, DB `OK = 0` |
| 로그인 실패      | 없는 ID 또는 틀린 비밀번호 입력    | 오류 alert 표시              |
| 로그인 성공      | 샘플 계정 입력                     | 목록으로 이동                |
| 로그아웃         | `/bbs/logout` 호출                 | 세션 삭제 후 목록 이동       |
| 회원가입         | 신규 ID 입력                       | 로그인 화면 이동             |
| 회원정보 수정    | 로그인 후 수정 저장                | 세션 ID 및 DB 값 변경        |

## DB 확인 쿼리

```sql
SELECT ID, NAME, EMAIL, OK FROM LOGIN;
SELECT NO, TITLE, WRITER, VIEW_COUNT, OK FROM BBS ORDER BY NO;
```

비밀번호 컬럼은 현재 평문 상태이므로 출력 시 주의한다.

## 회귀 테스트 체크리스트

- EJS 렌더링 오류 없음
- `/stylesheets/style.css` 200 응답
- 로그인 필요 화면 redirect 정상
- `BBS.OK = 0` 게시글이 목록/상세/수정에 노출되지 않음
- 조회수 증가가 상세 조회마다 1씩 반영됨
- 검색 결과에도 조회수 컬럼이 정상 표시됨

## 자동 테스트 추가 계획

우선순위:

1. `node --test` 기반 helper 함수 테스트
2. DB 연결 없는 라우트 유틸 테스트
3. Playwright 기반 브라우저 smoke test
4. OracleDB 테스트 데이터 fixture 구성

자동 테스트 도입 전에는 DB 의존성 때문에 테스트 데이터 초기화 정책을 먼저 정해야 한다.
