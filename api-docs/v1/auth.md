# Dummy Auth (Dev-Only)

**Header:** `Authorization: Bearer dummy.<role>.<userId>`

**Roles:** `sales`, `admin`

## Examples

- `Bearer dummy.sales.123`
- `Bearer dummy.admin.corp-user`

## Public vs Protected

- **Public:** `/v1/auth`, `/v1/ping`, `/health`
- **Protected:** `/v1/auth/me`, `/v1/orders` (later) → roles: `sales` or `admin`

## Frontend Quick Start

- Add the header on protected calls:
