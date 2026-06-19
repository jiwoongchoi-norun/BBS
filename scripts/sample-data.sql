INSERT INTO login (id, password, salt, password_algo, password_updated_at, name, email, role, ok)
VALUES (
  'admin',
  'gkJAFXEUx/pnA9WonZOpVRPtcAdivxo7/ulK5RN0VxRUAslVPkN9eZb3J+4MLlpBR7F2YVpZrwVEIR8kNUanMw==',
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
