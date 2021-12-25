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
      body: JSON.stringify({type, key}) // body data type must match "Content-Type" header
  });
  }

  return (
    <Container maxWidth="sm" style={{ height: '100%', }} >
      <Grid container className="JCAICenter" style={{ height: '100%', }} >

        <Grid container className="JCAICenter" >

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','setup-menu')}
            >
              <Settings fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','input-select')}
            >
              <Input fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','power-toggle-function')}
            >
              <PowerSettingsNew fontSize="large" />
            </IconButton>
          </Grid>

        </Grid>

        <Grid container className="JCAICenter" >

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','backward')}
            >
              <SkipPrevious fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','rewind')}
            >
              <FastRewind fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','play')}
            >
              <PlayArrow fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','fast-forward')}
            >
              <FastForward fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={2} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','forward')}
            >
              <SkipNext fontSize="large" />
            </IconButton>
          </Grid>

        </Grid>

        <Grid container className="JCAICenter" >
          <Grid container className="JCAICenter" >

            <Grid item xs={12} container className="JCAICenter" >
              <IconButton
                onClick={() => handleClick('key','up')}
              >
                <ArrowDropUp sx={{ fontSize: '120px' }} />
              </IconButton>
            </Grid>

          </Grid>

          <Grid container className="JCAICenter" >

            <Grid item xs={4} container className="JCAICenter" >
              <IconButton
                onClick={() => handleClick('key','left')}
              >
                <ArrowLeft sx={{ fontSize: '120px' }} />
              </IconButton>
            </Grid>

            <Grid item xs={2} container className="JCAICenter" >
              <IconButton
                onClick={() => handleClick('key','select')}
              >
                <Circle sx={{ fontSize: '75px' }} />
              </IconButton>
            </Grid>

            <Grid item xs={4} container className="JCAICenter" >
              <IconButton
                onClick={() => handleClick('key','right')}
              >
                <ArrowRight sx={{ fontSize: '120px' }} />
              </IconButton>
            </Grid>

          </Grid>

          <Grid container className="JCAICenter" >

            <Grid item xs={12} container className="JCAICenter" >
              <IconButton
                onClick={() => handleClick('key','down')}
              >
                <ArrowDropDown sx={{ fontSize: '120px' }} />
              </IconButton>
            </Grid>

          </Grid>

        </Grid>
        <Grid container className="JCAICenter" >

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','volume-down')}
            >
              <VolumeDown fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','mute')}
            >
              <VolumeOff fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','volume-up')}
            >
              <VolumeUp fontSize="large" />
            </IconButton>
          </Grid>

        </Grid>

        <Grid container className="JCAICenter" >

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','exit')}
            >
              <UTurnLeft fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','root-menu')}
            >
              <Home fontSize="large" />
            </IconButton>
          </Grid>

          <Grid item xs={3} container className="JCAICenter" >
            <IconButton
              onClick={() => handleClick('key','contents-menu')}
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
