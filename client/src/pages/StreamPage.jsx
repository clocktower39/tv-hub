import React from "react";
import { Container } from "@mui/material";
import { useServer } from "../context/ServerContext";

function StreamPage() {
  const { cameraURL } = useServer();

  return (
    <Container maxWidth="sm" className="page">
      <div className="camera-panel">
        <div className="camera-header">Camera</div>
        {cameraURL ? (
          <img className="camera-stream" src={cameraURL} alt="Camera stream" />
        ) : (
          <div className="camera-empty">
            No camera URL set. Update it in Settings.
          </div>
        )}
      </div>
    </Container>
  );
}

export default StreamPage;
