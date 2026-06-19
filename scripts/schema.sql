-- BBS PostgreSQL schema for a fresh database.
-- Passwords for new accounts are stored with bcrypt.

DROP FUNCTION IF EXISTS nvl(anyelement, anyelement);

CREATE OR REPLACE FUNCTION nvl(anycompatible, anycompatible)
RETURNS anycompatible
LANGUAGE SQL
IMMUTABLE
AS 'SELECT COALESCE($1, $2)';

CREATE TABLE login (
  id VARCHAR(100) PRIMARY KEY,
  password VARCHAR(255) NOT NULL,
  salt VARCHAR(100),
  password_algo VARCHAR(20) DEFAULT 'bcrypt' NOT NULL,
  password_updated_at TIMESTAMP,
  login_failed_count INTEGER DEFAULT 0 NOT NULL,
  last_login_at TIMESTAMP,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(30),
  nickname VARCHAR(80),
  bio VARCHAR(500),
  avatar_url VARCHAR(500),
  role VARCHAR(20) DEFAULT 'USER' NOT NULL,
  user_status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
  suspended_at TIMESTAMP,
  suspended_by VARCHAR(100),
  suspend_reason VARCHAR(500),
  ok SMALLINT DEFAULT 1 NOT NULL
);

CREATE TABLE bbs_category (
  id INTEGER PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(40) NOT NULL,
  display_order INTEGER DEFAULT 100 NOT NULL,
  is_active SMALLINT DEFAULT 1 NOT NULL,
  regdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT ux_bbs_category_slug UNIQUE (slug)
);

CREATE SEQUENCE bbs_category_seq
  START WITH 1
  INCREMENT BY 1;

INSERT INTO bbs_category(id, name, slug, display_order, is_active, regdate)
VALUES(nextval('bbs_category_seq'), '자유', 'free', 10, 1, CURRENT_TIMESTAMP);

INSERT INTO bbs_category(id, name, slug, display_order, is_active, regdate)
VALUES(nextval('bbs_category_seq'), '공지', 'notice', 20, 1, CURRENT_TIMESTAMP);

CREATE TABLE bbs (
  no INTEGER PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  writer VARCHAR(100) NOT NULL,
  category_id INTEGER,
  regdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  like_count INTEGER DEFAULT 0 NOT NULL,
  dislike_count INTEGER DEFAULT 0 NOT NULL,
  is_notice SMALLINT DEFAULT 0 NOT NULL,
  admin_hidden SMALLINT DEFAULT 0 NOT NULL,
  admin_hidden_at TIMESTAMP,
  admin_hidden_by VARCHAR(100),
  ok SMALLINT DEFAULT 1 NOT NULL
);

CREATE SEQUENCE bbs_seq
  START WITH 1
  INCREMENT BY 1;

CREATE INDEX idx_bbs_ok_no ON bbs(ok, no);
CREATE INDEX idx_bbs_notice ON bbs(ok, is_notice, no);
CREATE INDEX idx_bbs_admin_hidden ON bbs(ok, admin_hidden, no);
CREATE INDEX idx_bbs_writer ON bbs(writer);
CREATE INDEX idx_bbs_category ON bbs(category_id, ok, no);

CREATE TABLE bbsw (
  no INTEGER PRIMARY KEY,
  bbsno INTEGER NOT NULL,
  parent_no INTEGER,
  writer VARCHAR(100) NOT NULL,
  content VARCHAR(4000) NOT NULL,
  depth INTEGER DEFAULT 0 NOT NULL,
  child_count INTEGER DEFAULT 0 NOT NULL,
  like_count INTEGER DEFAULT 0 NOT NULL,
  dislike_count INTEGER DEFAULT 0 NOT NULL,
  admin_hidden SMALLINT DEFAULT 0 NOT NULL,
  admin_hidden_at TIMESTAMP,
  admin_hidden_by VARCHAR(100),
  regdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedate TIMESTAMP,
  ok SMALLINT DEFAULT 1 NOT NULL
);

CREATE SEQUENCE bbsw_seq
  START WITH 1
  INCREMENT BY 1;

CREATE INDEX idx_bbsw_bbsno ON bbsw(bbsno);
CREATE INDEX idx_bbsw_admin_hidden ON bbsw(bbsno, admin_hidden);
CREATE INDEX idx_bbsw_parent_no ON bbsw(parent_no);
CREATE INDEX idx_bbsw_writer ON bbsw(writer);

CREATE TABLE bbs_reaction (
  bbsno INTEGER NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  reaction_type VARCHAR(10) NOT NULL,
  regdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedate TIMESTAMP,
  CONSTRAINT pk_bbs_reaction PRIMARY KEY (bbsno, user_id),
  CONSTRAINT ck_bbs_reaction_type CHECK (reaction_type IN ('LIKE', 'DISLIKE'))
);

CREATE INDEX idx_bbs_reaction_user ON bbs_reaction(user_id);

CREATE TABLE bbsw_reaction (
  wno INTEGER NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  reaction_type VARCHAR(10) NOT NULL,
  regdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedate TIMESTAMP,
  CONSTRAINT pk_bbsw_reaction PRIMARY KEY (wno, user_id),
  CONSTRAINT ck_bbsw_reaction_type CHECK (reaction_type IN ('LIKE', 'DISLIKE'))
);

