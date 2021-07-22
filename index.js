import axios from 'axios';
import * as  rax from "retry-axios";
import http from 'http';
import https from 'https';
import BorneCircuitBreaker from "./lib/borneCircuitBreaker.js";
rax.attach();
const circuitBreaker ={ 
    ajaxInstance: (breakerConfig) => {
      const axiosAgent = axios.create({
        httpAgent: new http.Agent({
          keepAlive: true
        }),
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          keepAlive: true,
          https: true
        })
      });
      const breaker = new BorneCircuitBreaker(breakerConfig.options);
      axiosAgent.defaults.raxConfig = {
        retry: breakerConfig.retry || 3,
        noResponseRetries: breakerConfig.noResponseRetries || 2,
        retryDelay: breakerConfig.retryDelay || 100,
        httpMethodsToRetry: breakerConfig.httpMethodsToRetry || ['GET', 'POST', 'HEAD', 'OPTIONS', 'DELETE', 'PUT','PATCH'],
        statusCodesToRetry: breakerConfig.statusCodesToRetry || [
          [100, 199],
          [419, 429],
          [500, 599]
        ],
        onRetryAttempt: retryErr => {
          const cfg = rax.getConfig(retryErr);
          console.error(
            '\n\n\n\n\n=================== Retry on error ' +
              cfg.currentRetryAttempt,
              retryErr
          );
        },
        instance: axiosAgent
      };
  
      // intercept the axios request.
      axiosAgent.interceptors.request.use(
         config => {
          try {
              config.adapter = async(config) =>{
                async function proxyCall(){
                  const response= await axios({
                    url:config.url,
                    method:config.method,
                    data:config.data,
                    header:config.headers
                  });
                  return  Promise.resolve(response);
                }
                return breaker.exec(proxyCall);
              };
              return {
                ...config,
                headers: {
                  ...config.headers,
                  customHeader: 'Overirding the proxy call'
                }
              };
          } catch (err) {
            console.error('Cache Error:', err);
            return config;
          }
        },
        function(error) {
          console.error('Error before sending request', error);
          return Promise.reject(error);
        }
      );
      // intercept the axios request.
      axiosAgent.interceptors.response.use(
        function(response) {
          return response;
        },
        function(error) {
          if (error.statusCode >= 300) {
            console.error('Response Error: ', error);
          }
          return Promise.reject(error);
        }
      );
  
      return axiosAgent;
    }
}
export default circuitBreaker;