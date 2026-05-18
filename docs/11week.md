# 11week 개발 진행 보고서

## 1. 주차 개요

이번 주차 목표는 게시판에서 실제 서비스 형태에 가까운 핵심 기능을 추가하는 것이다. 단순 CRUD에서 끝나는 것이 아니라, 회원 비밀번호 암호화, 게시글 조회수, 페이징, 댓글, 파일 업로드처럼 DB와 서버 로직이 함께 움직이는 기능을 중심으로 구현하였다.

이번 주차에 사용한 주요 기술은 다음과 같다.

| 구분 | 사용 기술 |
| --- | --- |
| 서버 | Node.js, Express |
| 화면 | EJS, Bootstrap |
| 데이터베이스 | OracleDB |
| 세션 | express-session |
| 비밀번호 처리 | crypto 기반 SHA-512 호환 로직, bcrypt 저장 |
| 파일 업로드 | multer |

현재 프로젝트 구조는 다음과 같이 정리된다.

```text
BBS/
├─ app.js
├─ routes/
│  └─ bbs.js
├─ views/
│  └─ bbs/
│     ├─ list.ejs
│     ├─ read.ejs
│     └─ form.ejs
├─ config/
│  └─ dbconfig.js
├─ scripts/
│  ├─ schema.sql
│  └─ migration.sql
└─ docs/
   └─ 11week.md
```

이번 주차 작업은 `routes/bbs.js`에서 서버 로직을 구현하고, `views/bbs/*.ejs`에서 화면을 연결하며, `scripts/schema.sql`과 `scripts/migration.sql`에서 필요한 DB 구조를 준비하는 방식으로 진행하였다.

## 2. DB 암호화 구현

수업 진도에서는 `crypto` 모듈을 사용한 SHA-512 기반 암호화 흐름을 학습하였다. 핵심은 회원가입 시 salt를 생성하고, 비밀번호와 salt를 조합하여 해시값을 만든 뒤 DB에 저장하는 것이다.

현재 프로젝트에서는 이 흐름을 이해한 상태에서, 실제 신규 회원 저장은 더 안전한 `bcrypt` 방식으로 구현하였다. 다만 기존 SHA-512 + salt 방식 계정도 로그인할 수 있도록 호환 검증 함수를 남겨 두었고, 로그인 성공 시 bcrypt 방식으로 전환할 수 있는 구조를 준비하였다.

### DB 구조

`LOGIN` 테이블에는 비밀번호 해시값, salt, 사용 알고리즘 정보를 저장할 수 있도록 컬럼을 구성하였다.

```sql
CREATE TABLE LOGIN (
  ID VARCHAR2(100) PRIMARY KEY,
  PASSWORD VARCHAR2(255) NOT NULL,
  SALT VARCHAR2(100),
  PASSWORD_ALGO VARCHAR2(20) DEFAULT 'bcrypt' NOT NULL,
  PASSWORD_UPDATED_AT DATE,
  LOGIN_FAILED_COUNT NUMBER(10) DEFAULT 0 NOT NULL,
  LAST_LOGIN_AT DATE,
  NAME VARCHAR2(100) NOT NULL,
  EMAIL VARCHAR2(200),
  OK NUMBER(1) DEFAULT 1 NOT NULL
);
```

기존 DB에 컬럼을 추가해야 하는 경우에는 마이그레이션에서 다음과 같은 방향으로 처리한다.

```sql
ALTER TABLE LOGIN ADD (
  SALT VARCHAR2(100),
  PASSWORD_ALGO VARCHAR2(20) DEFAULT 'bcrypt' NOT NULL,
  PASSWORD_UPDATED_AT DATE
);
```

### SHA-512 + salt 호환 코드

기존 방식 계정 검증을 위해 SHA-512 해시 함수를 유지하였다.

```js
function createPasswordHash(password, salt) {
  return crypto
    .createHash('sha512')
    .update(password + salt)
    .digest('base64');
}
```

이 방식은 다음 흐름으로 동작한다.

```text
회원가입 또는 기존 계정 생성
→ salt 생성
→ 입력 비밀번호 + salt 조합
→ SHA-512 해시 생성
→ LOGIN.PASSWORD, LOGIN.SALT에 저장
```

로그인할 때는 DB에서 salt를 가져온 뒤 같은 방식으로 다시 해시하여 저장된 해시값과 비교한다.

