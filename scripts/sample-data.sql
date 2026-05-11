INSERT INTO LOGIN (ID, PASSWORD, NAME, EMAIL, OK)
VALUES ('admin', '1234', '관리자', 'admin@example.com', 1);

INSERT INTO BBS (NO, TITLE, CONTENT, WRITER, REGDATE, OK)
VALUES (BBS_SEQ.NEXTVAL, '첫 게시글', '샘플 게시글입니다.', 'admin', SYSDATE, 1);

COMMIT;
