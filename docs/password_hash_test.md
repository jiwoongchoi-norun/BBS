# SHA-512 + salt password test

## DB setup

Run `scripts/schema.sql` on a new DB.

For an existing DB, run `scripts/add-login-salt.sql` before testing. Existing plaintext-password accounts may fail login because they do not have a matching SHA-512 + salt value.

## Signup test

1. Open `/bbs/signup`.
2. Create a new test account.
3. Confirm the app redirects to `/bbs/login`.
4. Check the account without printing sensitive values:

```sql
SELECT ID, NAME, EMAIL, OK FROM LOGIN WHERE ID = 'test_id';
```

Do not print `PASSWORD` or `SALT` in screenshots.

## Login test

1. Log in with the new account and password.
2. Confirm the app redirects to `/bbs/list`.
3. Log out.
4. Try the same account with a wrong password.
5. Confirm the password error alert appears.

## Profile password update test

1. Log in with the new account.
2. Open `/bbs/updatesignup`.
3. Confirm both password fields are blank.
4. Enter a new password in both password fields and save.
5. Log out, then log in again with the new password.
