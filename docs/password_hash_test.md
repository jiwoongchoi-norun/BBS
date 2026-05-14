# Password Hash Test

## 목적

bcrypt 기반 신규 비밀번호 저장과 기존 SHA-512 + salt 계정의 자동 마이그레이션 동작을 확인하기 위한 문서입니다.

## 현재 전략

| 계정 유형        | 저장 방식      | 로그인 처리                          |
| ---------------- | -------------- | ------------------------------------ |
| 신규 가입        | bcrypt         | `bcrypt.compare()`                   |
| 회원정보 수정 후 | bcrypt         | `bcrypt.compare()`                   |
| 기존 legacy 계정 | SHA-512 + salt | SHA-512 검증 성공 후 bcrypt로 재저장 |

## 확인 쿼리

비밀번호 원문은 출력하지 않습니다.

```sql
SELECT ID, PASSWORD_ALGO, SALT, PASSWORD_UPDATED_AT, LAST_LOGIN_AT, OK
FROM LOGIN
ORDER BY ID;
```

## 신규 계정 테스트

1. 회원가입 화면에서 신규 계정 생성
2. 로그인
3. 아래 쿼리 실행

```sql
SELECT ID, PASSWORD_ALGO, SALT
FROM LOGIN
WHERE ID = '신규ID';
```

기대 결과:

- `PASSWORD_ALGO = 'bcrypt'`
- `SALT IS NULL`
- `PASSWORD`는 `$2a$`, `$2b$`, `$2y$` 계열 bcrypt prefix

## legacy 계정 테스트

1. SHA-512 + salt 방식으로 저장된 기존 계정 준비
2. 기존 비밀번호로 로그인
3. 로그인 성공 후 다시 쿼리 확인

기대 결과:

- 로그인 전: `PASSWORD_ALGO = 'sha512'`, `SALT` 존재
- 로그인 후: `PASSWORD_ALGO = 'bcrypt'`, `SALT = NULL`
- 기존 사용자는 로그인 불가 상태가 되지 않아야 함

## 롤백 관점

이미 bcrypt로 전환된 비밀번호는 원래 SHA-512 + salt 값으로 되돌릴 수 없습니다. 이 프로젝트의 `rollback.sql`은 컬럼/테이블 삭제가 아니라 FK와 인덱스 중심 되돌림 참고용입니다.
