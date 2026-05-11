# BBS 게시판

Node.js, Express, EJS, OracleDB 기반 게시판 프로젝트입니다.

## 실행 준비

1. Node.js를 설치합니다.
2. Oracle DB를 실행하고 접속 가능한 계정을 준비합니다.
3. 프로젝트 폴더에서 의존성을 설치합니다.

```powershell
cd C:\BBS\bbs
npm install
```

4. `.env.example`을 복사해서 `.env`를 만들고 본인 PC의 DB 정보로 수정합니다.

```powershell
Copy-Item .env.example .env
```

`.env` 예시:

```env
PORT=3000
SESSION_SECRET=change-me
DB_USER=TEST_USER
DB_PASSWORD=change-me
DB_CONNECT_STRING=localhost/XEPDB1
```

5. Oracle DB에 필요한 테이블과 샘플 데이터를 생성합니다.

```sql
@scripts/schema.sql
@scripts/sample-data.sql
```

6. 서버를 실행합니다.

```powershell
npm start
```

브라우저에서 `http://localhost:3000/bbs/list`로 접속합니다.

## Windows 본컴에서 이어서 개발하기

```powershell
git clone <GitHub 저장소 URL>
cd bbs
npm install
Copy-Item .env.example .env
notepad .env
npm start
```

`.env`에는 본컴 Oracle DB 접속 정보에 맞게 `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING`을 설정해야 합니다.

## Git에 올리지 않는 파일

- `node_modules/`
- `.env`
- npm debug log
- 임시 파일
- 빌드/커버리지 산출물

DB 비밀번호는 코드에 직접 작성하지 않고 `.env`에서 읽습니다. `.env.example`은 예시 파일이라 Git에 올려도 되지만, 실제 `.env`는 올리면 안 됩니다.

## DB 스크립트

- `scripts/schema.sql`: 테이블과 시퀀스 생성
- `scripts/sample-data.sql`: 개발용 샘플 데이터

Oracle DB 자체 데이터 파일은 Git으로 옮기지 않습니다.
