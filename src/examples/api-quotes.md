# API Examples - Quotes

## Quick Start

### Get a Basic Quote

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders/quotes' \
  -H 'Authorization: Bearer dummy.sales.dev-user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "quantity": 42,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    }
  }'
```

### Get a Large Volume Quote (20% Discount)

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders/quotes' \
  -H 'Authorization: Bearer dummy.sales.dev-user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "quantity": 250,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    }
  }'
```

## Test Scenarios

### Valid Quote - Small Order (No Discount)

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders/quotes' \
  -H 'Authorization: Bearer dummy.admin.tester' \
  -H 'Content-Type: application/json' \
  -d '{
    "quantity": 10,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    }
  }'
```

### Invalid Quote - Shipping Exceeds 15% Limit

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders/quotes' \
  -H 'Authorization: Bearer dummy.sales.dev-user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "quantity": 1,
    "shipTo": {
      "lat": 0,
      "lng": 180
    }
  }'
```

### Invalid Quote - Insufficient Stock

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders/quotes' \
  -H 'Authorization: Bearer dummy.admin.tester' \
  -H 'Content-Type: application/json' \
  -d '{
    "quantity": 5000,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    }
  }'
```

## Error Testing

### Test 401 - Unauthorized (No Bearer Token)

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders/quotes' \
  -H 'Content-Type: application/json' \
  -d '{
    "quantity": 10,
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    }
  }'
```

### Test 422 - Validation Error (Invalid Quantity)

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders/quotes' \
  -H 'Authorization: Bearer dummy.sales.dev-user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "quantity": "invalid",
    "shipTo": {
      "lat": 40.71,
      "lng": -74.0
    }
  }'
```

### Test 422 - Missing Required Fields

```bash
curl -X POST 'http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/v1/orders/quotes' \
  -H 'Authorization: Bearer dummy.admin.tester' \
  -H 'Content-Type: application/json' \
  -d '{
    "quantity": 10
  }'
```
