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

## 교수님 최종본 `COUNT` 컬럼과 현재 `VIEW_COUNT` 컬럼 차이

증상:

- 교수님 최종본 코드를 일부 참고해 붙이면 `ORA-00904: "COUNT": invalid identifier` 또는 `VIEW_COUNT` 오류가 날 수 있다.

원인:

- 교수님 최종본은 `BBS.COUNT`를 조회수로 사용한다.
- 현재 프로젝트는 `BBS.VIEW_COUNT`를 조회수로 사용한다.

해결:

- 현재 프로젝트 코드 기준으로는 `VIEW_COUNT`를 유지한다.
- 교수님 최종본의 페이징/댓글만 참고하고 조회수 컬럼명은 그대로 복사하지 않는다.
- 제출용 SQL과 라우트에서 조회수 컬럼명을 하나로 통일한다.

## `BBSW` 또는 `BBSW_SEQ` 없음 오류

증상:

- 댓글 구현 후 `ORA-00942: table or view does not exist`
- `ORA-02289: sequence does not exist`

원인:

- 현재 `scripts/schema.sql`에는 교수님 최종본의 댓글 테이블 `BBSW`와 sequence `BBSW_SEQ`가 없다.

해결:

- 댓글 기능 구현 단계에서 `scripts/schema.sql`에 `BBSW`, `BBSW_SEQ`를 추가한다.
- 기존 DB에는 별도 ALTER/CREATE 스크립트를 제공한다.

## 신규 가입 계정 로그인 실패 가능성

증상:

- 회원가입은 성공했지만 같은 비밀번호로 로그인 실패

원인:

- 회원가입은 SHA-512 + salt 해시를 저장하지만, 현재 로그인 코드는 `SALT`를 조회하지 않고 입력 비밀번호와 DB 비밀번호를 직접 비교한다.
- 현재 `scripts/schema.sql`의 `LOGIN` 테이블에도 `SALT` 컬럼이 없다.

해결:

- bcrypt로 저장/검증을 통일하거나, 임시로 교수님 최종본처럼 `SALT` 컬럼과 SHA-512 + salt 검증을 일치시킨다.
- 제출 전에는 신규 가입, 로그아웃, 재로그인을 반드시 캡처 테스트한다.

## `views/error.ejs` errcode 관련 오류

증상:

- 에러 화면 렌더링 중 `errcode is not defined` 또는 분기 오류가 발생할 수 있다.

원인:

- 일부 라우트는 `views/error.ejs`를 렌더링하고, 일부 교수님 코드 흐름은 `views/bbs/error.ejs`를 렌더링한다.
- 현재 Express error handler는 `errcode: 0`을 전달하도록 보완되어 있으나, 라우트 추가 시 누락될 수 있다.

해결:

- 일반 서버 오류는 `views/error.ejs`, 과제용 alert 오류는 `views/bbs/error.ejs`로 역할을 분리한다.
- 직접 렌더링할 때는 항상 필요한 `errcode` 값을 전달한다.

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
