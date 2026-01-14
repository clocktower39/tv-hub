import React, { useEffect, useState } from "react";
import { Button, Container, Grid, Paper, TextField } from "@mui/material";
import { useServer } from "../context/ServerContext";

function SettingsPage() {
  const {
    serverURL,
    saveServerURL,
    history,
    cameraURL,
    saveCameraURL,
    cameraHistory,
  } = useServer();
  const [tempServerURL, setTempServerURL] = useState(serverURL);
  const [tempCameraURL, setTempCameraURL] = useState(cameraURL || "");

  useEffect(() => {
    setTempServerURL(serverURL);
  }, [serverURL]);

  useEffect(() => {
    setTempCameraURL(cameraURL || "");
  }, [cameraURL]);

  const handleSaveServer = () => {
    saveServerURL(tempServerURL);
  };

  const handleSaveCamera = () => {
    saveCameraURL(tempCameraURL);
  };

  return (
    <Container maxWidth="sm" className="page">
      <Paper className="settings-panel" elevation={3}>
        <Grid container direction="column" spacing={2}>
          <Grid item>
            <div className="settings-title">Server</div>
            <TextField
              fullWidth
              label="Server URL"
              value={tempServerURL}
              onChange={(e) => setTempServerURL(e.target.value)}
            />
          </Grid>
          <Grid item container spacing={1}>
            <Grid item>
              <Button variant="contained" onClick={handleSaveServer}>
                Save server URL
              </Button>
            </Grid>
          </Grid>
          {history.length > 0 && (
            <Grid item>
              <div className="settings-subtitle">Recent server URLs</div>
              {history.map((url, i) => (
                <Button
                  key={`server-${i}`}
                  onClick={() => setTempServerURL(url)}
                  variant="outlined"
                  sx={{ m: 0.5 }}
                >
                  {url}
                </Button>
              ))}
            </Grid>
          )}
        </Grid>
      </Paper>

      <Paper className="settings-panel" elevation={3}>
        <Grid container direction="column" spacing={2}>
          <Grid item>
            <div className="settings-title">Camera stream</div>
            <TextField
              fullWidth
              label="Stream URL"
              value={tempCameraURL}
              onChange={(e) => setTempCameraURL(e.target.value)}
            />
          </Grid>
          <Grid item container spacing={1}>
            <Grid item>
              <Button variant="contained" onClick={handleSaveCamera}>
                Save stream URL
              </Button>
            </Grid>
          </Grid>
          {cameraHistory.length > 0 && (
            <Grid item>
              <div className="settings-subtitle">Recent stream URLs</div>
              {cameraHistory.map((url, i) => (
                <Button
                  key={`camera-${i}`}
                  onClick={() => setTempCameraURL(url)}
                  variant="outlined"
                  sx={{ m: 0.5 }}
                >
                  {url}
                </Button>
              ))}
            </Grid>
          )}
        </Grid>
      </Paper>
    </Container>
  );
}

export default SettingsPage;