```text
로그인 요청
→ LOGIN 테이블에서 ID 조회
→ 저장된 salt 확인
→ 입력 비밀번호 + salt 재해시
→ DB의 PASSWORD 값과 비교
→ 일치하면 로그인 성공
```

### 현재 프로젝트의 bcrypt 저장 코드

현재 신규 회원가입과 회원정보 수정은 bcrypt만 저장하도록 구현하였다.

```js
var bcryptSaltRounds = 12;

function createBcryptPassword(password, callback) {
  bcrypt.hash(password, bcryptSaltRounds, callback);
}
```

회원가입 저장 시에는 사용자가 입력한 비밀번호를 바로 저장하지 않고, bcrypt 해시값을 만든 뒤 `LOGIN` 테이블에 저장한다.

```js
var sql =
  'INSERT INTO LOGIN(ID,PASSWORD,NAME,EMAIL,PHONE,SALT,PASSWORD_ALGO,PASSWORD_UPDATED_AT) ' +
  "VALUES(:id,:password,:name,:email,:phone,NULL,'bcrypt',SYSDATE)";

createBcryptPassword(pw1, function (err, hashPassword) {
  connection.execute(sql, {
    id: id,
    password: hashPassword,
    name: name,
    email: email,
    phone: phone
  });
});
```

로그인 검증에서는 저장된 비밀번호가 bcrypt 형식이면 `bcrypt.compare()`로 확인한다.

```js
function isBcryptPassword(algo, storedPassword) {
  return algo === 'bcrypt' || /^\$2[aby]\$/.test(storedPassword || '');
}

bcrypt.compare(pw, storedPassword, function (err, isMatch) {
  if (isMatch) {
    req.session.user = {
      id: id,
      name: rowName
    };
  }
});
```

기존 평문 비밀번호 방식은 DB가 노출되면 비밀번호가 그대로 유출되는 문제가 있다. 반면 해시 방식은 원본 비밀번호를 저장하지 않기 때문에 안전하다. 특히 salt를 사용하면 같은 비밀번호라도 사용자마다 다른 해시값이 만들어지고, bcrypt는 내부적으로 salt와 반복 연산을 처리하기 때문에 단순 SHA-512보다 보안성이 더 좋다.

## 3. 게시글 조회수 기능

게시글 조회수는 게시글 상세 페이지에 접근할 때마다 증가하도록 구현하였다. 수업 자료에서는 `READCOUNT`라는 컬럼명을 사용하지만, 현재 프로젝트에서는 `VIEW_COUNT` 컬럼명으로 적용하였다.

### DB 구조

```sql
CREATE TABLE BBS (
  NO NUMBER PRIMARY KEY,
  TITLE VARCHAR2(200) NOT NULL,
  CONTENT CLOB,
  WRITER VARCHAR2(100) NOT NULL,
  REGDATE DATE DEFAULT SYSDATE NOT NULL,
  VIEW_COUNT NUMBER DEFAULT 0 NOT NULL,
  LIKE_COUNT NUMBER(10) DEFAULT 0 NOT NULL,
  DISLIKE_COUNT NUMBER(10) DEFAULT 0 NOT NULL,
  OK NUMBER(1) DEFAULT 1 NOT NULL
);
```

기존 테이블에 조회수 컬럼을 추가하는 SQL은 다음과 같다.

```sql
ALTER TABLE BBS ADD (
  VIEW_COUNT NUMBER DEFAULT 0 NOT NULL
);
```

### 라우터 코드

`/bbs/read` 라우터에서 게시글 번호를 받은 뒤, 상세 내용을 조회하기 전에 조회수를 1 증가시킨다.

```js
var updateSql =
  'UPDATE BBS SET VIEW_COUNT = NVL(VIEW_COUNT, 0) + 1 WHERE OK = 1 AND NO = :brdno';

var sql =
  'SELECT NO, TITLE, CONTENT, ' +
  "WRITER, to_char(REGDATE,'yyyy-mm-dd'), VIEW_COUNT, " +
  'NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0) ' +
  ' FROM BBS' +
  ' WHERE OK = 1 AND NO = :brdno';

connection.execute(updateSql, { brdno: brdno }, function (err) {
  connection.execute(sql, { brdno: brdno }, function (err, rows) {
    res.render('bbs/read', rows);
  });
});
```

