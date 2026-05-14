# 개발 환경 분석 보고서

## 1. 분석 목적

현재 BBS 프로젝트의 개발 환경, 자동화 도구, 검증 루틴을 정리한다. 기준 환경은 Windows + WSL2 + VSCode Remote-SSH + Codex CLI다.

## 2. 현재 개발 환경

| 항목            | 상태               |
| --------------- | ------------------ |
| OS              | Windows, WSL2 사용 |
| Editor          | VSCode             |
| Remote          | VSCode Remote-SSH  |
| Assistant       | Codex CLI          |
| Version Control | Git                |
| Runtime         | Node.js            |
| DB              | OracleDB           |

## 3. npm scripts

```json
{
  "start": "node ./bin/www",
  "dev": "nodemon ./bin/www",
  "lint": "eslint app.js config/**/*.js routes/**/*.js bin/www",
  "format": "prettier . --write",
  "format:check": "prettier . --check",
  "audit": "npm audit --audit-level=moderate",
  "security:semgrep": "semgrep scan --config auto",
  "security:secrets": "gitleaks detect --source . --redact",
  "verify:app": "node -e \"require('./app'); console.log('app loaded')\"",
  "check": "npm run lint && npm run format:check && npm run audit"
}
```

## 4. 주요 패키지

| 구분        | 패키지            | 현재 사용 상태         |
| ----------- | ----------------- | ---------------------- |
| 서버        | `express`         | 사용 중                |
| 템플릿      | `ejs`             | 사용 중                |
| DB          | `oracledb`        | 사용 중                |
| 세션        | `express-session` | 사용 중                |
| 환경변수    | `dotenv`          | 사용 중                |
| 로깅        | `morgan`          | 사용 중                |
| 쿠키        | `cookie-parser`   | 사용 중                |
| 에러        | `http-errors`     | 사용 중                |
| 비밀번호    | `bcrypt`          | 런타임 사용 중         |
| 파일 업로드 | `multer`          | 사용 중                |
| 개발 서버   | `nodemon`         | `npm run dev`에서 사용 |
| Lint        | `eslint`          | 사용 중                |
| Format      | `prettier`        | 사용 중                |

## 5. VSCode 설정

`.vscode/`에는 다음 파일이 있다.

- `extensions.json`
- `launch.json`
- `settings.json`

권장 확장:

- ESLint
- Prettier
- Remote - SSH
- GitLens
- GitHub Pull Requests
- Oracle Developer Tools
- Thunder Client
- Error Lens

## 6. 검증 루틴

일상 검증:

```powershell
npm run lint
npm run verify:app
```

제출 전 검증:

```powershell
npm run format:check
npm run audit
```

선택 보안 검증:

```powershell
npm run security:secrets
npm run security:semgrep
```

`security:*` 명령은 gitleaks와 Semgrep이 설치된 환경에서만 실행한다.

## 7. 현재 개발환경 이슈

- 자동화 테스트가 아직 없다.
- OracleDB가 필요하므로 로컬 테스트 재현성이 낮다.
- `npm run check`는 npm audit 결과에 따라 실패할 수 있다.
- Windows/WSL2/Remote-SSH 혼용 시 경로와 인코딩 문제를 주의해야 한다.

## 8. 개선 계획

1. `node --test` 또는 Playwright 기반 smoke test 추가
2. OracleDB 테스트 데이터 초기화 스크립트 정리
3. 보안 스캔 도구 설치 방법 문서화
4. 제출 전 문서/코드 전체 포맷 정리
