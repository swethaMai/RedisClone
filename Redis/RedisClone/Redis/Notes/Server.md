# Server.js
## Working
- TCP server that speaks RESP2
- port number : 6379
### TCP
- protocol that establishes a connection between 2 systems
- allows them to exchange data streams
- maintains continuous connection (not stateless)
## Modules used
### net
- supports asynchronous programming  
- stream based interface  
- provides API for creating TCP servers and clients
### parseFrame and encError from ./resp
### handleCommand from ./command
### storage from ./storage


