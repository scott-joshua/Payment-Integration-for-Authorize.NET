Welcome to the Authorize.net lambda Function
==============================================

This is a lambda function that wraps a call to the Authorize.net Authorization SErvice

You will need a Login and a Token from Authorize.net
If you have sam-local installed you run test locally with

sam local invoke CreditCardAuthorize --env-vars test/env.json -e test/event.json 


Example input:
```json

{
  "amount": "4.49",
  "ccnum": "6011000000000012",
  "cvv":"330",
  "expdate":"12/20",
  "test":"1"
}

```

Example Output:

```json
   {
      "transactionStatus":"1",
      "transactionText":"This transaction has been approved.",
      "transactionId":"40008920184"
   }
```