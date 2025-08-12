# API Examples - Orders

## Quick Start

### Create a Basic Order

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders' \
  -H 'Authorization: Bearer dummy.sales.dev-user-123' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: order-basic-001' \
  -d '{
    "quantity": 10,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    },
    "clientRef": "PO-12345"
  }'
```

### Create a Large Volume Order (20% Discount)

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders' \
  -H 'Authorization: Bearer dummy.admin.tester' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: order-volume-001' \
  -d '{
    "quantity": 250,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    },
    "clientRef": "PO-BULK-250"
  }'
```

## Test Scenarios

### Valid Order Creation (201)

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders' \
  -H 'Authorization: Bearer dummy.admin.tester' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: order-test-valid-001' \
  -d '{
    "quantity": 50,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    },
    "clientRef": "PO-VALID-50"
  }'
```

### Test Idempotency - Same Key (200)

```bash
# Run this twice - second call should return 200 with X-Idempotency-Replayed: true
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders' \
  -H 'Authorization: Bearer dummy.sales.dev-user-123' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: order-idempotent-test' \
  -d '{
    "quantity": 25,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    },
    "clientRef": "PO-IDEMPOTENT-TEST"
  }'
```

## Error Scenarios

### 422 - Missing Idempotency Key

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders' \
  -H 'Authorization: Bearer dummy.admin.tester' \
  -H 'Content-Type: application/json' \
  -d '{
    "quantity": 10,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    },
    "clientRef": "PO-NO-KEY"
  }'
```

### 409 - Insufficient Stock

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders' \
  -H 'Authorization: Bearer dummy.admin.tester' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: order-insufficient-stock-001' \
  -d '{
    "quantity": 10000,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    },
    "clientRef": "PO-TOO-MUCH"
  }'
```

### 409 - Shipping Exceeds 15% Limit

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders' \
  -H 'Authorization: Bearer dummy.sales.dev-user-123' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: order-shipping-fail-001' \
  -d '{
    "quantity": 1,
    "shipTo": {
      "lat": 0,
      "lng": 180
    },
    "clientRef": "PO-REMOTE-FAIL"
  }'
```

### 401 - Unauthorized (No Bearer Token)

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: order-unauthorized-001' \
  -d '{
    "quantity": 10,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    },
    "clientRef": "PO-NO-AUTH"
  }'
```

### 422 - Validation Error (Invalid Quantity)

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders' \
  -H 'Authorization: Bearer dummy.admin.tester' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: order-validation-fail-001' \
  -d '{
    "quantity": "invalid",
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    },
    "clientRef": "PO-INVALID"
  }'
```

### 422 - Missing Required Fields

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders' \
  -H 'Authorization: Bearer dummy.sales.dev-user-123' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: order-missing-fields-001' \
  -d '{
    "quantity": 10
  }'
```

## Important Notes

### Idempotency Keys

- **Required** for all order creation requests
- Must be unique per order attempt
- Same key = same order (prevents duplicates)
- Replayed requests return 200 with `X-Idempotency-Replayed: true` header

### Stock Management

- Orders **decrement actual inventory** upon successful creation
- Failed orders (409 responses) do not affect stock levels
- Stock changes are atomic - either full order succeeds or nothing changes
