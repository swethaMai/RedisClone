const net = require("net");
const fs = require("fs");

const client = net.createConnection({ port: 6379 }, () => {
    console.log("Connected to server.");

    const writeStream = fs.createWriteStream("received.txt", { flags: "w" });

    client.pipe(writeStream);

    // Example: send a PING command
    client.write("*1\r\n$4\r\nPING\r\n");

    client.on("end", () => {
        writeStream.end();
        console.log("File received, connection closed.");
    });
});

client.on("error", (err) => {
    console.error("Client error:", err.message);
});
