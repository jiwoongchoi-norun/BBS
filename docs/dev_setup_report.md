# Dev Setup Report

## Environment Variables

- `NODE_ENV=development` for local `http://localhost` testing.
- `NODE_ENV=production` enables the session cookie `secure` option and should be used only behind HTTPS.
- `SESSION_SECRET` must be set in `.env`; the app does not use a hardcoded fallback.

## 설치된 개발 도구

| 도구     | 용도                  |
| -------- | --------------------- |
| ESLint   | JavaScript lint       |
| Prettier | 코드/문서 포맷        |
| nodemon  | 개발 서버 자동 재시작 |
| dotenv   | 환경변수 로딩         |
| bcrypt   | 비밀번호 해시         |
| multer   | 파일 업로드           |
| oracledb | OracleDB 연결         |

## npm scripts

| 명령                       | 설명                                 |
| -------------------------- | ------------------------------------ |
| `npm start`                | Express 서버 실행                    |
| `npm run dev`              | nodemon 개발 서버 실행               |
| `npm run lint`             | JS lint                              |
| `npm run format`           | 전체 Prettier 적용                   |
| `npm run format:check`     | Prettier 검사                        |
| `npm run audit`            | npm 취약점 검사                      |
| `npm run verify:app`       | Express 앱 로드 검증                 |
| `npm run check`            | lint, format check, audit 연속 실행  |
| `npm run security:secrets` | gitleaks 설치 환경에서 secret scan   |
| `npm run security:semgrep` | semgrep 설치 환경에서 보안 패턴 scan |

## 실행 전 필수 조건

1. Node.js 설치
2. OracleDB XE 실행
3. `.env` 작성
4. `npm install`
5. DB 스키마 실행

## 권장 검증 순서

```powershell
npm run lint
npm run format:check
npm run verify:app
npm start
```

브라우저에서 `http://localhost:3000/bbs/list`를 확인합니다.
