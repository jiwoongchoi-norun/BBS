# Codex 작업 루틴

## 기본 원칙

- 실제 프로젝트 루트는 `C:\BBS\BBS`이다.
- 작업 전 `docs/requirements_summary.md`와 관련 파일만 확인한다.
- 한 번에 한 기능 또는 한 문서 작업 단위만 수정한다.
- `.env` 전체 내용은 출력하지 않는다.
- `node_modules`, `.git`, `package-lock.json` 세부 diff는 읽지 않는다.
- 사용자 변경은 되돌리지 않는다.

## 수정 전 확인

```powershell
git status --short
rg "확인할_키워드" app.js routes views config scripts docs
```

## 코드 수정 후 검증

```powershell
npm run lint
npm run verify:app
```

## 문서 수정 후 검증

```powershell
npx prettier README.md NOTION.md docs/*.md --check
```

필요하면 문서만 포맷한다.

```powershell
npx prettier README.md NOTION.md docs/*.md --write
```

## 제출 전 검증

```powershell
npm run format:check
npm run audit
```

선택 보안 도구가 설치된 환경에서는 다음 명령을 추가로 실행한다.

```powershell
npm run security:secrets
npm run security:semgrep
```

## VSCode 디버깅

1. `.env`에 `SESSION_SECRET`, `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING`을 설정한다.
2. VSCode에서 `Debug Express` 구성을 실행한다.
3. 브라우저에서 `http://localhost:3000/bbs/list`로 접속한다.

## 보고 형식

작업 완료 보고에는 다음을 포함한다.

- 현재 프로젝트 상태 분석
- 수정 대상 파일 목록
- 각 파일별 수정 내용
- 실행한 검증 명령
- 남은 위험 또는 다음 작업
- 추천 git commit 메시지
