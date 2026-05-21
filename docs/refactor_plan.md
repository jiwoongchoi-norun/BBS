# Refactor Plan

## 21단계 조사 요약

- 조사일: 2026-05-22
- 조사 대상: `routes/bbs.js`
- 검색 패턴:
  - `oracledb\.getConnection`
  - `withConnection\(`
  - `router\.(get|post)\(`

## 남은 callback 기반 `oracledb.getConnection`

| 위치                 | 라우트                     | SQL 성격                                    | 분류        | 비고                                                                         |
| -------------------- | -------------------------- | ------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `routes/bbs.js:892`  | `GET /bbs/check-id`        | `SELECT COUNT(*) FROM LOGIN WHERE ID = :id` | SELECT-only | 22단계에서 `asyncHandler + withConnection()` 전환 완료. transaction 불필요.  |
| `routes/bbs.js:1039` | `POST /bbs/signupsave-old` | DB 접근 없음                                | Deprecated  | 24단계에서 DB INSERT 실행 경로를 차단하고 `/bbs/signup` redirect로 대체했다. |

현재 `routes/bbs.js`의 callback 기반 `oracledb.getConnection` 사용처는 0개다.

## 이미 `withConnection()` 기반으로 정리된 주요 라우트

- 회원/인증: `POST /bbs/logincheck`, `POST /bbs/signupsave`, `POST /bbs/updatesignsave`, `POST /bbs/withdraw`
- ID/비밀번호: `POST /bbs/find-id`, `POST /bbs/reset-password/request`, `POST /bbs/reset-password/confirm`
- 게시글 조회: `GET /bbs/list`, `GET /bbs/search`, `GET /bbs/read`, `GET /bbs/update`, `GET /bbs/download`
- 게시글 변경: `POST /bbs/save`, `POST /bbs/updatesave`, `POST /bbs/delete`
- 댓글/반응: `POST /bbs/wsave`, `POST /bbs/wreply`, `POST /bbs/wupdate`, `POST /bbs/wdelete`, `POST /bbs/reaction`

## 다음 정리 우선순위

1. Deprecated 처리된 `POST /bbs/signupsave-old`의 최종 제거 시점을 결정한다.
   - 24단계에서 DB INSERT 실행 경로는 차단했다.
   - 라우트는 호환성 확인 기간 동안 남겨둔다.

2. callback 스타일이 남은 비-DB wrapper 라우트를 점검한다.
   - `upload.single(...)` callback, `req.session.destroy(...)`, `res.download(...)`는 라이브러리 callback이므로 DB connection 누수와는 별도다.
   - 기능 변경 없이 유지할지, Promise wrapper로 정리할지 라우트별로 판단한다.

3. `routes/bbs.js`의 라우터 분리 범위를 작게 잡는다.
   - 회원/게시글/댓글 단위로 나누되, 제출 안정성을 위해 한 번에 한 영역씩 이동한다.

## 25단계 최종 검증 상태

- `git diff --check`: 통과
- `npm run verify:app`: 통과 (`app loaded`)
- `npm run lint`: 통과
- `npm run format:check`: 통과
- Prettier 적용 범위: `app.js`, `DESIGN.md`, `public/stylesheets/style.css`, `scripts/sync-notion.js`
- 포맷 변경은 Prettier 정렬과 줄바꿈 중심이며 기능 로직 변경은 하지 않았다.
