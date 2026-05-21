# BBS 코드 리뷰 및 개선 제안

작성일: 2026-05-21  
리뷰 기준: 과제 제출용 Node.js + Express + EJS + OracleDB 게시판 프로젝트

## 총평

이 프로젝트는 과제 요구사항을 충족하는 데 필요한 기능을 상당히 넓게 구현했다. 게시글 CRUD, 회원, 세션, 댓글, 파일 업로드, 검색, 페이징뿐 아니라 bcrypt, CSRF, 권한 체크, 입력값 검증까지 들어가 있어 단순 과제 코드치고는 기능 범위가 넓다.

다만 현재 구조는 `routes/bbs.js` 하나에 라우팅, 검증, SQL, 권한 확인, 파일 처리, 화면 렌더링이 모두 모여 있다. 지금은 동작 확인과 제출에는 유리하지만, 기능이 더 늘어나면 수정 비용과 버그 위험이 빠르게 커지는 구조다. 앞으로 개선한다면 "기능 추가"보다 "작게 나누고 테스트하기 쉬운 구조 만들기"가 가장 중요하다.

## 잘한 점

### 1. 과제 요구사항 충족 범위가 넓다

필수 게시판 기능뿐 아니라 댓글, 대댓글, 좋아요/싫어요, 파일 업로드, ID 찾기, 비밀번호 재설정, 회원 탈퇴까지 구현되어 있다. GitHub 제출용으로 봤을 때 단순 CRUD 예제보다 완성도가 높아 보인다.

### 2. 보안 개선 의식이 있다

좋은 선택이 여러 개 있다.

- 비밀번호를 bcrypt로 저장한다.
- 기존 SHA-512 계정은 로그인 성공 시 bcrypt로 자동 전환한다.
- `SESSION_SECRET`이 없으면 앱을 시작하지 않는다.
- SQL에 bind variable을 많이 사용한다.
- 검색 컬럼과 정렬 컬럼을 whitelist로 제한한다.
- CSRF token을 `/bbs` 라우터에 적용했다.
- 게시글/댓글 수정, 삭제, 다운로드에 작성자 권한 체크가 있다.
- 업로드 파일은 확장자와 MIME type allowlist를 확인한다.

과제 프로젝트에서 이 정도까지 챙긴 것은 좋은 방향이다.

### 3. 환경 변수 분리가 되어 있다

`app.js`와 `config/dbconfig.js`에서 `.env` 기반 설정을 사용하고, DB 접속 정보와 session secret을 코드에 직접 쓰지 않는다. GitHub에 올릴 프로젝트로는 이 부분이 중요하다.

### 4. 문서화가 잘 되어 있다

`README.md`, `docs/requirements_summary.md`, `docs/architecture.md`, `docs/schema_summary.md`, `docs/test_plan.md`가 있어 요구사항, 구조, DB, 테스트 흐름을 추적할 수 있다. 과제 제출물로는 코드만 있는 것보다 훨씬 설득력이 있다.

### 5. UI 공통 요소를 분리했다

`views/bbs/partials`에 `head`, `nav`, `flash`, `footer`가 분리되어 있어 화면 전체 톤을 맞추기 쉽다. EJS 프로젝트에서는 이런 작은 분리만 해도 유지보수성이 꽤 올라간다.

## 아쉬운 점

### 1. `routes/bbs.js`가 너무 크다

`routes/bbs.js`는 약 2,342줄이고, 라우트가 32개 정도 들어 있다. `oracledb.getConnection`은 약 25번, `connection.execute`는 약 49번 반복된다.

현재 문제:

- 라우트 하나를 고치다가 다른 기능을 건드릴 위험이 크다.
- SQL, 검증, 권한, 화면 렌더링이 섞여 있어 읽는 속도가 느리다.
- 공통 에러 처리와 connection release 패턴이 중복된다.
- 테스트를 붙이기 어렵다.

권장 방향:

