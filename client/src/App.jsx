import React, { useState, } from "react";
import { Button, Container, Dialog, Grid, IconButton, Paper, TextField, } from "@mui/material";
import {
  PowerSettingsNew,
  VolumeDown,
  VolumeUp,
  Input,
  ArrowDropUp,
  ArrowRight,
  ArrowLeft,
  ArrowDropDown,
  Settings,
  VolumeOff,
  SkipNext,
  SkipPrevious,
  FastForward,
  FastRewind,
  Home,
  Menu,
  PlayArrow,
  Pause,
  UTurnLeft,
  Circle,
} from "@mui/icons-material";
import ControllerKeyButton from "./Components/ControllerKeyButton";
import { useServer, } from "./context/ServerContext";
import "./App.css";

function App() {
  const { serverURL, saveServerURL, history } = useServer();  const [tempServerURL, setTempServerURL] = useState(serverURL);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDialogToggle = () => {
    setTempServerURL(serverURL); // reset input when opening
    setDialogOpen((prev) => !prev);
  };

  const handleSave = () => {
    saveServerURL(tempServerURL);
    setDialogOpen(false);
  };

  return (
    <>
      <Dialog open={dialogOpen} onClose={handleDialogToggle}>
        <Container>
          <Paper sx={{ p: 2 }}>
            <Grid container direction="column" spacing={2}>
              <Grid item>
                <TextField
                  fullWidth
                  label="Server URL"
                  value={tempServerURL}
                  onChange={(e) => setTempServerURL(e.target.value)}
                />
              </Grid>

              <Grid item container spacing={1}>
                <Grid item>
                  <Button variant="contained" onClick={handleSave}>
                    Save
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="outlined" onClick={handleDialogToggle}>
                    Cancel
                  </Button>
                </Grid>
              </Grid>

              {history.length > 0 && (
                <Grid item>
                  <p>Recent connections:</p>
                  {history.map((url, i) => (
                    <Button
                      key={i}
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
        </Container>
      </Dialog>

      <IconButton onClick={handleDialogToggle}><Menu /></IconButton>
      <Container maxWidth="sm" style={{ height: "100%", }}>
        <Grid container className="JCAICenter" style={{ height: "100%" }}>
          <Grid container className="JCAICenter" size={12}>
            <ControllerKeyButton buttonCommand="setup-menu" icon={<Settings fontSize="large" />} />
            <ControllerKeyButton buttonCommand="input-select" icon={<Input fontSize="large" />} />
            <ControllerKeyButton
              buttonCommand="power-toggle-function"
              icon={<PowerSettingsNew fontSize="large" />}
            />
          </Grid>

          <Grid container size={12} className="JCAICenter">
            <ControllerKeyButton
              buttonCommand="backward"
              icon={<SkipPrevious sx={{ fontSize: "50px" }} />}
            />
            <ControllerKeyButton buttonCommand="rewind" icon={<FastRewind fontSize="large" />} />
            <ControllerKeyButton buttonCommand="play" icon={<PlayArrow fontSize="large" />} />
            <ControllerKeyButton buttonCommand="pause" icon={<Pause fontSize="large" />} />
            <ControllerKeyButton buttonCommand="forward" icon={<FastForward fontSize="large" />} />
            <ControllerKeyButton buttonCommand="fast-forward" icon={<SkipNext fontSize="large" />} />
          </Grid>

          <Grid container size={12} className="JCAICenter">
            <Grid container size={12} className="JCAICenter">
              <ControllerKeyButton
                buttonCommand="up"
                icon={<ArrowDropUp sx={{ fontSize: "120px" }} />}
                gridSize={12}
              />
            </Grid>

            <Grid container size={12} className="JCAICenter">
              <ControllerKeyButton
                buttonCommand="left"
                icon={<ArrowLeft sx={{ fontSize: "120px" }} />}
                gridSize={4}
              />
              <ControllerKeyButton
                buttonCommand="select"
                icon={<Circle sx={{ fontSize: "75px" }} />}
              />
              <ControllerKeyButton
                buttonCommand="right"
                icon={<ArrowRight sx={{ fontSize: "120px" }} />}
                gridSize={4}
              />
            </Grid>

            <Grid container size={12} className="JCAICenter">
              <ControllerKeyButton
                buttonCommand="down"
                icon={<ArrowDropDown sx={{ fontSize: "120px" }} />}
                gridSize={4}
              />
            </Grid>
          </Grid>

          <Grid container size={12} className="JCAICenter">
            <ControllerKeyButton
              buttonCommand="volume-down"
              icon={<VolumeDown fontSize="large" />}
              gridSize={3}
            />
            <ControllerKeyButton
              buttonCommand="mute"
              icon={<VolumeOff fontSize="large" />}
              gridSize={3}
            />
            <ControllerKeyButton
              buttonCommand="volume-up"
              icon={<VolumeUp fontSize="large" />}
              gridSize={3}
            />
          </Grid>

          <Grid container size={12} className="JCAICenter">
            <ControllerKeyButton
              buttonCommand="exit"
              icon={<UTurnLeft fontSize="large" />}
              gridSize={3}
            />
            <ControllerKeyButton
              buttonCommand="root-menu"
              icon={<Home fontSize="large" />}
              gridSize={3}
            />
            <ControllerKeyButton
              buttonCommand="contents-menu"
              icon={<Menu fontSize="large" />}
              gridSize={3}
            />
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default App;