목록 화면에서는 `VIEW_COUNT`를 함께 조회하여 `list.ejs`에서 조회수 컬럼으로 출력하도록 수정하였다.

```sql
SELECT NO, TITLE, WRITER, CONTENT,
       TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss'),
       VIEW_COUNT, OK
FROM BBS
WHERE OK = 1
ORDER BY NO DESC;
```

동작 흐름은 다음과 같다.

```text
list.ejs에서 게시글 제목 클릭
→ /bbs/read?brdno=게시글번호 요청
→ BBS.VIEW_COUNT 1 증가
→ 게시글 상세 데이터 조회
→ read.ejs에서 조회수 출력
```

## 4. 게시판 페이징

게시글이 많아질 경우 전체 데이터를 한 번에 조회하면 성능이 떨어지고 화면도 복잡해진다. 이를 해결하기 위해 OracleDB의 `OFFSET/FETCH` 문법을 사용하여 필요한 범위의 게시글만 조회하도록 구현하였다.

### 페이징 SQL

```sql
SELECT NO, TITLE, WRITER, CONTENT,
       TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss'),
       VIEW_COUNT, OK,
       NVL(LIKE_COUNT, 0),
       NVL(DISLIKE_COUNT, 0)
FROM BBS
WHERE OK = 1
ORDER BY NO DESC
OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY;
```

### 현재 코드 흐름

```js
var totalCount = countResult.rows[0][0];
var totalPage = Math.ceil(totalCount / paging.pageSize);

if (totalPage > 0 && paging.currentPage > totalPage) {
  paging.currentPage = totalPage;
}

var offset = (paging.currentPage - 1) * paging.pageSize;

var sql =
  "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), " +
  'VIEW_COUNT, OK, NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0) ' +
  'FROM BBS WHERE OK = 1 ORDER BY ' +
  sortInfo.orderBy +
  ' OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY';

connection.execute(sql, {
  offset: offset,
  pageSize: paging.pageSize
});
```

페이지 번호 처리 방식은 다음과 같다.

```text
현재 페이지 번호(page) 확인
→ 페이지당 게시글 수(pageSize) 확인
→ 전체 게시글 수 COUNT
→ totalPage 계산
→ offset 계산
→ OFFSET/FETCH로 목록 조회
→ list.ejs에서 페이지 번호 출력
```

현재 구현 상태에서는 목록과 검색 결과 모두 페이징이 동작하도록 구성되어 있다. 또한 `pageSize` 값을 10, 20, 30, 50개 중 선택할 수 있도록 준비하였다.

추가 개선 예정 사항은 다음과 같다.

- 검색 결과에서 페이지 이동 시 검색어 유지 여부 최종 점검
- 정렬 조건과 페이징 조건이 함께 유지되는지 확인
- 게시글 수가 많을 때 인덱스 성능 점검
- 페이지 번호 UI 정리

## 5. 댓글 기능

댓글 기능은 게시글 상세 화면에서 사용자가 의견을 작성할 수 있도록 구현하였다. 현재 프로젝트에서는 댓글 전용 테이블인 `BBSW`를 사용한다.

### DB 구조

```sql
CREATE TABLE BBSW (
  NO NUMBER(10) PRIMARY KEY,
  BBSNO NUMBER(10) NOT NULL,
  PARENT_NO NUMBER(10),
  WRITER VARCHAR2(100) NOT NULL,
  CONTENT VARCHAR2(4000) NOT NULL,
  DEPTH NUMBER(3) DEFAULT 0 NOT NULL,
  CHILD_COUNT NUMBER(10) DEFAULT 0 NOT NULL,
  LIKE_COUNT NUMBER(10) DEFAULT 0 NOT NULL,
  DISLIKE_COUNT NUMBER(10) DEFAULT 0 NOT NULL,
  REGDATE DATE DEFAULT SYSDATE NOT NULL,
  UPDATEDATE DATE,
  OK NUMBER(1) DEFAULT 1 NOT NULL
);

CREATE SEQUENCE BBSW_SEQ START WITH 1 INCREMENT BY 1;

CREATE INDEX IDX_BBSW_BBSNO ON BBSW(BBSNO);
CREATE INDEX IDX_BBSW_PARENT_NO ON BBSW(PARENT_NO);
```

