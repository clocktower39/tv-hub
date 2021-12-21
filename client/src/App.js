import React from 'react';
import { IconButton, Grid } from "@mui/material";
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
} from "@mui/icons-material";
import "./App.css";

// const currentIP = window.location.href.split(":")[1];
// const serverURL = `http:${currentIP}:8000`;

const serverURL = `http://pi:8000`;

function App() {

  const handleClick = (type) => {
    fetch(`${serverURL}/${type}`);
  }

  return (
    <Grid container spacing={3} style={{ height: '100%', justifyContent: 'center', alignItems: "center", }} >
      <Grid container spacing={12} style={{ justifyContent: 'center', alignItems: "center", }} >
        <Grid item xs={2}>
          <IconButton
            onClick={() => handleClick('turn_on')}
          >
            <PowerSettingsNew fontSize="large" />
          </IconButton>
        </Grid>
        <Grid item xs={2}>
          <IconButton
            onClick={() => handleClick('turn_off')}
          >
            <Brightness2 fontSize="large" />
          </IconButton>
        </Grid>
      </Grid>

      <Grid container spacing={12} style={{ justifyContent: 'center', alignItems: "center", }} >
        <Grid item xs={2}>
          <IconButton
            onClick={() => handleClick('HDMIsource')}
          >
            <Input fontSize="large" />
          </IconButton>
        </Grid>
      </Grid>

      <Grid container spacing={12} style={{ justifyContent: 'center', alignItems: "center", }} >
        <Grid item xs={2}>
          <IconButton
            onClick={() => handleClick('up')}
          >
            <ArrowDropUp fontSize="large" />
          </IconButton>
        </Grid>
      </Grid>

      <Grid container spacing={12} style={{ justifyContent: 'center', alignItems: "center", }} >
        <Grid item xs={2}>
          <IconButton
            onClick={() => handleClick('left')}
          >
            <ArrowLeft fontSize="large" />
          </IconButton>
        </Grid>
        <Grid item xs={2}>
          <IconButton
            onClick={() => handleClick('right')}
          >
            <ArrowRight fontSize="large" />
          </IconButton>
        </Grid>
      </Grid>

      <Grid container spacing={12} style={{ justifyContent: 'center', alignItems: "center", }} >
        <Grid item xs={2}>
          <IconButton
            onClick={() => handleClick('down')}
          >
            <ArrowDropDown fontSize="large" />
          </IconButton>
        </Grid>
      </Grid>

      <Grid item xs={2}>
        <IconButton
          onClick={() => handleClick('vdown')}
        >
          <VolumeDown fontSize="large" />
        </IconButton>
      </Grid>
      <Grid item xs={2}>
        <IconButton
          onClick={() => handleClick('vup')}
        >
          <VolumeUp fontSize="large" />
        </IconButton>
      </Grid>
    </Grid >
  );
}

export default App;
