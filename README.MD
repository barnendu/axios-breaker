## axios-breaker
The original idea of circuit breaker is a mechanism for preventing damage to an electrical circuit or electrical device. When it detects a fault, it interrupts the flow of power. Let's see how we can use the same concept in software industry.

It's very common for software systems to make remote calls to software running in different processes, probably on different machines across a network. One of the big differences between in-memory calls and remote calls is that remote calls can fail, or hang without a response until some timeout limit is reached. That's a worse situation if you have many callers on a unresponsive supplier, then you can run out of critical resources leading to cascading failures across multiple systems.The basic idea behind the circuit breaker is very simple. You wrap a protected function call in a circuit breaker object, which monitors for failures. Once the failures reach a certain threshold, the circuit breaker trips, and all further calls to the circuit breaker return with an error, without the protected call being made at all. This is a reasonable approach with electrical circuit breakers in buildings, but for software circuit breakers we can have the breaker itself detect if the underlying calls are working again. We can implement this self-resetting behavior by trying the protected call again after a suitable interval, and resetting the breaker should it succeed.

## How axios-breaker works?
Let's look at the conditions and thresholds we want to work with. A circuit breaker has three states:

Closed: Everything is working normally. Requests pass through.
Open: Requests immediately fail for a set amount of time.
Half-Open: A set number of requests are let through to test the stability of the call.
The thresholds we determine will allow our code to make decisions about which state the circuit breaker is in. For this version, we'll keep things simpler and use a fixed failure rate. Traditionally you would use failures over a fixed timeframe, but to keep it simple we'll use failures in a row. Here are our starting properties and their default values for each instance of the circuit breaker:

request: The request that will be linked to the breaker.
state: "CLOSED": The current state of the circuit.
failureCount: 0: The number of failures made.
failureThreshold: 3: The number of failures before the breaker is triggered.
successCount: 0: The number of successful calls made in a row.
successThreshold: 2: The number of consecutive, successful calls the HALF state needs to make before the circuit is CLOSED again.
timeout: 5000: The amount of time the OPEN state will wait before switching to HALF. (Not to be confused with a request timeout)
nextAttempt: Date.now(): The timestamp created using the timeout and the time of the most recent failure that determines when the next attempt will be allowed.
Using these values and our known states, we can start to build our logic for transitioning from state to state. In pseudo-code this looks like:

CLOSED to OPEN: If failureCount > failureThreshold.
OPEN to HALF-OPEN: If the current time > nextAttempt.
HALF-OPEN to OPEN: If any failure occurs
HALF-OPEN to CLOSED: If successCount >= successThreshold

##  Installation
```
npm install axios-breaker
```

## Usage
To use this library for all ajax call. 
```
const breaker = require('axios-breaker');
```
## Configuration
```
 const config = {
     retry: 3 // Number of retry you want perform once failure.
     noResponseRetries: 2 //Number of retry once there is no response from the api.
     retryDelay: 100 // Amount of delay in milliseconds in between retries.
     // HTTP methods to automatically retry.  Defaults to:
    // ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT']
    httpMethodsToRetry: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT','PATCH'],
 
    // The response status codes to retry.  Supports a double
    // array with a list of ranges.  Defaults to:
    // [[100, 199], [419, 429], [500, 599]]
    statusCodesToRetry: [[100, 199], [429, 429], [500, 599]],
     options: { //customizaable optionsfor circuit breaker
        failureThreshold: 3, // maximum no of failed before circuit break,
        successThreshold: 2, // maximum success call to close the circuit
        timeout: 5000, // reset timeout for next call while in open state
        fallbackPolicy: callback // fallbackpolicy if any while circuit is open. For example you want to  divert the api call to different endpoint.
     }
 }
```
# Implementation
```
const instance = breaker.ajaxInstance(config);
GET Example:
 instance
  .get('API_END_POINT')
            .then((result) => {
              return result;
            })
            .catch((error) => {
              return error;
            });

POST example:
instance
        .post(
            `API_END_POINT`,
            req.body,
            { headers: 'HEADER_CONFIG'}
          )
          .then((result) => {
            return result;
          })
          .catch((error) => {
            return error;
          });

```