`BBSW.BBSNO`는 댓글이 어떤 게시글에 속하는지 연결하는 컬럼이다. `PARENT_NO`는 대댓글을 위한 부모 댓글 번호이고, `DEPTH`는 댓글 깊이를 표현하기 위한 값이다.

### 댓글 조회 SQL

게시글 상세 조회 시 댓글도 함께 조회한다. Oracle 계층형 쿼리인 `START WITH`, `CONNECT BY`를 사용하여 부모 댓글과 대댓글 순서를 맞춘다.

```sql
SELECT NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH,
       LIKE_COUNT, DISLIKE_COUNT,
       TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE
FROM BBSW
WHERE BBSNO = :bbsno
  AND OK = 1
START WITH PARENT_NO IS NULL
CONNECT BY PRIOR NO = PARENT_NO
ORDER SIBLINGS BY NO ASC;
```

### 댓글 작성 코드

일반 댓글은 `PARENT_NO`를 `NULL`로 저장하고, `DEPTH`는 0으로 저장한다.

```js
var sql =
  'INSERT INTO BBSW (NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, REGDATE, OK) ' +
  'VALUES (BBSW_SEQ.NEXTVAL, :bbsno, NULL, :writer, :content, 0, SYSDATE, 1)';

connection.execute(sql, {
  bbsno: bbsno,
  writer: writer,
  content: content
});
```

대댓글은 부모 댓글 번호를 `PARENT_NO`에 저장하고, 부모 댓글의 `DEPTH`보다 1 큰 값으로 저장한다.

```js
var parentSql = 'SELECT DEPTH FROM BBSW WHERE NO = :parentNo AND BBSNO = :bbsno AND OK = 1';
var depth = parentRows.rows[0][0] + 1;

var insertSql =
  'INSERT INTO BBSW (NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, REGDATE, OK) ' +
  'VALUES (BBSW_SEQ.NEXTVAL, :bbsno, :parentNo, :writer, :content, :depth, SYSDATE, 1)';
```

`read.ejs`에서는 게시글 본문 아래에 댓글 목록과 댓글 작성 폼을 배치하였다. 로그인한 사용자만 댓글을 작성할 수 있도록 서버에서 세션을 확인한다.

추가 예정 및 점검 항목은 다음과 같다.

- 댓글 수정
- 댓글 삭제 최종 점검
- 좋아요/싫어요 최종 점검
- 대댓글 UI 정리

## 6. 파일 업로드 기능

파일 업로드는 게시글 작성 시 첨부파일을 함께 저장할 수 있도록 `multer`를 사용하여 구현하였다.

### multer 설정 코드

```js
var blockedFileExts = ['.exe', '.js', '.sh', '.bat', '.cmd', '.ps1'];

var upload = multer({
  storage: multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
      var ext = path.extname(file.originalname || '').toLowerCase();
      var saveName = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + ext;
      cb(null, saveName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: function (_req, file, cb) {
    var ext = path.extname(file.originalname || '').toLowerCase();

    if (blockedFileExts.indexOf(ext) >= 0 || allowedFileExts.indexOf(ext) < 0) {
      cb(new Error('허용하지 않는 파일 형식입니다.'));
      return;
    }

    cb(null, true);
  }
});
```

파일명은 원본 파일명을 그대로 사용하지 않고, 현재 시간과 랜덤 바이트를 조합하여 저장 파일명을 만든다. 이렇게 하면 파일명 중복 문제를 줄일 수 있다.

### 파일 업로드 SQL

첨부파일 정보는 `BBS_FILE` 테이블에 저장한다.

```sql
CREATE TABLE BBS_FILE (
  NO NUMBER(10) PRIMARY KEY,
  BBSNO NUMBER(10) NOT NULL,
  ORG_FILENAME VARCHAR2(255) NOT NULL,
  SAVE_FILENAME VARCHAR2(255) NOT NULL,
  FILEPATH VARCHAR2(500) NOT NULL,
  FILESIZE NUMBER(20) DEFAULT 0,
  MIMETYPE VARCHAR2(100),
  REGDATE DATE DEFAULT SYSDATE,
  OK NUMBER(1) DEFAULT 1
);

CREATE SEQUENCE BBS_FILE_SEQ START WITH 1 INCREMENT BY 1;
CREATE INDEX IDX_BBS_FILE_BBSNO ON BBS_FILE(BBSNO);
```

