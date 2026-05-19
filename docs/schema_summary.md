# OracleDB Schema Summary

## RESET_TOKEN Update

`RESET_TOKEN` stores password reset tokens for the assignment-only reset flow.

| Column | Purpose |
| ------ | ------- |
| `NO` | Reset token row number, PK |
| `USER_ID` | Login account ID |
| `TOKEN` | Random reset token |
| `EXPIRES_AT` | Token expiration time |
| `USED` | Token use status, 0 active and 1 used |
| `REGDATE` | Token creation time |
| `USEDATE` | Token use time |

Supporting objects:

- `RESET_TOKEN_SEQ`
- `UX_RESET_TOKEN_TOKEN` on `RESET_TOKEN(TOKEN)`
- `IDX_RESET_TOKEN_USER` on `RESET_TOKEN(USER_ID)`
- `FK_RESET_TOKEN_LOGIN` from `RESET_TOKEN.USER_ID` to `LOGIN.ID`

Reset tokens expire after 1 hour. Existing active tokens for the same user are marked used before a new token is inserted.

## 목적

현재 BBS 프로젝트에서 사용하는 OracleDB 테이블과 마이그레이션 기준을 정리합니다. 신규 DB는 `scripts/schema.sql`, 기존 DB 보강은 `scripts/migration.sql`을 기준으로 합니다.

## 주요 테이블

| 테이블         | 역할                        |
| -------------- | --------------------------- |
| `LOGIN`        | 회원, 로그인, 비밀번호 해시 |
| `BBS`          | 게시글                      |
| `BBSW`         | 댓글과 대댓글               |
| `BBS_REACTION` | 게시글 좋아요/싫어요 기록   |
| `BBS_FILE`     | 첨부파일 메타데이터         |

## LOGIN

| 컬럼                  | 용도                            |
| --------------------- | ------------------------------- |
| `ID`                  | 회원 ID, PK                     |
| `PASSWORD`            | bcrypt 또는 legacy SHA-512 해시 |
| `SALT`                | legacy SHA-512 계정 검증용      |
| `PASSWORD_ALGO`       | `bcrypt` 또는 `sha512`          |
| `PASSWORD_UPDATED_AT` | 비밀번호 갱신 시각              |
| `LOGIN_FAILED_COUNT`  | 확장용 로그인 실패 횟수         |
| `LAST_LOGIN_AT`       | 최근 로그인 시각                |
| `NAME`                | 이름                            |
| `EMAIL`               | 이메일                          |
| `OK`                  | 계정 활성 상태                  |

신규 가입과 회원정보 수정은 bcrypt만 저장합니다. 기존 SHA-512 계정은 로그인 성공 시 bcrypt로 전환됩니다.

## BBS

| 컬럼            | 용도             |
| --------------- | ---------------- |
| `NO`            | 게시글 번호, PK  |
| `TITLE`         | 제목             |
| `CONTENT`       | 본문             |
| `WRITER`        | 작성자 ID        |
| `REGDATE`       | 작성일           |
| `VIEW_COUNT`    | 조회수           |
| `LIKE_COUNT`    | 좋아요 수        |
| `DISLIKE_COUNT` | 싫어요 수        |
| `OK`            | 게시글 활성 상태 |

삭제는 `OK = 0` soft delete 방식입니다.

## BBSW

| 컬럼            | 용도               |
| --------------- | ------------------ |
| `NO`            | 댓글 번호, PK      |
| `BBSNO`         | 게시글 번호        |
| `PARENT_NO`     | 부모 댓글 번호     |
| `WRITER`        | 작성자 ID          |
| `CONTENT`       | 댓글 내용          |
| `DEPTH`         | 댓글 깊이          |
| `CHILD_COUNT`   | 자식 댓글 수       |
| `LIKE_COUNT`    | 댓글 좋아요 확장용 |
| `DISLIKE_COUNT` | 댓글 싫어요 확장용 |
| `REGDATE`       | 작성일             |
| `UPDATEDATE`    | 수정일             |
| `OK`            | 댓글 활성 상태     |

## BBS_REACTION

| 컬럼            | 용도                  |
| --------------- | --------------------- |
| `BBSNO`         | 게시글 번호           |
| `USER_ID`       | 추천 사용자 ID        |
| `REACTION_TYPE` | `LIKE` 또는 `DISLIKE` |
| `REGDATE`       | 최초 추천 시각        |
| `UPDATEDATE`    | 추천 전환 시각        |

`(BBSNO, USER_ID)` 기본키로 동일 사용자의 중복 추천을 방지합니다.

## BBS_FILE

| 컬럼            | 용도             |
| --------------- | ---------------- |
| `NO`            | 파일 번호, PK    |
| `BBSNO`         | 게시글 번호      |
| `ORG_FILENAME`  | 원본 파일명      |
| `SAVE_FILENAME` | 서버 저장 파일명 |
| `FILEPATH`      | 저장 경로        |
| `FILESIZE`      | 파일 크기        |
| `MIMETYPE`      | MIME 타입        |
| `REGDATE`       | 업로드 시각      |
| `OK`            | 파일 활성 상태   |

## 추천 인덱스

| 인덱스                  | 대상                    | 이유                    |
| ----------------------- | ----------------------- | ----------------------- |
| `IDX_BBS_OK_NO`         | `BBS(OK, NO)`           | 목록/페이징             |
| `IDX_BBS_WRITER`        | `BBS(WRITER)`           | 작성자 조회와 권한 체크 |
| `IDX_BBSW_BBSNO`        | `BBSW(BBSNO)`           | 게시글별 댓글 조회      |
| `IDX_BBSW_PARENT_NO`    | `BBSW(PARENT_NO)`       | 대댓글 트리 조회        |
| `IDX_BBSW_WRITER`       | `BBSW(WRITER)`          | 댓글 권한 체크          |
| `IDX_BBS_REACTION_USER` | `BBS_REACTION(USER_ID)` | 사용자별 추천 기록      |
| `IDX_BBS_FILE_BBSNO`    | `BBS_FILE(BBSNO)`       | 게시글별 파일 조회      |

## 실행 파일

```sql
@scripts/schema.sql
@scripts/sample-data.sql
@scripts/migration.sql
@scripts/rollback.sql
```

## 주의사항

- `rollback.sql`은 데이터 삭제나 DROP TABLE을 하지 않습니다.
- FK는 기존 데이터 보존을 위해 `ENABLE NOVALIDATE` 기준으로 추가합니다.
- 실제 제출 전에는 OracleDB에서 테이블과 컬럼 존재 여부를 한 번 더 확인합니다.
