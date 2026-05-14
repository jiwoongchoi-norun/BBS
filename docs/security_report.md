# Security hardening report

## SQL Injection

- Replaced high-risk request string concatenation with Oracle bind variables in login, signup, profile update, post read, post create, post update, post delete, search, comments, replies, and downloads.
- Numeric request values are converted with `Number()` and rejected unless they are positive integers.
- Search column names are still dynamic, but only after allowlist validation.

## Authorization

- Post update and delete now require login and `BBS.WRITER = req.session.user.id`.
- Comment delete now requires login and `BBSW.WRITER = req.session.user.id`.
- Unauthorized writes return a 403 response.

## Input validation

- Login blocks blank id/password.
- Signup trims values, requires id/password/name, validates email shape, and requires password length 4 or more.
- Post create/update require title and content, with server-side length limits.
- Comment/reply create require non-empty content and reject content longer than 4000 characters.
- File upload keeps extension allowlist and 10MB size limit.

## Test checklist

- `/bbs/read?brdno=1 OR 1=1` should return a bad request response.
- Login with SQL Injection strings should fail normally.
- A different user should not be able to update or delete another user's post.
- A different user should not be able to delete another user's comment.
- Blank post title/content should be rejected.
- Overlong comment content should be rejected.
- Logged-out post/comment writes should redirect to login.
