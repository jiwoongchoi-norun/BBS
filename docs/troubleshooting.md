# Troubleshooting

## 앱 실행 시 `SESSION_SECRET is required`

원인:

- `.env`에 `SESSION_SECRET`이 없다.

해결:

```env
SESSION_SECRET=change-this-session-secret
```

## DB 환경변수 누락 오류

원인:

- `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` 중 하나가 없다.

해결:

```env
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost/XEPDB1
```

## OracleDB 접속 실패

확인할 것:

- OracleDB 서비스 실행 여부
- `DB_CONNECT_STRING` 값
- 계정 잠금 여부
- 방화벽 포트
- WSL2에서 Windows OracleDB로 접근하는 경우 host 설정

## `VIEW_COUNT` 컬럼 오류

증상:

- `ORA-00904: "VIEW_COUNT": invalid identifier`

원인:

- 기존 DB의 `BBS` 테이블에 조회수 컬럼이 없다.

해결:

```sql
@scripts/add-view-count.sql
```

신규 DB는 `scripts/schema.sql`부터 다시 실행한다.

## `SALT` 컬럼 오류 또는 기존 계정 로그인 실패

증상:

- `ORA-00904: "SALT": invalid identifier`
- 예전 평문 비밀번호 계정으로 로그인 실패

원인:

- 기존 DB의 `LOGIN` 테이블에 `SALT` 컬럼이 없거나, 기존 계정에 SHA-512 + salt 해시값이 없다.

해결:

```sql
@scripts/add-login-salt.sql
```

테스트는 새로 회원가입한 계정으로 진행한다. 기존 계정은 salt와 해시값을 별도로 마이그레이션해야 한다.

## `BBSW` 또는 `BBSW_SEQ` 없음 오류

증상:

- 댓글 작성 시 `ORA-00942: table or view does not exist`
- `ORA-02289: sequence does not exist`

해결:

```sql
@scripts/add-bbsw.sql
```

신규 DB는 `scripts/schema.sql`에 포함되어 있다.

## `BBS_FILE` 또는 `BBS_FILE_SEQ` 없음 오류

증상:

- 파일 업로드 시 `ORA-00942: table or view does not exist`
- `ORA-02289: sequence does not exist`

해결:

```sql
@scripts/add-bbs-file.sql
```

신규 DB는 `scripts/schema.sql`에 포함되어 있다.

## 파일 업로드 실패

확인할 것:

- 파일 크기가 10MB 이하인지 확인
- 확장자가 허용 목록에 있는지 확인
- `uploads/bbs` 디렉터리 쓰기 권한 확인
- 차단 확장자: `.exe`, `.js`, `.sh`, `.bat`, `.cmd`, `.ps1`

허용 확장자:

- `.jpg`
- `.jpeg`
- `.png`
- `.gif`
- `.pdf`
- `.txt`
- `.zip`
- `.hwp`
- `.hwpx`
- `.docx`
- `.pptx`
- `.xlsx`

## 로그인 실패

확인할 것:

- `LOGIN` 테이블에 계정이 있는지 확인
- 신규 계정으로 회원가입 후 다시 테스트
- 기존 평문 비밀번호 계정인지 확인

비밀번호와 salt 전체 값은 출력하지 않는다.

```sql
SELECT ID, NAME, EMAIL, OK FROM LOGIN;
```

## 글쓰기/수정/삭제가 로그인으로 이동함

원인:

- `requireLogin()`이 적용된 보호 라우트다.

해결:

- 로그인 후 다시 시도한다.

## 권한 없음 403

원인:

- 로그인 사용자가 게시글 또는 댓글 작성자가 아니다.

해결:

- 작성자 계정으로 로그인한다.

## 한글이 PowerShell 출력에서 깨져 보임

원인:

- 콘솔 코드페이지 또는 표시 인코딩 문제일 수 있다.
- 파일 자체는 UTF-8로 관리한다.

확인:

```powershell
Get-Content README.md -Encoding UTF8
```

## `npm run format:check` 실패

해결:

```powershell
npm run format
```

문서만 부분 포맷하려면:

```powershell
npx prettier README.md docs/*.md --write
```

## `npm run security:secrets` 실패

원인:

- gitleaks가 설치되어 있지 않을 수 있다.

해결:

- gitleaks 설치 후 실행한다.
- 미설치 환경에서는 `npm run lint`, `npm run verify:app`를 우선한다.

## `npm run security:semgrep` 실패

원인:

- Semgrep이 설치되어 있지 않을 수 있다.

해결:

- Semgrep 설치 후 실행한다.
- 현재 명령은 선택 보안 검사 용도다.
