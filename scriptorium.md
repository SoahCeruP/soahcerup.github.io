---
title: Scriptorium — SQLi into a Lua sandbox escape
date: 2026-08-05
platform: HTB · Linux
difficulty: medium
tags: [web, sqli, sandbox-escape]
excerpt: A CMS login form leaks just enough to pivot into an authenticated Lua plugin engine, then out to a root shell.
---

A CMS login form leaks just enough through error messages to confirm a classic boolean-based SQL
injection. From there, dumping admin session tokens gets us into a plugin engine that was never
supposed to be reachable from outside.

## Getting in

The login form's error responses differ subtly between valid and invalid usernames, which is enough
to enumerate accounts and eventually blind-inject a session token out of the database.

```
sqlmap -u "https://scriptorium.htb/login" --data="user=admin&pass=x" -p pass --technique=B
```

## The Lua plugin engine

Once authenticated as an admin, a "custom plugin" upload feature accepts Lua scripts and runs them in
what's billed as a sandboxed interpreter. The sandbox blocks `os.execute` directly, but leaves the
`io` library reachable through a debug hook that wasn't stripped.

## Root

Chaining the sandbox escape with a SUID binary found during local enumeration gets a full root shell.

## Remediation

- Normalize error responses so authentication failures don't leak account existence.
- Never expose a scripting sandbox to user input without a maintained, minimal allowlist of libraries.
