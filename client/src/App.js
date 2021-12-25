import React from 'react';
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

const serverURL = `http://192.168.0.12:8000`;

function App() {

  const handleClick = (type, key) => {
    fetch(`${serverURL}/`, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json',
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify({ type, key }) // body data type must match "Content-Type" header
    });
  }

  const controllerKeyButton = (buttonCommand, icon, gridSize = 2) => {
    return (
      <Grid item xs={gridSize} container className="JCAICenter" >
        <IconButton
          onClick={() => handleClick('key', buttonCommand)}
        >
          {icon}
        </IconButton>
      </Grid>
    );
  }

  return (
    <Container maxWidth="sm" style={{ height: '100%', }} >
      <Grid container className="JCAICenter" style={{ height: '100%', }} >

        <Grid container className="JCAICenter" >

          {controllerKeyButton('setup-menu', <Settings fontSize="large" />)}
          {controllerKeyButton('input-select', <Input fontSize="large" />)}
          {controllerKeyButton('power-toggle-function', <PowerSettingsNew fontSize="large" />)}

        </Grid>

        <Grid container className="JCAICenter" >

          {controllerKeyButton('backward', <SkipPrevious sx={{ fontSize: '50px' }} />)}
          {controllerKeyButton('rewind', <FastRewind fontSize="large" />)}
          {controllerKeyButton('play', <PlayArrow fontSize="large" />)}
          {controllerKeyButton('pause', <Pause fontSize="large" />)}
          {controllerKeyButton('forward', <FastForward fontSize="large" />)}
          {controllerKeyButton('fast-forward', <SkipNext fontSize="large" />)}

        </Grid>

        <Grid container className="JCAICenter" >

          <Grid container className="JCAICenter" >
            {controllerKeyButton('up', <ArrowDropUp sx={{ fontSize: '120px' }} />, 12)}
          </Grid>

          <Grid container className="JCAICenter" >
            {controllerKeyButton('left', <ArrowLeft sx={{ fontSize: '120px' }} />, 4)}
            {controllerKeyButton('select', <Circle sx={{ fontSize: '75px' }} />)}
            {controllerKeyButton('right', <ArrowRight sx={{ fontSize: '120px' }} />, 4)}
          </Grid>

          <Grid container className="JCAICenter" >
            {controllerKeyButton('down', <ArrowDropDown sx={{ fontSize: '120px' }} />, 4)}
          </Grid>

        </Grid>

        <Grid container className="JCAICenter" >
            {controllerKeyButton('volume-down', <VolumeDown fontSize="large" /> , 3)}
            {controllerKeyButton('mute', <VolumeOff fontSize="large" /> , 3)}
            {controllerKeyButton('volume-up', <VolumeUp fontSize="large" /> , 3)}
        </Grid>

        <Grid container className="JCAICenter" >
            {controllerKeyButton('exit', <UTurnLeft fontSize="large" /> , 3)}
            {controllerKeyButton('root-menu', <Home fontSize="large" /> , 3)}
            {controllerKeyButton('contents-menu', <Menu fontSize="large" /> , 3)}
        </Grid>


      </Grid >
    </Container>
  );
}

export default App;