- 라우터를 기능별로 분리한다.
- DB 접근을 작은 helper 또는 repository 함수로 분리한다.
- 입력 검증과 권한 체크를 middleware/helper로 분리한다.

예시 구조:

```text
routes/
├─ bbs/
│  ├─ index.js
│  ├─ posts.routes.js
│  ├─ auth.routes.js
│  ├─ comments.routes.js
│  ├─ files.routes.js
│  └─ reactions.routes.js
services/
├─ posts.service.js
├─ auth.service.js
├─ comments.service.js
db/
├─ oracle.js
└─ repositories/
   ├─ posts.repository.js
   ├─ users.repository.js
   └─ comments.repository.js
```

과제 제출 직전이라면 대규모 분리는 위험하다. 제출 후 개선 과제로 잡는 것이 좋다.

### 2. callback 중첩이 많아 흐름 파악이 어렵다

현재 OracleDB 호출이 callback 기반이라 중첩이 깊다. 특히 로그인, 글 저장, 상세 조회, 댓글/반응 처리처럼 SQL이 여러 번 이어지는 라우트는 읽기 어렵고 에러 처리도 반복된다.

개선 방향:

- `async/await` 기반으로 라우터를 정리한다.
- `withConnection()` helper를 만들어 connection release를 자동화한다.
- 공통 에러 처리는 `next(err)`로 넘긴다.

예시:

```js
async function withConnection(callback) {
  const connection = await oracledb.getConnection(dbconfig);
  try {
    return await callback(connection);
  } finally {
    await connection.close();
  }
}
```

이렇게 바꾸면 라우트의 핵심 로직이 훨씬 선명해진다.

### 3. transaction 경계가 약하다

`oracledb.autoCommit = true`로 되어 있어 SQL 하나마다 자동 커밋된다. 단일 SQL 작업은 괜찮지만, 여러 SQL이 하나의 업무 단위인 경우 문제가 생길 수 있다.

위험한 예:

- 게시글 저장 후 파일 메타데이터 저장 실패
- 대댓글 저장 후 부모 댓글 `CHILD_COUNT` 업데이트 실패
- 비밀번호 재설정에서 비밀번호 변경 후 token 사용 처리 실패
- 게시글 삭제 후 첨부파일 row 비활성화 실패

개선 방향:

- 여러 SQL이 하나의 업무라면 `autoCommit = false`로 처리한다.
- 성공 시 `commit()`, 실패 시 `rollback()`을 명확히 호출한다.
- 최소한 글 저장 + 파일 저장, 비밀번호 재설정, 댓글 답글 저장은 transaction으로 묶는 것이 좋다.

### 4. GET으로 삭제하는 라우트는 좋지 않다

`GET /bbs/delete`로 게시글 삭제를 처리한다. 기능은 동작하지만 HTTP 의미와 보안 관점에서는 아쉽다.

문제:

- GET은 조회용이어야 한다.
- 링크 미리보기, 크롤러, 브라우저 재요청 등으로 의도치 않은 삭제 요청이 생길 수 있다.
- CSRF 방어도 POST form에 비해 약해지기 쉽다.

개선 방향:

- `POST /bbs/delete` 또는 `POST /bbs/:id/delete`로 변경한다.
- 삭제 버튼은 form submit으로 처리하고 CSRF token을 포함한다.
- 기존 URL 호환이 필요하면 GET은 삭제 확인 화면만 보여준다.

### 5. 비밀번호 재설정 토큰을 화면에 보여주는 방식은 시연용에만 적합하다

현재 비밀번호 재설정은 과제 시연용으로 reset link를 화면에 표시한다. 문서에 명시되어 있어 과제 맥락에서는 괜찮지만, 실제 서비스에서는 부적합하다.

개선 방향:

- 실제 이메일 발송 또는 관리자 승인 흐름으로 변경한다.
- token은 DB에 평문 저장하지 말고 hash 저장을 고려한다.
- token 재사용 방지, 만료, 시도 횟수 제한을 강화한다.

