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

function WatchPage() {
  const { serverURL } = useServer();
  const [status, setStatus] = useState("idle");
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const broadcasterIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const pendingLocalCandidatesRef = useRef([]);

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
    };
  }, []);

  const startWatching = () => {
    if (!serverURL) return;
    setStatus("connecting");

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    broadcasterIdRef.current = null;
    pendingCandidatesRef.current = [];
    pendingLocalCandidatesRef.current = [];

    const socket = io(serverURL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.removeAllListeners();

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;

    peer.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.play().catch(() => {});
      }
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      if (broadcasterIdRef.current) {
        socket.emit("webrtc:ice", {
          targetId: broadcasterIdRef.current,
          candidate: event.candidate,
        });
      } else {
        pendingLocalCandidatesRef.current.push(event.candidate);
      }
    };

    socket.on("connect", () => {
      socket.emit("webrtc:join", { roomId: ROOM_ID, role: "watcher" });
    });

    socket.on("webrtc:broadcaster-left", () => {
      broadcasterIdRef.current = null;
      setStatus("waiting");
    });

    socket.on("webrtc:offer", async ({ sdp, fromId }) => {
      broadcasterIdRef.current = fromId;
      if (pendingLocalCandidatesRef.current.length > 0) {
        pendingLocalCandidatesRef.current.forEach((candidate) => {
          socket.emit("webrtc:ice", {
            targetId: fromId,
            candidate,
          });
        });
        pendingLocalCandidatesRef.current = [];
      }
      await peer.setRemoteDescription(sdp);
      for (const candidate of pendingCandidatesRef.current) {
        await peer.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current = [];
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc:answer", {
        targetId: fromId,
        sdp: peer.localDescription,
      });
      setStatus("watching");
    });

    socket.on("webrtc:ice", async ({ candidate, fromId }) => {
      if (fromId && broadcasterIdRef.current && fromId !== broadcasterIdRef.current) {
        return;
      }
      if (candidate) {
        if (peer.remoteDescription) {
          await peer.addIceCandidate(candidate);
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      }
    });

    socket.on("webrtc:broadcaster-ready", () => {
      setStatus("waiting");
    });
  };

  const stopWatching = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    broadcasterIdRef.current = null;
    pendingLocalCandidatesRef.current = [];
    setStatus("idle");
  };

  return (
    <Container maxWidth="sm" className="page">
      <div className="camera-panel">
        <div className="camera-header">Watch live</div>
        <video
          className="live-video"
          ref={videoRef}
          autoPlay
          muted
          playsInline
        />
        <div className="live-status">Status: {status}</div>
        <div className="live-actions">
          <Button variant="contained" onClick={startWatching}>
            Start watching
          </Button>
          <Button variant="outlined" onClick={stopWatching}>
            Stop
          </Button>
        </div>
      </div>
    </Container>
  );
}

export default WatchPage;
