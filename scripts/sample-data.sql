INSERT INTO LOGIN (ID, PASSWORD, SALT, NAME, EMAIL, OK)
VALUES (
  'admin',
  'zACoQfcn9zAU7FfnIcxLVH0Uo0fyQLu0V6MUCli6gOubrRi9RXDhT2M/NMAsAQ+6OyLPB3Pp13cjv1quBlZw5w==',
  'sample-salt',
  '관리자',
  'admin@example.com',
  1
);

INSERT INTO BBS (NO, TITLE, CONTENT, WRITER, REGDATE, VIEW_COUNT, OK)
VALUES (BBS_SEQ.NEXTVAL, '첫 게시글', '샘플 게시글입니다.', 'admin', SYSDATE, 0, 1);

COMMIT;
