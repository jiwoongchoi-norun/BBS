# bcrypt password migration test

## Migration strategy

The app now stores new passwords with bcrypt.

Existing SHA-512 + salt accounts are still supported:

1. Login reads `PASSWORD`, `SALT`, and `PASSWORD_ALGO`.
2. If `PASSWORD_ALGO = 'bcrypt'` or the stored password looks like a bcrypt hash, login uses `bcrypt.compare()`.
3. Otherwise login verifies the old SHA-512 + salt value.
4. When the old SHA-512 login succeeds, the app rewrites that account to bcrypt:
   - `PASSWORD = <bcrypt hash>`
   - `SALT = NULL`
   - `PASSWORD_ALGO = 'bcrypt'`
   - `PASSWORD_UPDATED_AT = SYSDATE`

This keeps existing SHA-512 users able to log in while moving them forward automatically.

## DB setup

New DB:

```sql
@scripts/schema.sql
@scripts/sample-data.sql
```

Existing DB:

```sql
@scripts/migration.sql
```

Do not print full `PASSWORD` values in screenshots.

## Signup test

1. Open `/bbs/signup`.
2. Create a new test account.
3. Confirm the app redirects to `/bbs/login`.
4. Check metadata only:

```sql
SELECT ID, PASSWORD_ALGO, SALT, PASSWORD_UPDATED_AT, OK
FROM LOGIN
WHERE ID = 'test_id';
```

Expected:

- `PASSWORD_ALGO = 'bcrypt'`
- `SALT` is null
- `PASSWORD_UPDATED_AT` is not null

## Existing SHA-512 migration test

1. Prepare or use a SHA-512 + salt account with `PASSWORD_ALGO = 'sha512'`.
2. Log in with the correct password.
3. Confirm the app redirects to `/bbs/list`.
4. Check metadata:

```sql
SELECT ID, PASSWORD_ALGO, SALT, PASSWORD_UPDATED_AT
FROM LOGIN
WHERE ID = 'admin';
```

Expected after successful login:

- `PASSWORD_ALGO = 'bcrypt'`
- `SALT` is null
- `PASSWORD_UPDATED_AT` is updated

## Login failure test

1. Try the same account with a wrong password.
2. Confirm the password error alert appears.
3. Confirm `PASSWORD_ALGO` did not change because login failed.

## Profile password update test

1. Log in with the test account.
2. Open `/bbs/updatesignup`.
3. Confirm both password fields are blank.
4. Enter a new password in both password fields and save.
5. Log out, then log in again with the new password.
6. Confirm `PASSWORD_ALGO = 'bcrypt'`.
