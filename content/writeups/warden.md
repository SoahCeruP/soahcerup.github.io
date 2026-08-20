---
title: Warden — ADCS ESC1 to Domain Admin
date: 2026-08-12
platform: HTB · Windows
difficulty: hard
tags: [active-directory, adcs, pki]
excerpt: Misconfigured certificate templates turn a low-priv service account into full domain compromise.
---

Warden looks like a routine Active Directory box on the surface: an exposed SMB share, a couple of
low-privilege credentials leaked in a config file, and the usual enumeration grind. The real story is
what's sitting quietly behind it — a certificate authority with a template that trusts the wrong people.

## Enumeration

A standard sweep with common AD tooling turns up an SMB share readable by any authenticated user,
containing a deployment script with a hardcoded service account password. That's enough for an initial
foothold, but not enough to move laterally on its own.

```
crackmapexec smb warden.htb -u svc_deploy -p '<redacted>' --shares
```

### Finding the certificate template

With valid low-privilege credentials, querying the AD Certificate Services configuration reveals a
template that allows enrollee-supplied subject names and is available to low-privileged users — the
classic shape of an ESC1 misconfiguration.

```
certipy find -u svc_deploy -p '<redacted>' -dc-ip 10.10.11.4 -vulnerable
```

> The template's supposed to hand out certs for service accounts. Nobody checked who's allowed to ask
> for one on someone else's behalf.

## Exploitation

Requesting a certificate on behalf of a domain administrator account, then using that certificate to
obtain a Kerberos ticket, is enough to fully impersonate that account.

```
certipy req -u svc_deploy -p '<redacted>' -ca WARDEN-CA -template UserAuth -upn administrator@warden.htb
certipy auth -pfx administrator.pfx -domain warden.htb
```

From there, a Pass-the-Hash straight into a SYSTEM shell closes out the box.

## Remediation

- Restrict enrollment rights on certificate templates to the accounts that actually need them.
- Disable "supply in request" for subject alternative names unless it's explicitly required.
- Audit AD CS configuration regularly — this class of bug hides in plain sight.
