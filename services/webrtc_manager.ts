import * as webrtc from "werift";
import logger from "../helpers/logger";
import SocketEvent from "../constants/socket_events";
import { Room } from "./sfu/room";

class WebRTCManager {
  private rooms: Record<string, Room> = {};

  async joinRoom(
    sdp: string,
    isVideoEnabled: boolean,
    isAudioEnabled: boolean,
    isE2eeEnabled: boolean,
    socket: any,
    { callback }: { callback: () => void }
  ) {
    try {
      const { participantId, roomId } = socket;

      if (!this.rooms[roomId]) {
        this.rooms[roomId] = new Room();
      }

      const room = this.rooms[roomId];

      const { offer, otherParticipants } = await room.join(
        sdp,
        isVideoEnabled,
        isAudioEnabled,
        isE2eeEnabled,
        participantId,
        {
          callback: callback,
        }
      );

      return {
        sdp: offer,
        otherParticipants: otherParticipants,
      };
    } catch (error) {
      logger.error(
        `Establish publisher failure with error: ${JSON.stringify(error)}`
      );
    }
  }

  async subscribe(socket, targetId: string) {
    try {
      const { roomId, participantId } = socket;

      if (participantId == targetId) return;

      const room = this.rooms[roomId];

      if (!room) return;

      const offer = await room.subscribe(targetId, participantId, {
        gotIceCandidate: (candidate) => {
          socket.emit(SocketEvent.subscriberCandidateSSC, {
            targetId: targetId,
            candidate: candidate.toJSON(),
          });
        },
      });

      return offer;
    } catch (error) {
      logger.error(
        `Establish subscriber failure with error: ${JSON.stringify(error)}`
      );
    }
  }

  async setDescriptionSubscriber(socket: any, targetId: string, sdp: string) {
    const { roomId, participantId } = socket;

    const room = this.rooms[roomId];

    if (!room) return;

    await room.setSubscriberDescriptionSubscriber(targetId, participantId, sdp);
  }

  async addPublisherIceCandidate(
    socket: any,
    candidate: webrtc.RTCIceCandidate
  ) {
    const { roomId, participantId } = socket;

    const room = this.rooms[roomId];

    if (!room) return;

    await room.addPublisherIceCandidate(participantId, candidate);
  }

  async addSubscriberIceCandidate(
    socket: any,
    targetId: string,
    candidate: webrtc.RTCIceCandidate
  ) {
    const { roomId, participantId } = socket;

    const room = this.rooms[roomId];

    if (!room) return;

    await room.addSubscriberIceCandidate(targetId, participantId, candidate);
  }

  async setAudioEnabled(socket, isEnabled: boolean) {
    const { roomId, participantId } = socket;

    const room = this.rooms[roomId];

    if (!room) return;

    room.setAudioEnabled(participantId, isEnabled);
  }

  async setCameraType(socket, type: number) {
    const { roomId, participantId } = socket;

    const room = this.rooms[roomId];

    if (!room) return;

    room.setCameraType(participantId, type);
  }

  async setVideoEnabled(socket, isEnabled: boolean) {
    const { roomId, participantId } = socket;

    const room = this.rooms[roomId];

    if (!room) return;

    room.setVideoEnabled(participantId, isEnabled);
  }

  async setE2eeEnabled(socket, isEnabled: boolean) {
    const { roomId, participantId } = socket;

    const room = this.rooms[roomId];

    if (!room) return;

    room.setE2eeEnabled(participantId, isEnabled);
  }

  async setScreenSharing(socket, isSharing: boolean) {
    const { roomId, participantId } = socket;

    const room = this.rooms[roomId];

    if (!room) return;

    room.setScreenSharing(participantId, isSharing);
  }

  async leaveRoom(roomId: string, participantId: string) {
    const room = this.rooms[roomId];

    if (room) {
      room.leave(participantId);
    }
  }
}

const rtcManager = new WebRTCManager();

export default rtcManager;
