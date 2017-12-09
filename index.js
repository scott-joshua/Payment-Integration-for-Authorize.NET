'use strict';

const https = require("https");

exports.handler = function(event, context) {
    /* Define date information used to create expiration date for test CC */


    let expdate = "";
    if(event.test === 1){
        let date = new Date();
        let currentYear = date.getFullYear().toString().substr(2,2);
        let currentMonth = date.getMonth() + 1;
        if (currentMonth < 10) { currentMonth = "0" + currentMonth; }
        expdate = currentMonth + currentYear;

    }else{
        expdate = event.expdate;
    }



    /* Define Authorize.Net Connection */
    var authnetValidateCert = "false";	/* In production this should be set to true to validate 3rd party certificate */
    var authnetHost = "";
    var authnetHostBeta = process.env.BETA_URL;
    var authnetHostLive = process.env.PROD_URL;
    var authnetPort = process.env.PORT;
    var authnetPath = "/xml/v1/request.api";
    var authnetMethod = "POST";
    var authnetContentType = "application/json";
    var authnetResponseData = [];

    /* Define Authorize.Net Gateway credentials */
    var gateway_login = process.env.GATEWAY_LOGIN;
    var gateway_key = process.env.GATEWAY_KEY;

    /* Define user purchase details */

    var isTestTransaction = event.test;  // 1 = test transaction, 0 = not test transaction
    var amount = event.amount;
    var ccnum = event.ccnum;
    var cvv = event.cvv;


    console.log("test transactiopn", isTestTransaction);
    console.log("gateway_key", gateway_key);

    /* Define request body */
    var postjsonPayload = {
        "createTransactionRequest": {
            "merchantAuthentication": {
                "name": gateway_login,
                "transactionKey": gateway_key
            },
            "transactionRequest": {
                "transactionType": "authCaptureTransaction",
                "amount": amount,
                "payment": {
                    "creditCard": {
                        "cardNumber": ccnum,
                        "expirationDate": expdate,
                        "cardCode": cvv
                    }
                }
            }
        }
    };

    /* Define which merchant URL to use */
    if (isTestTransaction === 0) {
        authnetHost = authnetHostLive;
    }
    else {
        authnetHost = authnetHostBeta;
    }

    /* Define request parameters */
    var curlOptions = {
        host: authnetHost,
        port: authnetPort,
        path: authnetPath,
        rejectUnauthorized: authnetValidateCert,
        method: authnetMethod,
        headers: {
            'Content-Type': authnetContentType,
            'Content-Length': Buffer.byteLength(JSON.stringify(postjsonPayload, null, 0))
        }
    };

    /* Perform request */
    var authnetRequest = https.request(curlOptions, function(result) {
        var responseData = "";
        /* Error */
        result.on('error', function(e) {
            context.fail('error: ' + e.message);
        });

        /* Collect Response */
        result.on('data', function(chunk)  {
            responseData += chunk;
        });

        /* Req / Res End. */
        result.on('end', function() {
            /* Parse JSON response data.
               Clean funkiness that is present in the response (that is, before root opening { there is a special character "﻿") that should NOT be
               there.  Filtering that out allows JSON.parse to function without generating the infamous "Unexpected Token".  While doing that filtering
               might as well do some other filtering just to be safe in case something else is tossed out into the wild.
           */
            console.log("response", responseData);


            var cleanedResponse = responseData.replace(/\r\n/g, "").replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "").replace(/\f/g, "").replace(/﻿/g, "");
            /* Extract Specific Values */
            authnetResponseData = JSON.parse(cleanedResponse);
            var transactionStatus = authnetResponseData.transactionResponse.responseCode;
            var transactionId = authnetResponseData.transactionResponse.transId;
            var transactionText = authnetResponseData.transactionResponse.messages[0].description;
            /* Generate Response */
            context.done(
                null,
                {
                    "transactionStatus": transactionStatus,
                    "transactionText": transactionText,
                    "transactionId": transactionId
                }
            );
        });
    });

    /* Call the https request to run the transaction and continue with other logic tasks. */
    authnetRequest.write(JSON.stringify(postjsonPayload, null, 0));
    authnetRequest.end(); /* Required "end" statement by Node.js standard */

};
