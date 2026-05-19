# Notion 문서 자동 동기화

최종 업데이트: 2026-05-19

이 프로젝트는 `docs/**/*.md` 파일이 `main` 브랜치에 push되면 GitHub Actions를 통해 Notion 하위 페이지로 동기화할 수 있다.

## 동작 방식

- 대상 파일: `docs/**/*.md`
- 실행 조건: `main` 브랜치에 docs Markdown 변경 push
- 실행 스크립트: `scripts/sync-notion.js`
- 워크플로 파일: `.github/workflows/sync-notion.yml`
- Notion 부모 페이지 ID: GitHub Secret `NOTION_PARENT_PAGE_ID`
- Notion API token: GitHub Secret `NOTION_TOKEN`

각 Markdown 파일은 Notion 부모 페이지 아래의 하위 페이지로 생성 또는 갱신된다. 하위 페이지 제목은 Markdown 첫 번째 H1을 우선 사용하고, H1이 없으면 파일명을 사용한다.

## GitHub Secrets

GitHub repository settings에서 다음 secrets를 등록한다.

```text
NOTION_TOKEN=secret_...
NOTION_PARENT_PAGE_ID=...
```

token과 page id는 `.env`, README, 문서 본문에 실제 값으로 기록하지 않는다.

## Notion 설정 순서

1. Notion Developers에서 Internal Integration을 만든다.
2. Integration token을 복사해 GitHub Secret `NOTION_TOKEN`으로 등록한다.
3. 문서를 모을 Notion 부모 페이지를 만든다.
4. 부모 페이지의 `Add connections`에서 방금 만든 Integration을 연결한다.
5. 부모 페이지 URL에서 page id를 확인해 `NOTION_PARENT_PAGE_ID`로 등록한다.

## 주의사항

- Integration이 부모 페이지에 연결되어 있지 않으면 페이지 조회와 생성이 실패한다.
- 같은 제목의 하위 페이지가 있으면 새 페이지를 만들지 않고 기존 페이지 내용을 갱신한다.
- 중복 문서를 줄이기 위해 기준 문서만 docs에 유지한다.
- 대량 문서 변경 후에는 GitHub Actions 로그에서 동기화 성공 여부를 확인한다.
