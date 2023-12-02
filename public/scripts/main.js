let isCallingInProgress = false;
let hasReceivedCall = false;

const { RTCPeerConnection, RTCSessionDescription } = window;

const peerConnection = new RTCPeerConnection();

const socket = io.connect(window.location.origin);

socket.on("refresh-users", ({ users }) => {
  refreshUsers(users);
})

socket.on("user-left", ({ userId }) => {
  const userElement = document.getElementById(userId);
  if (userElement) {
    userElement.remove();
  }
})

socket.on("incoming-call", async ({ offer, from }) => {
  // Kiểm tra xem người dùng có đang trong cuộc gọi khác không
  if (hasReceivedCall) {
    socket.emit("decline-call", { caller: from });
    return;
  }

  const confirmed = confirm(`User with ID: ${from} wants to call you. Accept?`);
  if (!confirmed) {
    socket.emit("decline-call", { caller: from });
    return;
  }

  hasReceivedCall = true; // Đánh dấu đã nhận cuộc gọi

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

  socket.emit("call-response", {
    answer,
    target: from
  });

  hasReceivedCall = true;
});


socket.on("call-answered", async ({ answer, from }) => {
  // set remote description
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(answer)
  );

  // if user is not already calling, call user
  if (!isCallingInProgress) {
    connectToNewUser(from);
    isCallingInProgress = true;
  }
})

socket.on("call-declined", ({ userId }) => {
  alert(`User: "Socket: ${userId}" rejected your call.`);
  unselectUsersFromList();
})


function unselectUsersFromList() {
  const alreadySelectedUser = document.querySelectorAll(
    ".active-user.active-user--selected"
  );

  alreadySelectedUser.forEach(el => {
    el.setAttribute("class", "active-user");
  });
}

function handleUserClick(socketId) {
  unselectUsersFromList();
  document.getElementById(socketId).classList.add("active-user--selected");
  const talkingWithInfo = document.getElementById("talking-with-info");
  talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
  connectToNewUser(socketId);
}

function endCall() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
  }

  updateUIForCallEnded();
}

function updateUIForCallEnded() {
  // Cập nhật giao diện người dùng tại đây
  const localVideo = document.getElementById("local-video");
  const remoteVideo = document.getElementById("remote-video");
  const callControls = document.getElementById("call-controls");
  const callAction = document.getElementById("call-action");
  const endCallButton = document.getElementById("end-call-button");

  localVideo.style.display = "none";
  remoteVideo.style.display = "none";
  callControls.style.display = "none";

}

const generateUserElement = (socketId) => {
  let userHTML = `
    <div class="active-user" id="${socketId}" onclick="handleUserClick('${socketId}')">
      <p class="username">User: ${socketId}</p>
    </div>
  `;
  return userHTML;
}

const connectToNewUser = async (connectUserId) => {
  // call user, passing our media stream
  const offer = await peerConnection.createOffer();

  // set offer to local description
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

  // emit offer to other user
  socket.emit("init-call", {
    offer,
    to: connectUserId
  });
}

const refreshUsers = (userList) => {
  const activeUserContainer = document.getElementById("active-user-container");

  if (userList) {
    userList.map(user => {
      const existingUser = document.getElementById(user);

      // if user doesn't exist, add to list
      if (!existingUser) {
        const userElement = generateUserElement(user);
        activeUserContainer.innerHTML += userElement;
      }

    });
  }
}

// handle incoming data stream
peerConnection.ontrack = function ({ streams: [stream] }) {
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

// add our stream to peer connection
navigator.getUserMedia(
  { video: true, audio: true },
  stream => {
    const localVideo = document.getElementById("local-video");
    if (localVideo) {
      localVideo.srcObject = stream;
    }

    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
  },
  error => {
    console.warn(error.message);
  }
);
