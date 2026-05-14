# OracleDB Schema Summary

## 목적

현재 BBS 프로젝트의 기존 DB를 유지하면서 신규 기능에 필요한 구조를 보강하기 위한 스키마 요약이다. 신규 DB는 `scripts/schema.sql`을 사용하고, 이미 운영/실습 데이터가 있는 DB는 `scripts/migration.sql`을 사용한다.

## 현재 코드가 사용하는 주요 테이블

| 테이블         | 역할                        | 현재 코드 사용                             |
| -------------- | --------------------------- | ------------------------------------------ |
| `LOGIN`        | 회원, 로그인, 회원정보 수정 | ID/PASSWORD/SALT 기반 로그인               |
| `BBS`          | 게시글                      | 목록, 검색, 상세, 작성, 수정, 삭제, 조회수 |
| `BBSW`         | 댓글/대댓글                 | 댓글 목록, 작성, 대댓글, 삭제              |
| `BBS_REACTION` | 게시글 추천 기록            | 사용자별 좋아요/싫어요 중복 방지           |
| `BBS_FILE`     | 첨부파일                    | 업로드 파일 메타데이터, 다운로드           |

## 보강 대상 요약

### LOGIN

기존 SHA-512 + salt 구조와 bcrypt 전환을 모두 고려한다.

| 컬럼                  | 목적                                         |
| --------------------- | -------------------------------------------- |
| `SALT`                | 기존 SHA-512 + salt 계정 로그인 검증용       |
| `PASSWORD_ALGO`       | `sha512`, `bcrypt` 등 비밀번호 알고리즘 구분 |
| `PASSWORD_UPDATED_AT` | 비밀번호 변경 시각                           |
| `LOGIN_FAILED_COUNT`  | 로그인 실패 카운트 확장 후보                 |
| `LAST_LOGIN_AT`       | 최근 로그인 시각 확장 후보                   |

`PASSWORD`는 bcrypt 해시와 향후 알고리즘 prefix를 고려해 `VARCHAR2(255)`로 확장한다.
`ID`는 작성자 FK 호환성을 위해 `BBS.WRITER`, `BBSW.WRITER`와 같은 `VARCHAR2(100)`으로 확장한다.
신규 계정은 `PASSWORD_ALGO = 'bcrypt'`, `SALT = NULL`로 저장하고, 기존 `sha512` 계정은 로그인 성공 시 bcrypt로 자동 전환한다.

### BBS

| 컬럼            | 목적             |
| --------------- | ---------------- |
| `VIEW_COUNT`    | 조회수           |
| `LIKE_COUNT`    | 게시글 좋아요 수 |
| `DISLIKE_COUNT` | 게시글 싫어요 수 |

현재 코드에서는 `VIEW_COUNT`, `LIKE_COUNT`, `DISLIKE_COUNT`를 사용한다.

### BBS_REACTION

게시글별 사용자 추천 기록을 저장한다. `(BBSNO, USER_ID)`를 기본키로 두어 한 사용자가 한 게시글에 하나의 반응만 남길 수 있게 한다.

| 컬럼            | 목적                    |
| --------------- | ----------------------- |
| `BBSNO`         | 게시글 번호             |
| `USER_ID`       | 추천한 회원 ID          |
| `REACTION_TYPE` | `LIKE` 또는 `DISLIKE`   |
| `REGDATE`       | 최초 추천 시각          |
| `UPDATEDATE`    | 좋아요/싫어요 전환 시각 |

권장 FK:

- `BBS_REACTION.BBSNO -> BBS.NO`
- `BBS_REACTION.USER_ID -> LOGIN.ID`

처리 흐름:

- 기록 없음: `BBS_REACTION` insert 후 `BBS.LIKE_COUNT` 또는 `BBS.DISLIKE_COUNT` 증가
- 같은 기록 있음: `BBS_REACTION` delete 후 해당 카운트 감소
- 반대 기록 있음: `BBS_REACTION.REACTION_TYPE` update 후 기존 카운트 감소, 새 카운트 증가

### BBSW

댓글과 대댓글을 한 테이블에서 관리한다.

| 컬럼            | 목적                        |
| --------------- | --------------------------- |
| `BBSNO`         | 원 게시글 번호              |
| `PARENT_NO`     | 부모 댓글 번호, 대댓글 구조 |
| `DEPTH`         | 댓글 깊이                   |
| `CHILD_COUNT`   | 자식 댓글 수                |
| `LIKE_COUNT`    | 댓글 좋아요 수              |
| `DISLIKE_COUNT` | 댓글 싫어요 수              |
| `OK`            | soft delete 상태            |

권장 FK:

- `BBSW.BBSNO -> BBS.NO`
- `BBSW.PARENT_NO -> BBSW.NO`
- `BBSW.WRITER -> LOGIN.ID`

기존 데이터 보존을 위해 migration은 `ENABLE NOVALIDATE`로 FK를 추가한다. 기존 orphan 데이터는 유지하고, 신규/수정 데이터부터 제약을 적용한다.

### BBS_FILE

첨부파일 자체는 `uploads/bbs`에 저장하고, DB에는 메타데이터만 저장한다.

| 컬럼            | 목적             |
| --------------- | ---------------- |
| `BBSNO`         | 원 게시글 번호   |
| `ORG_FILENAME`  | 원본 파일명      |
| `SAVE_FILENAME` | 서버 저장 파일명 |
| `FILEPATH`      | 상대 파일 경로   |
| `FILESIZE`      | 파일 크기        |
| `MIMETYPE`      | MIME 타입        |
| `OK`            | soft delete 상태 |

권장 FK:

- `BBS_FILE.BBSNO -> BBS.NO`

## 추천 인덱스

| 인덱스                  | 대상                    | 이유                    |
| ----------------------- | ----------------------- | ----------------------- |
| `IDX_BBS_OK_NO`         | `BBS(OK, NO)`           | 목록/페이징             |
| `IDX_BBS_WRITER`        | `BBS(WRITER)`           | 작성자 검색, 권한 체크  |
| `IDX_BBSW_BBSNO`        | `BBSW(BBSNO)`           | 게시글별 댓글 조회      |
| `IDX_BBSW_PARENT_NO`    | `BBSW(PARENT_NO)`       | 대댓글 트리 조회        |
| `IDX_BBSW_WRITER`       | `BBSW(WRITER)`          | 댓글 작성자 권한 체크   |
| `IDX_BBS_REACTION_USER` | `BBS_REACTION(USER_ID)` | 사용자별 추천 기록 조회 |
| `IDX_BBS_FILE_BBSNO`    | `BBS_FILE(BBSNO)`       | 게시글별 파일 조회      |

## 실행 방법

기존 DB 보강:

```sql
@scripts/migration.sql
```

비파괴 rollback:

```sql
@scripts/rollback.sql
```

`rollback.sql`은 DROP TABLE을 하지 않고 데이터가 들어갈 수 있는 컬럼/테이블도 제거하지 않는다. FK와 인덱스만 제거해 마이그레이션 영향 범위를 되돌린다.

## 주의사항

- `DROP TABLE`을 사용하지 않는다.
- 기존 데이터를 삭제하지 않는다.
- FK는 기존 데이터 불일치를 막기 위해 `ENABLE NOVALIDATE`로 추가한다.
- bcrypt 전환 시 앱 코드에서 `PASSWORD_ALGO`를 기준으로 기존 SHA-512 계정과 bcrypt 계정을 구분해야 한다.
- 실제 운영 전에는 orphan 데이터 확인 쿼리를 먼저 실행하는 것이 좋다.
