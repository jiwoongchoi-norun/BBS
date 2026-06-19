INSERT INTO login (id, password, salt, password_algo, password_updated_at, name, email, role, ok)
VALUES (
  'admin',
  'zACoQfcn9zAU7FfnIcxLVH0Uo0fyQLu0V6MUCli6gOubrRi9RXDhT2M/NMAsAQ+6OyLPB3Pp13cjv1quBlZw5w==',
  'sample-salt',
  'sha512',
  CURRENT_TIMESTAMP,
  '관리자',
  'admin@example.com',
  'ADMIN',
  1
);

INSERT INTO bbs (no, title, content, writer, regdate, view_count, is_notice, ok)
VALUES (nextval('bbs_seq'), '첫 게시글', '샘플 게시글입니다.', 'admin', CURRENT_TIMESTAMP, 0, 1, 1);