CREATE INDEX idx_bbsw_reaction_user ON bbsw_reaction(user_id);
CREATE INDEX idx_bbsw_reaction_wno ON bbsw_reaction(wno);

CREATE TABLE bbs_bookmark (
  bbsno INTEGER NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  regdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_bbs_bookmark PRIMARY KEY (bbsno, user_id)
);

CREATE INDEX idx_bbs_bookmark_user ON bbs_bookmark(user_id, regdate);

CREATE TABLE bbs_report (
  no INTEGER PRIMARY KEY,
  target_type VARCHAR(20) NOT NULL,
  target_id INTEGER NOT NULL,
  reporter_id VARCHAR(100) NOT NULL,
  reason_code VARCHAR(20) NOT NULL,
  reason_text VARCHAR(1000),
  status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
  handled_by VARCHAR(100),
  handled_at TIMESTAMP,
  regdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT ck_bbs_report_target CHECK (target_type IN ('POST', 'COMMENT')),
  CONSTRAINT ck_bbs_report_reason CHECK (reason_code IN ('SPAM', 'ABUSE', 'ILLEGAL', 'ETC')),
  CONSTRAINT ck_bbs_report_status CHECK (status IN ('PENDING', 'REJECTED', 'HIDDEN', 'RESOLVED')),
  CONSTRAINT ux_bbs_report_one UNIQUE (target_type, target_id, reporter_id)
);

CREATE SEQUENCE bbs_report_seq
  START WITH 1
  INCREMENT BY 1;

CREATE INDEX idx_bbs_report_status ON bbs_report(status, no);
CREATE INDEX idx_bbs_report_reporter ON bbs_report(reporter_id);

CREATE TABLE bbs_file (
  no INTEGER PRIMARY KEY,
  bbsno INTEGER NOT NULL,
  org_filename VARCHAR(255) NOT NULL,
  save_filename VARCHAR(255) NOT NULL,
  filepath VARCHAR(500) NOT NULL,
  filesize BIGINT DEFAULT 0,
  mimetype VARCHAR(100),
  regdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ok SMALLINT DEFAULT 1
);

CREATE SEQUENCE bbs_file_seq
  START WITH 1
  INCREMENT BY 1;

CREATE INDEX idx_bbs_file_bbsno ON bbs_file(bbsno);

CREATE TABLE reset_token (
  no INTEGER PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  token VARCHAR(128) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used SMALLINT DEFAULT 0 NOT NULL,
  regdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  usedate TIMESTAMP
);

CREATE SEQUENCE reset_token_seq
  START WITH 1
  INCREMENT BY 1;

CREATE UNIQUE INDEX ux_reset_token_token ON reset_token(token);
CREATE INDEX idx_reset_token_user ON reset_token(user_id);

ALTER TABLE bbs
  ADD CONSTRAINT fk_bbs_writer_login
  FOREIGN KEY (writer) REFERENCES login(id);

ALTER TABLE bbs
  ADD CONSTRAINT fk_bbs_category
  FOREIGN KEY (category_id) REFERENCES bbs_category(id);

ALTER TABLE bbsw
  ADD CONSTRAINT fk_bbsw_bbs
  FOREIGN KEY (bbsno) REFERENCES bbs(no);

ALTER TABLE bbsw
  ADD CONSTRAINT fk_bbsw_parent
  FOREIGN KEY (parent_no) REFERENCES bbsw(no);

ALTER TABLE bbsw
  ADD CONSTRAINT fk_bbsw_writer_login
  FOREIGN KEY (writer) REFERENCES login(id);

ALTER TABLE bbs_reaction
  ADD CONSTRAINT fk_bbs_reaction_bbs
  FOREIGN KEY (bbsno) REFERENCES bbs(no);

ALTER TABLE bbs_reaction
  ADD CONSTRAINT fk_bbs_reaction_login
  FOREIGN KEY (user_id) REFERENCES login(id);

ALTER TABLE bbsw_reaction
  ADD CONSTRAINT fk_bbsw_reaction_comment
  FOREIGN KEY (wno) REFERENCES bbsw(no);

ALTER TABLE bbsw_reaction
  ADD CONSTRAINT fk_bbsw_reaction_login
  FOREIGN KEY (user_id) REFERENCES login(id);

ALTER TABLE bbs_bookmark
  ADD CONSTRAINT fk_bbs_bookmark_bbs
  FOREIGN KEY (bbsno) REFERENCES bbs(no);

ALTER TABLE bbs_bookmark
  ADD CONSTRAINT fk_bbs_bookmark_login
  FOREIGN KEY (user_id) REFERENCES login(id);

ALTER TABLE bbs_report
  ADD CONSTRAINT fk_bbs_report_login
  FOREIGN KEY (reporter_id) REFERENCES login(id);

ALTER TABLE bbs_file
  ADD CONSTRAINT fk_bbs_file_bbs
  FOREIGN KEY (bbsno) REFERENCES bbs(no);

ALTER TABLE reset_token
  ADD CONSTRAINT fk_reset_token_login
  FOREIGN KEY (user_id) REFERENCES login(id);