### 6. 세션 저장소가 기본 MemoryStore일 가능성이 높다

`express-session`을 사용하지만 별도 session store 설정은 없다. 개발/과제 환경에서는 괜찮지만, 운영 환경에서는 기본 MemoryStore를 쓰면 안 된다.

문제:

- 서버 재시작 시 로그인 세션이 모두 사라진다.
- 다중 서버 환경에서 세션 공유가 안 된다.
- 메모리 증가 문제가 생길 수 있다.

개선 방향:

- 과제에서는 현재 구조 유지 가능
- 실서비스라면 Redis, DB 기반 session store 적용

### 7. 라우트와 화면 이름이 일부 오래된 과제 스타일에 묶여 있다

`updatesignup`, `updatesignsave`, `brdno`, `bbsw` 같은 이름은 과제 코드에서는 익숙하지만, 처음 보는 사람이 이해하기에는 직관성이 떨어진다.

개선 방향:

- 외부 URL은 유지하더라도 내부 함수명은 의미 중심으로 정리한다.
- 예: `updatesignsave` -> `updateProfile`, `brdno` -> `postId`, `bbsw` -> `comment`

### 8. 화면 템플릿이 일부 크다

`views/bbs/read.ejs`는 약 23KB, `views/bbs/list.ejs`는 약 16KB다. 화면 하나에 조건문, modal, form, 반복 출력이 많이 들어가면 수정이 어려워진다.

개선 방향:

- 댓글 영역 partial 분리
- 파일 목록 partial 분리
- reaction 버튼 partial 분리
- pagination partial 분리
- 삭제/수정 modal partial 분리

EJS에서도 partial을 잘게 나누면 프론트엔드 프레임워크 없이도 가독성이 좋아진다.

## 우선순위별 개선안

### P0. 제출 전에 반드시 확인할 것

아래는 코드 구조보다 제출 안정성에 직접 영향을 준다.

- `npm run verify:app`
- `npm run lint`
- `npm run format:check`
- OracleDB schema/migration 적용 확인
- 로그인 후 글쓰기/수정/삭제/댓글/파일 업로드 수동 테스트
- 비로그인 상태에서 보호 기능 접근 시 로그인으로 이동하는지 확인
- 다른 사용자 글/댓글 수정 삭제가 막히는지 확인
- 허용되지 않은 확장자 업로드가 막히는지 확인

### P1. 가장 먼저 고칠 만한 것

효과 대비 위험이 낮은 개선이다.

- `GET /bbs/delete`를 POST 삭제로 변경
- 공통 DB helper 추가
- `requireLogin`, `renderBadRequest`, `renderForbidden` 같은 helper를 별도 파일로 분리
- 긴 EJS 화면을 partial로 분리
- 업로드 에러 메시지와 validation 메시지를 한곳에서 관리
- README와 docs의 실행 방법을 실제 제출 절차와 계속 동기화

### P2. 유지보수성을 크게 올리는 개선

조금 더 시간이 있을 때 추천한다.

- `routes/bbs.js`를 게시글/회원/댓글/파일/반응 라우터로 분리
- OracleDB callback 코드를 `async/await`로 전환
- repository/service 계층 도입
- transaction이 필요한 업무 단위 정리
- 수동 테스트를 일부 자동화 테스트로 전환
- API 요청/응답 에러 처리 형식 통일

### P3. 실서비스 수준으로 갈 때 필요한 개선

과제 범위를 넘지만, 최신 백엔드 프로젝트 관점에서는 중요하다.

- Redis 또는 DB 기반 session store 적용
- Helmet, rate limit, 로그인 실패 제한 강화
- 구조화 로깅 도입
- 파일 업로드 바이러스 스캔 또는 외부 저장소 분리
- 비밀번호 재설정 이메일 발송 및 token hash 저장
- 관리자 기능과 감사 로그
- CI에서 lint, format, test, secret scan 자동 실행