게시글 저장 후 파일이 있으면 파일 정보를 DB에 추가한다.

```js
var filePath = path.join('uploads', 'bbs', req.file.filename).replace(/\\/g, '/');

var fileSql =
  'INSERT INTO BBS_FILE ' +
  '(NO, BBSNO, ORG_FILENAME, SAVE_FILENAME, FILEPATH, FILESIZE, MIMETYPE, REGDATE, OK) ' +
  'VALUES (BBS_FILE_SEQ.NEXTVAL, :bbsno, :orgName, :saveName, :filePath, :fileSize, :mimeType, SYSDATE, 1)';

connection.execute(fileSql, {
  bbsno: bbsno,
  orgName: getUploadOriginalName(req.file),
  saveName: req.file.filename,
  filePath: filePath,
  fileSize: req.file.size,
  mimeType: req.file.mimetype
});
```

글쓰기 화면에서는 파일 전송을 위해 `multipart/form-data`를 사용해야 한다.

```html
<form action="/bbs/save" method="post" enctype="multipart/form-data">
  <input type="file" name="uploadFile">
</form>
```

파일 업로드 보안 고려 사항은 다음과 같다.

- 업로드 가능한 확장자 제한
- 실행 파일 확장자 차단
- 파일 크기 제한
- 원본 파일명과 저장 파일명 분리
- 업로드 경로를 서버에서 직접 관리

## 7. 현재까지 개선한 점

현재 프로젝트 기준으로 개선한 내용은 다음과 같다.

- Bootstrap UI 개선
- 로그인 세션 처리
- 회원가입 기능 구현
- 게시글 목록, 작성, 읽기, 수정, 삭제 구현
- 검색 기능 구현
- 비밀번호 암호화 적용
- OracleDB 연동 안정화
- 조회수 기능 추가
- 페이징 기능 추가
- 댓글 기능 추가
- 파일 업로드 기능 추가
- 작성자 권한 검증 일부 적용
- 에러 처리 흐름 개선

초기에는 게시글을 등록하고 조회하는 기본 게시판 형태였지만, 현재는 로그인 사용자 기준으로 글을 작성하고 댓글과 첨부파일까지 다룰 수 있는 구조로 확장되었다.

## 8. 추가로 준비해야 할 작업

- [ ] 댓글 수정/삭제 최종 점검
- [ ] 좋아요/싫어요 최종 점검
- [ ] 대댓글 화면 정리
- [ ] 파일 다운로드 테스트
- [ ] SQL Injection 방지(bind variable) 전체 점검
- [ ] 작성자 권한 검증 전체 점검
- [ ] 입력값 검증 보강
- [ ] bcrypt 마이그레이션 검토
- [ ] 화면 캡처 정리
- [ ] 제출용 SQL 정리

## 9. 프로젝트 진행 소감

이번 주차 기능을 구현하면서 게시판 프로젝트가 단순히 화면만 만드는 과제가 아니라는 점을 느꼈다. 비밀번호 암호화는 회원가입과 로그인 과정 전체에 영향을 주었고, salt와 해시 검증 과정을 이해하면서 보안 기능이 왜 필요한지 알 수 있었다.

조회수와 페이징은 게시판에서 당연하게 보이는 기능이지만, 실제로는 DB 컬럼 추가, SQL 수정, 라우터 처리, 화면 출력이 모두 연결되어야 했다. 특히 OracleDB의 `OFFSET/FETCH`를 사용하면서 필요한 데이터만 DB에서 가져오는 방식이 더 효율적이라는 점을 이해했다.

댓글 기능은 게시글과 댓글을 어떻게 연결할지, 대댓글을 위해 부모 댓글 번호와 깊이를 어떻게 저장할지 고민해야 했다. 파일 업로드는 `multer`를 사용하면 기본 구현은 가능하지만, 파일명 중복 처리와 확장자 제한 같은 보안 요소도 같이 고려해야 했다.

앞으로는 이미 구현한 기능을 다시 테스트하면서 제출용 SQL과 화면 캡처를 정리할 계획이다. 또한 SQL Injection 방지, 작성자 권한 검증, 입력값 검증처럼 과제 완성도를 높일 수 있는 부분도 계속 보완할 예정이다.
