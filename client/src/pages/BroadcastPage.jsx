import React, { useEffect, useRef, useState } from "react";
import { Button, Container } from "@mui/material";
import { io } from "socket.io-client";
import { useServer } from "../context/ServerContext";

const ROOM_ID = "live";
const ICE_SERVERS = [
  {
    urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
  },
];

function BroadcastPage() {
  const { serverURL } = useServer();
  const [status, setStatus] = useState("idle");
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const watcherIdRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startBroadcast = async () => {
    if (!serverURL) return;
    setStatus("starting");

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    watcherIdRef.current = null;
    pendingCandidatesRef.current = [];

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    } catch (error) {
      console.error("Failed to access camera", error);
      setStatus("error");
      return;
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    const socket = io(serverURL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.removeAllListeners();

    socket.on("connect", () => {
      socket.emit("webrtc:join", { roomId: ROOM_ID, role: "broadcaster" });
      setStatus("ready");
    });

    socket.on("webrtc:watcher-join", async ({ watcherId }) => {
      watcherIdRef.current = watcherId;
      if (peerRef.current) {
        peerRef.current.close();
      }

      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerRef.current = peer;
      pendingCandidatesRef.current = [];

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.onicecandidate = (event) => {
        if (event.candidate && watcherIdRef.current) {
          socket.emit("webrtc:ice", {
            targetId: watcherIdRef.current,
            candidate: event.candidate,
          });
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("webrtc:offer", {
        targetId: watcherId,
        sdp: peer.localDescription,
      });
      setStatus("streaming");
    });

    socket.on("webrtc:answer", async ({ sdp, fromId }) => {
      if (fromId && watcherIdRef.current && fromId !== watcherIdRef.current) {
        return;
      }
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(sdp);
        for (const candidate of pendingCandidatesRef.current) {
          await peerRef.current.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];
      }
    });

    socket.on("webrtc:ice", async ({ candidate, fromId }) => {
      if (fromId && watcherIdRef.current && fromId !== watcherIdRef.current) {
        return;
      }
      if (peerRef.current && candidate) {
        if (peerRef.current.remoteDescription) {
          await peerRef.current.addIceCandidate(candidate);
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      }
    });

    socket.on("webrtc:watcher-left", () => {
      watcherIdRef.current = null;
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      setStatus("ready");
    });
  };

  const stopBroadcast = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStatus("idle");
  };

  return (
    <Container maxWidth="sm" className="page">
      <div className="camera-panel">
        <div className="camera-header">Broadcast</div>
        <video
          className="live-video"
          ref={videoRef}
          autoPlay
          muted
          playsInline
        />
        <div className="live-status">Status: {status}</div>
        <div className="live-actions">
          <Button variant="contained" onClick={startBroadcast}>
            Start broadcast
          </Button>
          <Button variant="outlined" onClick={stopBroadcast}>
            Stop
          </Button>
        </div>
      </div>
    </Container>
  );
}

export default BroadcastPage;
