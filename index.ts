import * as dotenv from "dotenv";
import express from "express";
import * as http from "http";
import * as ioInstance from "socket.io";
import * as bodyParser from "body-parser";
import rtcManager from "./services/webrtc_manager";
import SocketEvent from "./constants/socket_events";
import { credentials } from "@grpc/grpc-js";
import { AuthServiceClient } from "./protos/auth_grpc_pb";
import { MeetingServiceClient } from "./protos/meeting_grpc_pb";
import { VerifyTokenRequest, VerifyTokenResponse } from "./protos/auth_pb";
import { LeaveRoomRequest, LeaveRoomResponse } from "./protos/meeting_pb";
import logger from "./helpers/logger";

dotenv.config();

const port = process.env.PORT || 5000;
const authGrpcAddress = process.env.AUTH_GRPC_ADDRESS || "localhost:50051";
const meetingGrpcAddress =
  process.env.MEETING_GRPC_ADDRESS || "localhost:50051";

const authServiceClient = new AuthServiceClient(
  authGrpcAddress,
  credentials.createInsecure()
);
const meetingServiceClient = new MeetingServiceClient(
  meetingGrpcAddress,
  credentials.createInsecure()
);

const app = express();
const server = http.createServer(app);
const io = new ioInstance.Server(server);

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/*", (req: express.Request, res: express.Response) =>
  res.send("Waterbus WebRTC-SFU Server")
);

io.use(async (socket: ioInstance.Socket, next: (err?: any) => void) => {
  try {
    // const authorization = socket.handshake.auth?.Authorization;
    // if (!authorization) throw new Error("Token is missing");

    // const token = authorization.replace("Bearer ", "");

    // if (!token) {
    //   throw new Error("Token is missing");
    // }

    // const verifyRequest = new VerifyTokenRequest();
    // verifyRequest.setToken(token);

    // const verifyResponse: VerifyTokenResponse = await new Promise(
    //   (resolve, reject) => {
    //     authServiceClient.verifyToken(verifyRequest, (error, response) => {
    //       if (error) {
    //         reject(error);
    //       } else {
    //         resolve(response);
    //       }
    //     });
    //   }
    // );

    // if (!verifyResponse.getValid()) {
    //   throw new Error("Invalid token");
    // }

    // Attach userId to the socket for future reference
    socket["userId"] = "lambiengcode";

    return next();
  } catch (error) {
    console.log({ error });
    return next(error);
  }
});

io.on(SocketEvent.connection, function (socket: ioInstance.Socket) {
  socket.on(SocketEvent.joinRoomCSS, async function (data: any) {
    try {
      const { sdp, roomId, participantId, isVideoEnabled, isAudioEnabled, isE2eeEnabled } =
        data;

      socket["roomId"] = roomId;
      socket["participantId"] = participantId;

      const payload = await rtcManager.joinRoom(
        sdp,
        isVideoEnabled,
        isAudioEnabled,
        isE2eeEnabled,
        socket,
        {
          callback: () => {
            socket.broadcast.to(roomId).emit(SocketEvent.newParticipantSSC, {
              targetId: participantId,
            });
          },
        }
      );

      socket.join(roomId);

      io.to(socket.id).emit(SocketEvent.joinRoomSSC, payload);
    } catch (error) {
      handleError(socket, SocketEvent.joinRoomCSS, error.toString());
    }
  });

  socket.on(SocketEvent.makeSubscriber, async function (data: any) {
    try {
      const { targetId } = data;

      const payload = await rtcManager.subscribe(socket, targetId);

      io.to(socket.id).emit(SocketEvent.answerSubscriberSSC, {
        targetId: targetId,
        ...payload,
      });
    } catch (error) {
      handleError(socket, SocketEvent.answerSubscriberCSS, error.toString());
    }
  });

  socket.on(SocketEvent.answerSubscriberCSS, async function (data: any) {
    const { sdp, targetId } = data;

    await rtcManager.setDescriptionSubscriber(socket, targetId, sdp);
  });

  socket.on(SocketEvent.publisherCandidateCSS, async function (data: any) {
    await rtcManager.addPublisherIceCandidate(socket, data);
  });

  socket.on(SocketEvent.subscriberCandidateCSS, async function (data: any) {
    const { targetId, candidate } = data;
    await rtcManager.addSubscriberIceCandidate(socket, targetId, candidate);
  });

  socket.on(SocketEvent.setE2eeEnabledCSS, async function (data: any) {
    const roomId = socket["roomId"];
    const targetId = socket["participantId"];

    if (!roomId) return;

    const { isEnabled } = data;

    rtcManager.setE2eeEnabled(socket, isEnabled);

    socket.broadcast.to(roomId).emit(SocketEvent.setE2eeEnabledSSC, {
      isEnabled,
      participantId: targetId,
    });
  });

  socket.on(SocketEvent.setCameraTypeCSS, async function (data: any) {
    const roomId = socket["roomId"];
    const targetId = socket["participantId"];

    if (!roomId) return;

    const { type } = data;

    rtcManager.setCameraType(socket, type);

    socket.broadcast.to(roomId).emit(SocketEvent.setCameraTypeSSC, {
      type,
      participantId: targetId,
    });
  });

  socket.on(SocketEvent.setVideoEnabledCSS, async function (data: any) {
    const roomId = socket["roomId"];
    const targetId = socket["participantId"];

    if (!roomId) return;

    const { isEnabled } = data;

    rtcManager.setVideoEnabled(socket, isEnabled);

    socket.broadcast.to(roomId).emit(SocketEvent.setVideoEnabledSSC, {
      isEnabled,
      participantId: targetId,
    });
  });

  socket.on(SocketEvent.setAudioEnabledCSS, async function (data: any) {
    const roomId = socket["roomId"];
    const targetId = socket["participantId"];

    if (!roomId) return;

    const { isEnabled } = data;

    rtcManager.setAudioEnabled(socket, isEnabled);

    socket.broadcast.to(roomId).emit(SocketEvent.setAudioEnabledSSC, {
      isEnabled,
      participantId: targetId,
    });
  });

  socket.on(SocketEvent.setScreenSharingCSS, async function (data: any) {
    const roomId = socket["roomId"];
    const targetId = socket["participantId"];

    if (!roomId) return;

    const { isSharing } = data;

    rtcManager.setScreenSharing(socket, isSharing);

    socket.broadcast.to(roomId).emit(SocketEvent.setScreenSharingSSC, {
      isSharing,
      participantId: targetId,
    });
  });

  socket.on(SocketEvent.leaveRoomCSS, async function (data: any) {
    try {
      handleLeaveRoom(socket);
    } catch (error) {
      handleError(socket, SocketEvent.leaveRoomCSS, error.toString());
    }
  });

  socket.on(SocketEvent.disconnect, function () {
    try {
      handleLeaveRoom(socket, true);
    } catch (error) {
      handleError(socket, SocketEvent.disconnect, error.toString());
    }
  });
});

function handleLeaveRoom(
  socket: ioInstance.Socket,
  isNeedEmitToRestful: boolean = false
) {
  const roomId = socket["roomId"];
  const participantId = socket["participantId"];

  if (!roomId) return;

  rtcManager.leaveRoom(roomId, participantId);

  socket.broadcast.to(roomId).emit(SocketEvent.participantHasLeftSSC, {
    targetId: participantId,
  });

  delete socket["roomId"];
  delete socket["participantId"];

  socket.leave(roomId);

  if (!isNeedEmitToRestful) return;

  const leaveRoomRequest = new LeaveRoomRequest();
  leaveRoomRequest.setRoomid(roomId);
  leaveRoomRequest.setParticipantid(participantId);

  meetingServiceClient.leaveRoom(leaveRoomRequest, (error, res) => {
    if (error) {
      logger.error(`${participantId} leave room ${roomId} grpc failure`);
    } else {
      logger.info(`${participantId} leave room ${roomId} grpc success`);
    }
  });
}

function handleError(
  socket: ioInstance.Socket,
  eventName: string,
  error: string
) {
  console.log(eventName, error.toString());
}

server.listen(port, function () {
  console.log("Server is running on port: " + port);
});
