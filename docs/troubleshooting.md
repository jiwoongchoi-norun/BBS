# Troubleshooting

## 현재 프로젝트 상태 분석

프로젝트는 Windows 경로 `C:\BBS\BBS`에서 작업하며, WSL2와 VSCode Remote-SSH를 함께 사용하는 개발 흐름을 전제로 한다. Node/OracleDB/.env/인코딩 문제가 자주 발생할 수 있다.

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
- 방화벽/포트
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

또는 개발 DB를 재생성할 수 있으면 `scripts/schema.sql`부터 다시 실행한다.

## 로그인 실패

확인할 것:

- `LOGIN` 테이블에 계정이 있는지 확인
- 샘플 데이터 기준 계정은 `admin`, 비밀번호는 `1234`
- 현재 비밀번호는 bcrypt가 아니라 평문 비교 구조

```sql
SELECT ID, NAME, EMAIL, OK FROM LOGIN;
```

비밀번호 전체 출력은 피한다.

## 글쓰기/수정/삭제가 로그인으로 이동함

원인:

- `requireLogin()`이 적용된 보호 라우트이다.

해결:

- 로그인 후 다시 시도한다.

## 한글이 PowerShell 출력에서 깨져 보임

원인:

- 콘솔 코드페이지/인코딩 표시 문제일 수 있다.
- 파일 자체는 UTF-8로 관리한다.

확인:

```powershell
Get-Content README.md -Encoding UTF8
```

## `npm run format:check` 실패

원인:

- Prettier 기준과 맞지 않는 파일이 있다.

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
- 설치하지 않은 환경에서는 필수 검증이 아니므로 `npm run lint`, `npm run verify:app`를 우선한다.

## `npm run security:semgrep` 실패

원인:

- Semgrep이 설치되어 있지 않을 수 있다.

해결:

- Semgrep 설치 후 실행한다.
- 현재 명령은 선택 보안 검사 용도이다.

## VSCode 디버깅이 시작되지 않음

확인할 것:

- `.vscode/launch.json` 존재 여부
- `.env` 존재 여부
- Node.js 설치 여부
- OracleDB 접속 환경변수 설정 여부

VSCode에서 `Debug Express` 구성을 선택해 실행한다.
