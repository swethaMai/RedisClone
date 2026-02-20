## net Module
- supports asynchronous programming  
- stream based interface  

```javascript
const net = require("net");

const server = net.createServer((socket) => { 
  socket.end(`${new Date()}\n`);
});

server.listen(59090);
```
### createServer
- creates a TCP server
- socket 
    - connection handler
    - runs once per incoming client connection
    - duplex stream (read & write) to client

```javascript
const net = require("net");

const client = net.createConnection(
    { port: 59090 }, 
    () => {console.log("Connected!");}
);

client.on("data", (data) => {
  console.log("Server says:", data.toString());
  client.end();
});
```
### createConnection
- opens a TCP connection
- first argument : server port/IP address
- second argument : connect callback (runs once connection established)
### on
- listens for incoming data from server
- data is a Buffer -> toString converts it to readable string
- client end -> no more writes from client side
