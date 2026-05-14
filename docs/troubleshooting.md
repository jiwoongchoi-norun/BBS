# Troubleshooting

## 서버가 켜지지 않을 때

1. `.env` 존재 여부 확인
2. OracleDB 실행 여부 확인
3. `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` 확인
4. 포트 3000 사용 중인지 확인

```powershell
netstat -ano | Select-String ':3000'
```

## app load가 실패할 때

```powershell
npm run verify:app
```

실패하면 require error, router error, syntax error를 먼저 확인합니다.

## OracleDB 연결 실패

- Oracle XE 서비스가 실행 중인지 확인합니다.
- 접속 문자열이 `localhost/XEPDB1`인지 `localhost/XE`인지 환경에 맞게 확인합니다.
- 계정 권한과 비밀번호를 확인합니다.

## 로그인 실패

- 신규 계정은 bcrypt hash인지 확인합니다.
- 기존 계정은 `PASSWORD_ALGO`, `SALT`가 legacy 구조와 맞는지 확인합니다.
- 비밀번호 원문은 DB나 문서에 출력하지 않습니다.

```sql
SELECT ID, PASSWORD_ALGO, SALT, OK
FROM LOGIN
WHERE ID = '확인할ID';
```

## 좋아요/싫어요를 눌렀는데 조회수가 오를 때

정상 동작은 추천 수만 바뀌고 조회수는 유지되는 것입니다. `routes/bbs.js`의 아래 흐름을 확인합니다.

- `redirectReadWithoutViewCount()`
- `createSkipViewCountToken()`
- `shouldSkipViewCount()`
- `GET /bbs/read`
- `POST /bbs/reaction`

## 파일 업로드 실패

- 허용 확장자인지 확인합니다.
- 파일 크기가 10MB 이하인지 확인합니다.
- `uploads/bbs` 폴더가 생성되어 있는지 확인합니다.

## 문자가 깨져 보일 때

PowerShell 콘솔 코드페이지 문제일 수 있습니다. VS Code에서 UTF-8로 파일을 열어 확인합니다.

```powershell
chcp 65001
```
