# Notion 문서 자동 동기화 설정

이 프로젝트는 `docs/**/*.md` 파일이 `main` 브랜치에 push될 때 GitHub Actions를 통해 Notion 페이지 아래로 자동 동기화되도록 구성하였다.

## 동작 방식

- 대상 파일: `docs/**/*.md`
- 실행 조건: `main` 브랜치에 docs Markdown 파일 변경 push
- 실행 파일: `scripts/sync-notion.js`
- 워크플로 파일: `.github/workflows/sync-notion.yml`
- Notion 대상 부모 페이지: GitHub Secret `NOTION_PARENT_PAGE_ID`
- Notion API 토큰: GitHub Secret `NOTION_TOKEN`
- 기본 동기화 위치: `NOTION_PARENT_PAGE_ID`로 지정한 `BBS_Project` 페이지 바로 아래

각 Markdown 파일은 Notion 부모 페이지 아래의 하위 페이지로 생성된다. 하위 페이지 제목은 Markdown 파일의 첫 번째 H1 제목을 우선 사용하고, H1이 없으면 파일명을 사용한다.

이미 같은 제목의 하위 페이지가 있으면 새로 만들지 않고 기존 페이지 내용을 지운 뒤 최신 Markdown 내용으로 다시 업로드한다.

현재 기본 구조는 다음과 같다.

```text
BBS_Project 페이지
├─ 11week 개발 진행 보고서
├─ architecture
└─ ...
```

`NOTION_PARENT_PAGE_ID`는 docs 문서를 넣을 최종 대상 페이지 ID를 사용한다.

## 1. Notion Integration 생성

1. Notion Developers 페이지에 접속한다.
2. 새 Integration을 생성한다.
3. Integration 이름을 입력한다.
4. 연결할 Workspace를 선택한다.
5. 생성 후 Internal Integration Token을 복사한다.

이 토큰은 GitHub Secrets에만 저장하고, `.env`나 코드에 직접 적지 않는다.

## 2. Notion 페이지에 Integration 연결

1. Notion에서 Markdown 문서를 모을 부모 페이지를 만든다.
2. 해당 페이지 우측 상단의 `...` 메뉴를 연다.
3. `Add connections` 또는 연결 추가 메뉴에서 방금 만든 Integration을 선택한다.
4. Integration이 페이지에 접근할 수 있도록 허용한다.

Integration을 부모 페이지에 연결하지 않으면 GitHub Actions에서 페이지를 찾거나 하위 페이지를 만들 수 없다.

## 3. 부모 페이지 ID 확인

Notion 페이지 URL에서 페이지 ID를 확인한다.

```text
https://www.notion.so/workspace/Page-Title-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

마지막의 32자리 문자열이 페이지 ID이다. 하이픈이 포함된 UUID 형식이어도 사용할 수 있다.

```text
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

또는

```text
aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
```

현재 연결하려는 Notion URL이 다음과 같다면:

```text
https://www.notion.so/BBS_Project-36467ed6853580d4a545eb62e86d4675?source=copy_link
```

GitHub Secret `NOTION_PARENT_PAGE_ID`에는 아래 값을 등록하면 된다.

```text
36467ed6853580d4a545eb62e86d4675
```

## 4. GitHub Secrets 등록

GitHub 저장소에서 다음 경로로 이동한다.

```text
Settings → Secrets and variables → Actions → New repository secret
```

다음 두 개의 Secret을 등록한다.

| Secret 이름 | 값 |
| --- | --- |
| `NOTION_TOKEN` | Notion Integration Token |
| `NOTION_PARENT_PAGE_ID` | Notion 대상 부모 페이지 ID |

민감정보는 절대 커밋하지 않는다.

## 5. 수동 실행 방법

로컬에서 테스트하고 싶다면 환경변수를 설정한 뒤 스크립트를 실행한다.

PowerShell 예시:

```powershell
$env:NOTION_TOKEN="secret_xxx"
$env:NOTION_PARENT_PAGE_ID="36467ed6853580d4a545eb62e86d4675"
node scripts/sync-notion.js
```

Git Bash 또는 Linux/macOS 예시:

```bash
NOTION_TOKEN="secret_xxx" \
NOTION_PARENT_PAGE_ID="36467ed6853580d4a545eb62e86d4675" \
node scripts/sync-notion.js
```

로컬 테스트 시에도 토큰과 페이지 ID를 `.env`, Markdown 문서, 코드에 저장하지 않는다.

## 6. 주의사항

- Notion Integration이 부모 페이지에 연결되어 있어야 한다.
- 같은 제목의 하위 페이지가 있으면 기존 페이지 내용이 최신 Markdown 내용으로 교체된다.
- Notion API 제한 때문에 블록은 100개 단위로 나누어 업로드한다.
- 복잡한 Markdown 표는 Notion 표가 아니라 코드블록 형태로 동기화될 수 있다.
- 이미지 파일 업로드까지 자동 변환하지는 않는다.

마지막 동기화 테스트: 2026-05-18 direct-page mode 확인
