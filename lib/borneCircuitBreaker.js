export default class BorneCircuitBreaker {
    constructor(proxyCall, options = {}) {
      const defaults = {
        failureThreshold: 3, // maximum no of failed before circuit break,
        successThreshold: 2, // maximum success call to close the circuit
        timeout: 5000,// reset timeout for next call while in open state
        fallbackPolicy: null // fallbackpolicy if any while circuit is open.
      };
      //initializing circuit state.
      Object.assign(this, defaults, options, {
        proxyCall,
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        nextAttempt: Date.now()
      });
    }
    
    async exec() {
      if (this.state === 'OPEN') {
        if (this.nextAttempt <= Date.now()) {
          this.state = 'HALF-OPEN';
        } else {
          if (this.fallbackPolicy) {
            return this.tryfallbackPolicy();
          }
          throw new Error('Circuit breaker is OPEN');
        }
      }
      try {
        const response = await this.proxyCall();
        return this.success(response);
      } catch (err) {
        console.log(err);
        return this.fail(err);
      }
    }
    
    success(response) {
      if (this.state === 'HALF-OPEN') {
        this.successCount++;
        if (this.successCount > this.successThreshold) {
          this.successCount = 0;
          this.state = 'CLOSED';
        }
      }
      this.failureCount = 0;
    
      this.status('Success');
      return response;
    }
    
    fail(err) {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.open();
      }
      this.status('Failure');
      if (this.fallbackPolicy) return this.tryfallbackPolicy();
      return err;
    }
    
    open() {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
    close() {
      this.successCount = 0;
      this.failureCount = 0;
      this.state = 'CLOSED';
    }
    half() {
      this.state = 'HALF-OPEN';
    }
    
    async tryfallbackPolicy() {
      console.log('Attempting fallbackPolicy proxyCall');
      try {
        const response = await this.fallbackPolicy();
        return response;
      } catch (err) {
        return err;
      }
    }
    
    status(action) {
      console.table({
        Action: action,
        Timestamp: Date.now(),
        Successes: this.successCount,
        Failures: this.failureCount,
        'Next State': this.state
      });
    }
  }
    