## 코드 가독성 개선 포인트

### 변수명

현재 `brdno`, `bbsno`, `wno`, `rows`, `result` 같은 이름이 많다. 짧은 이름은 빠르게 작성하기 좋지만, 기능이 늘어나면 의미 추적이 어렵다.

권장:

- `brdno` -> `postId`
- `bbsno` -> `postId`
- `wno` -> `commentId`
- `rows` -> `postRows`, `commentRows`, `fileRows`
- `sql` -> `findPostSql`, `updatePostSql`, `insertCommentSql`

### 함수 분리

현재도 `cleanText`, `toValidNumber`, `validatePostInput` 같은 helper는 좋다. 이 방향을 더 밀고 가면 된다.

추가 분리 후보:

- `getPostById`
- `getCommentsByPostId`
- `getFilesByPostId`
- `assertPostOwner`
- `createPost`
- `updatePost`
- `softDeletePost`
- `createComment`
- `toggleReaction`

### 에러 처리

connection release와 `next(err)`가 여러 곳에 반복된다. 이 반복을 줄이면 코드가 짧아지고 누락 가능성도 줄어든다.

권장:

- `withConnection()` helper
- `asyncHandler()` helper
- DB 에러는 내부 로그에만 상세 기록
- 사용자 화면에는 일반화된 메시지 출력

## 보안 관점 평가

현재 과제 프로젝트 기준으로는 보안 개선이 꽤 많이 되어 있다. 특히 bcrypt, bind variable, CSRF, 권한 체크, 파일 allowlist는 좋은 점이다.

다만 실서비스 기준으로는 아래가 남는다.

- GET 삭제 라우트 제거
- session store 교체
- 로그인 실패 rate limit
- 비밀번호 재설정 token hash 저장
- transaction 처리
- 업로드 파일 저장소 격리
- 보안 헤더 적용
- 자동화된 보안 테스트

## 유지보수 관점 평가

가장 큰 병목은 코드가 한 파일에 몰려 있다는 점이다. 기능이 많아질수록 다음 문제가 커진다.

- 특정 라우트 수정 시 주변 코드 탐색 비용 증가
- SQL 수정 후 영향 범위 파악 어려움
- 테스트 작성 난이도 증가
- 신규 기능 추가 시 중복 코드 증가

따라서 앞으로는 기능을 더 넣기보다 먼저 구조를 작게 나누는 것이 좋다.

## 추천 리팩토링 순서

1. `GET /bbs/delete`를 POST로 변경한다.
2. `db/oracle.js`에 `withConnection()` helper를 만든다.
3. 게시글 목록/상세/작성/수정/삭제 SQL을 `repositories/posts.repository.js`로 옮긴다.
4. `routes/bbs.js`에서 게시글 라우트만 `routes/bbs/posts.routes.js`로 분리한다.
5. 댓글 라우트와 reaction 라우트를 분리한다.
6. `read.ejs`, `list.ejs`의 반복 UI를 partial로 분리한다.
7. 핵심 흐름에 최소 자동화 테스트를 추가한다.

## 결론

현재 코드는 "과제 요구사항을 빠르게 완성한 게시판"으로는 꽤 좋다. 기능 범위가 넓고, 보안 개선도 단순 과제 수준을 넘어서 있다.

하지만 "유지보수 가능한 백엔드 프로젝트"로 보면 `routes/bbs.js` 집중도가 가장 큰 약점이다. 지금 당장 모든 구조를 바꾸기보다는, 제출 안정성을 유지하면서 삭제 라우트, DB helper, EJS partial 분리처럼 위험이 낮은 개선부터 진행하는 것이 현실적이다.

가장 좋은 다음 단계는 기능 추가가 아니라 다음 세 가지다.

1. 라우터 분리
2. DB 접근 helper/repository 분리
3. transaction과 테스트 정리
