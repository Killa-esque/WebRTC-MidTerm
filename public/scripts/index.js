let callInProgress = false;
let incomingCall = false;

const currentCalls = [];

const { RTCPeerConnection, RTCSessionDescription } = window;

const connection = new RTCPeerConnection();

function deselectActiveUsers() {
  document.querySelectorAll(".active-user.active-user--selected").forEach(user => {
    user.className = "active-user";
  });
}

function generateUserElement(socketId) {
  const userElement = document.createElement("div");
  const nameElement = document.createElement("p");

  userElement.className = "active-user";
  userElement.id = socketId;
  nameElement.className = "username";
  nameElement.innerHTML = `Socket: ${socketId}`;

  userElement.appendChild(nameElement);

  userElement.addEventListener("click", () => {
    deselectActiveUsers();
    userElement.className = "active-user active-user--selected";
    document.getElementById("talking-with-info").innerHTML = `Talking with: "Socket: ${socketId}"`;
    initiateCall(socketId);
  });

  return userElement;
}

async function initiateCall(socketId) {
  const offer = await connection.createOffer();
  await connection.setLocalDescription(new RTCSessionDescription(offer));

  socket.emit("call-user", {
    offer,
    to: socketId
  });
}

function refreshUserList(socketIds) {
  const userContainer = document.getElementById("active-user-container");

  socketIds.forEach(id => {
    if (!document.getElementById(id)) {
      const element = generateUserElement(id);
      userContainer.appendChild(element);
    }
  });
}

const socket = io.connect("localhost:5000");

socket.on("update-user-list", ({ users }) => {
  refreshUserList(users);
});

socket.on("remove-user", ({ socketId }) => {
  const userElement = document.getElementById(socketId);
  if (userElement) {
    userElement.remove();
  }
});

socket.on("call-made", async data => {
  if (incomingCall) {
    const acceptCall = confirm(`User "Socket: ${data.socket}" is calling. Accept?`);

    if (!acceptCall) {
      socket.emit("reject-call", { from: data.socket });
      return;
    }
  }

  await connection.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await connection.createAnswer();
  await connection.setLocalDescription(new RTCSessionDescription(answer));

  socket.emit("make-answer", {
    answer,
    to: data.socket
  });
  incomingCall = true;
});

socket.on("answer-made", async data => {
  await connection.setRemoteDescription(new RTCSessionDescription(data.answer));

  if (!callInProgress) {
    initiateCall(data.socket);
    callInProgress = true;
  }
});

socket.on("call-rejected", data => {
  alert(`User: "Socket: ${data.socket}" rejected your call.`);
  deselectActiveUsers();
});

connection.ontrack = event => {
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) {
    remoteVideo.srcObject = event.streams[0];
  }
};

navigator.getUserMedia(
  { video: true, audio: true },
  stream => {
    const localVideo = document.getElementById("local-video");
    if (localVideo) {
      localVideo.srcObject = stream;
    }

    stream.getTracks().forEach(track => connection.addTrack(track, stream));
  },
  error => console.warn(error.message)
);
