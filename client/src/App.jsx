import React from "react";
import { Container, IconButton, Grid } from "@mui/material";
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
import "./App.css";

// const currentIP = window.location.href.split(":")[1];
// const serverURL = `http:${currentIP}:8000`;

const serverURL = `http://pi.local:8000`;

function App() {
  const handleClick = (type, key) => {
    fetch(`${serverURL}/`, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify({ type, key }), // body data type must match "Content-Type" header
    });
  };

  const ControllerKeyButton = ({ buttonCommand, icon, gridSize = 2 }) => {
    return (
      <Grid container size={gridSize} className="JCAICenter">
        <IconButton sx={{ color: 'white'}} onClick={() => handleClick("key", buttonCommand)}>{icon}</IconButton>
      </Grid>
    );
  };

  return (
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
  );
}

export default App;
