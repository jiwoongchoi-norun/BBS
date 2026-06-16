# DB 스키마 요약

최종 업데이트: 2026-05-19

## 적용 기준

- 신규 DB: `scripts/schema.sql` 실행 후 `scripts/sample-data.sql` 실행
- 기존 DB: `scripts/migration.sql` 실행
- 되돌리기 참고: `scripts/rollback.sql`

## 테이블

| 테이블         | 역할                 | 주요 컬럼                                                                                                                               |
| -------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `LOGIN`        | 회원 계정            | `ID`, `PASSWORD`, `SALT`, `PASSWORD_ALGO`, `NAME`, `EMAIL`, `PHONE`, `OK`, `PASSWORD_UPDATED_AT`, `LOGIN_FAILED_COUNT`, `LAST_LOGIN_AT` |
| `BBS`          | 게시글               | `NO`, `TITLE`, `CONTENT`, `WRITER`, `REGDATE`, `VIEW_COUNT`, `LIKE_COUNT`, `DISLIKE_COUNT`, `OK`                                        |
| `BBSW`         | 댓글/대댓글          | `NO`, `BBSNO`, `PARENT_NO`, `DEPTH`, `WRITER`, `CONTENT`, `REGDATE`, `UPDATEDATE`, `OK`                                                 |
| `BBS_REACTION` | 좋아요/싫어요        | `BBSNO`, `USER_ID`, `REACTION_TYPE`, `REGDATE`, `UPDATEDATE`                                                                            |
| `BBS_FILE`     | 첨부파일 메타데이터  | `NO`, `BBSNO`, `ORG_FILENAME`, `SAVE_FILENAME`, `FILEPATH`, `FILESIZE`, `MIMETYPE`, `REGDATE`, `OK`                                     |
| `RESET_TOKEN`  | 비밀번호 재설정 토큰 | `NO`, `USER_ID`, `TOKEN`, `EXPIRES_AT`, `USED`, `REGDATE`, `USEDATE`                                                                    |

## 시퀀스와 인덱스

| 객체                    | 용도                           |
| ----------------------- | ------------------------------ |
| `BBS_SEQ`               | 게시글 번호                    |
| `BBSW_SEQ`              | 댓글 번호                      |
| `BBS_FILE_SEQ`          | 첨부파일 번호                  |
| `RESET_TOKEN_SEQ`       | reset token 번호               |
| `IDX_BBS_REACTION_USER` | 사용자별 추천 조회 보조        |
| `IDX_BBS_FILE_BBSNO`    | 게시글별 첨부파일 조회 보조    |
| `UX_RESET_TOKEN_TOKEN`  | reset token 중복 방지          |
| `IDX_RESET_TOKEN_USER`  | 사용자별 reset token 조회 보조 |

## 관계

- `BBS.WRITER` -> `LOGIN.ID`
- `BBSW.BBSNO` -> `BBS.NO`
- `BBSW.PARENT_NO` -> `BBSW.NO`
- `BBSW.WRITER` -> `LOGIN.ID`
- `BBS_REACTION.BBSNO` -> `BBS.NO`
- `BBS_REACTION.USER_ID` -> `LOGIN.ID`
- `BBS_FILE.BBSNO` -> `BBS.NO`
- `RESET_TOKEN.USER_ID` -> `LOGIN.ID`

마이그레이션은 기존 데이터를 고려해 일부 FK를 `ENABLE NOVALIDATE`로 추가한다.

## 상태 컬럼 정책

- `LOGIN.OK = 1`: 활성 계정
- `LOGIN.OK = 0`: 탈퇴 계정
- `BBS.OK = 1`: 활성 게시글
- `BBS.OK = 0`: 삭제 게시글
- `BBSW.OK = 1`: 활성 댓글
- `BBSW.OK = 0`: 삭제 댓글
- `BBS_FILE.OK = 1`: 활성 첨부파일
- `BBS_FILE.OK = 0`: 비활성 첨부파일
- `RESET_TOKEN.USED = 0`: 사용 가능 토큰
- `RESET_TOKEN.USED = 1`: 사용 완료 또는 폐기 토큰

## 비밀번호 저장 정책

- 신규 계정은 `PASSWORD_ALGO = 'bcrypt'`, `SALT = NULL`
- 기존 SHA-512 계정은 로그인 성공 시 bcrypt로 자동 전환
- 전환 후 `PASSWORD_UPDATED_AT = SYSDATE`

## 주의사항

- `LOGIN.ID`는 작성자 FK와 맞추기 위해 `VARCHAR2(100)` 기준으로 확장되어 있다.
- reset token은 개발용이며 실제 이메일 발송 기능은 없다.
- 첨부파일 물리 파일은 DB rollback만으로 복구되지 않는다.
- `rollback.sql`은 주로 FK/index 제거 참고용이며 모든 컬럼/데이터를 원상복구하지 않는다.
