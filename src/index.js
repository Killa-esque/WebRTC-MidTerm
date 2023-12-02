const RTCServer = require('./serverRTC.js');

const server = new RTCServer();

server.listen(port => {
  console.log(`Server is listening on http://localhost:${port}`);
});
