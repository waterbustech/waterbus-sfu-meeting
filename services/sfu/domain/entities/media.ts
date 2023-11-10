import { v4 } from "uuid";
import {
  Kind,
  RTCRtpTransceiver,
  MediaStreamTrack,
  RTCRtpCodecParameters,
} from "werift";
import { Track } from "./track";
import logger from "../../../../helpers/logger";
import {
  kAV1Codec,
  kH264Codec,
  kVP8Codec,
  kVP9Codec,
  kH265Codec,
} from "../../../../constants/webrtc_config";

export class Media {
  readonly mediaId = "m_" + v4();
  tracks: Track[] = [];
  transceiver?: RTCRtpTransceiver;
  videoEnabled: boolean = true;
  audioEnabled: boolean = true;
  isE2eeEnabled: boolean = false;
  isScreenSharing: boolean = false;
  cameraType: number = 0; // 0: front | 1: rear
  codec: String;

  constructor(
    readonly publisherId: string,
    readonly isVideoEnabled: boolean,
    readonly isAudioEnabled: boolean,
    readonly e2eeEnabled: boolean
  ) {
    this.videoEnabled = isVideoEnabled;
    this.audioEnabled = isAudioEnabled;
    this.isE2eeEnabled = e2eeEnabled;
  }

  initAV(transceiver: RTCRtpTransceiver) {
    this.transceiver = transceiver;
    return this;
  }

  addTrack(rtpTrack: MediaStreamTrack) {
    const track = new Track(rtpTrack, this.transceiver!);
    this.tracks.push(track);

    if (track.track.kind == "video") {
      this.codec = track.track.codec.mimeType;
    }
  }

  stop() {
    this.tracks.forEach((track) => track.stop());
  }

  videoCodecs(): RTCRtpCodecParameters[] {
    switch (this.codec) {
      case kVP8Codec.mimeType:
        return [kVP8Codec];
      case kVP9Codec.mimeType:
        return [kVP9Codec];
      case kH264Codec.mimeType:
        return [kH264Codec];
      case kH265Codec.mimeType:
        return [kH265Codec];
      case kAV1Codec.mimeType:
        return [kAV1Codec];
      default:
        return [kH264Codec, kVP8Codec, kAV1Codec];
    }
  }

  get info(): MediaInfo {
    return {
      publisherId: this.publisherId,
    };
  }

  setCameraType(type: number) {
    this.cameraType = type;
  }

  setVideoEnabled(isEnable: boolean) {
    this.videoEnabled = isEnable;
  }

  setAudioEnabled(isEnable: boolean) {
    this.audioEnabled = isEnable;
  }

  setE2eeEnabled(isEnable: boolean) {
    this.isE2eeEnabled = isEnable;
  }
}

export type MediaInfo = {
  publisherId: string;
};

export type MediaInfoKind = Kind | "mixer";
