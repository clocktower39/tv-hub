import React from 'react';
import { Container, IconButton, Grid } from "@mui/material";
import {
  Brightness2,
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
  UTurnLeft,
  Circle,
} from "@mui/icons-material";
import "./App.css";

// const currentIP = window.location.href.split(":")[1];
// const serverURL = `http:${currentIP}:8000`;

const serverURL = `http://192.168.0.12:8000`;

function App() {

  const handleClick = (type) => {
    fetch(`${serverURL}/${type}`);
  }

  return (
    <Container maxWidth="sm" style={{ height: '100%', }} >
      <Grid container className="JCAICenter" style={{ height: '100%', }} >

        <Grid container className="JCAICenter" >

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('settings')}
            >
              <Settings fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('HDMIsource')}
            >
              <Input fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('turn_on')}
            >
              <PowerSettingsNew fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('turn_off')}
            >
              <Brightness2 fontSize="large" />
            </IconButton>
          </Grid>

        </Grid>

        <Grid container className="JCAICenter" >

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('skip_previous')}
            >
              <SkipPrevious fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('rewind')}
            >
              <FastRewind fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('play')}
            >
              <PlayArrow fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('fast_forward')}
            >
              <FastForward fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('skip_next')}
            >
              <SkipNext fontSize="large" />
            </IconButton>
          </Grid>

        </Grid>

        <Grid container className="JCAICenter" >
          <Grid container className="JCAICenter" >

            <Grid item xs={12} container className="JCAICenter" >
              <IconButton
                onClick={() => handleClick('up')}
              >
                <ArrowDropUp sx={{ fontSize: '120px' }} />
              </IconButton>
            </Grid>

          </Grid>

          <Grid container className="JCAICenter" >

            <Grid item xs={4} container className="JCAICenter" >
              <IconButton
                onClick={() => handleClick('left')}
              >
                <ArrowLeft sx={{ fontSize: '120px' }} />
              </IconButton>
            </Grid>

            <Grid item xs={2} container className="JCAICenter" >
              <IconButton
                onClick={() => handleClick('select')}
              >
                <Circle sx={{ fontSize: '75px' }} />
              </IconButton>
            </Grid>

            <Grid item xs={4} container className="JCAICenter" >
              <IconButton
                onClick={() => handleClick('right')}
              >
                <ArrowRight sx={{ fontSize: '120px' }} />
              </IconButton>
            </Grid>

          </Grid>

          <Grid container className="JCAICenter" >

            <Grid item xs={12} container className="JCAICenter" >
              <IconButton
                onClick={() => handleClick('down')}
              >
                <ArrowDropDown sx={{ fontSize: '120px' }} />
              </IconButton>
            </Grid>

          </Grid>

        </Grid>
        <Grid container className="JCAICenter" >

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('vdown')}
            >
              <VolumeDown fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('mute')}
            >
              <VolumeOff fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('vup')}
            >
              <VolumeUp fontSize="large" />
            </IconButton>
          </Grid>

        </Grid>

        <Grid container className="JCAICenter" >

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('back')}
            >
              <UTurnLeft fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('home')}
            >
              <Home fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('menu')}
            >
              <Menu fontSize="large" />
            </IconButton>
          </Grid>

        </Grid>


      </Grid >
    </Container>
  );
}

export default App;
