# Troubleshooting

최종 업데이트: 2026-05-19

## 서버가 켜지지 않을 때

1. `.env` 파일이 있는지 확인한다.
2. `SESSION_SECRET`이 비어 있지 않은지 확인한다.
3. OracleDB가 실행 중인지 확인한다.
4. `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING`을 확인한다.
5. 3000번 포트를 이미 다른 프로세스가 사용 중인지 확인한다.

```powershell
netstat -ano | Select-String ':3000'
```

## 앱 로딩 검증

```powershell
npm run verify:app
```

실패하면 require error, router error, syntax error를 먼저 확인한다.

## OracleDB 연결 실패

- Oracle XE 서비스가 실행 중인지 확인한다.
- 접속 문자열이 환경에 맞는지 확인한다. 예: `localhost/XEPDB1`, `localhost/XE`
- DB 계정 권한과 비밀번호를 확인한다.
- 신규 DB이면 `scripts/schema.sql`을 먼저 적용한다.
- 기존 DB이면 `scripts/migration.sql` 적용 여부를 확인한다.

## 로그인 실패

- 신규 계정은 bcrypt hash로 저장되어야 한다.
- 기존 계정은 `PASSWORD_ALGO`, `SALT`가 legacy 구조와 맞는지 확인한다.
- 탈퇴 계정은 `LOGIN.OK = 0`이면 로그인할 수 없다.
- 실제 비밀번호 값은 문서나 로그에 출력하지 않는다.

```sql
SELECT ID, PASSWORD_ALGO, SALT, OK
FROM LOGIN
WHERE ID = '확인할_ID';
```

## 좋아요/싫어요 후 조회수가 증가할 때

정상 동작은 추천 수만 바뀌고 조회수는 유지되는 것이다. 다음 흐름을 확인한다.

- `redirectReadWithoutViewCount()`
- `createSkipViewCountToken()`
- `shouldSkipViewCount()`
- `GET /bbs/read`
- `POST /bbs/reaction`

## NJS-098 오류

오류 예:

```text
NJS-098: 0 bind placeholders were used in the SQL statement but 1 bind values were provided
```

원인:

- SQL 안에 `:brdno` 같은 bind placeholder가 없는데 `{ brdno }` bind 객체를 넘겼을 때 발생한다.
- 추천 후 조회수 증가를 건너뛰는 no-op SQL에서 주로 발생할 수 있다.

처리:

- placeholder가 없는 SQL에는 `{}`를 넘긴다.
- 일반 조회수 증가 SQL에는 `WHERE NO = :brdno`와 `{ brdno }`를 함께 넘긴다.

## CSRF 403 오류

- POST form에 hidden `_csrf`가 있는지 확인한다.
- multipart upload form은 action query에도 `_csrf`가 전달되는지 확인한다.
- 오래 열린 form은 세션/token이 바뀌었을 수 있으므로 새로고침 후 다시 시도한다.

## 파일 업로드 실패

- 허용 확장자인지 확인한다.
- 파일 크기가 10MB 이하인지 확인한다.
- 한 번에 1개 파일만 업로드했는지 확인한다.
- `uploads/bbs` 폴더가 존재하고 쓰기 가능한지 확인한다.

## 다운로드 실패

- `fno`가 숫자인지 확인한다.
- 게시글과 첨부파일의 `OK`가 1인지 확인한다.
- 로그인 사용자가 게시글 작성자인지 확인한다.
- DB의 `FILE_PATH`, `SAVE_FILENAME`이 `uploads/bbs` 내부 실제 파일과 일치하는지 확인한다.

## 문자가 깨져 보일 때

문서는 UTF-8 기준으로 작성한다. PowerShell 콘솔에서만 깨져 보이면 다음을 실행한 뒤 다시 확인한다.

```powershell
chcp 65001
```

VS Code에서는 파일 인코딩을 UTF-8로 열어 확인한다.
