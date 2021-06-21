import React from 'react';
import { IconButton, Grid, makeStyles } from "@material-ui/core";
import {
  Brightness2,
  PowerSettingsNew,
  VolumeDown,
  VolumeUp,
  Input
} from "@material-ui/icons";
import "./App.css";

const useStyles = makeStyles({
  root: {
    height: '100%',
  },
  icon: {
  }
})

function App() {
  const classes = useStyles();
  const handleClick = (type) => {
    fetch('http://192.168.0.14:8000/'+type);
  }

  return (
    <Grid container spacing={3} justify="center" alignItems="center" className={classes.root} >
      <Grid item xs={2}>
        <IconButton
          onClick={()=>handleClick('turn_on')}
        >
          <PowerSettingsNew className={classes.icon} fontSize="large" />
        </IconButton>
      </Grid>
      <Grid item xs={2}>
        <IconButton
          onClick={()=>handleClick('turn_off')}
        >
          <Brightness2 className={classes.icon} fontSize="large" />
        </IconButton>
      </Grid>
      <Grid item xs={2}>
        <IconButton
          onClick={()=>handleClick('vup')}
        >
          <VolumeUp className={classes.icon} fontSize="large" />
        </IconButton>
      </Grid>
      <Grid item xs={2}>
        <IconButton
          onClick={()=>handleClick('vdown')}
        >
          <VolumeDown className={classes.icon} fontSize="large" />
        </IconButton>
      </Grid>
      <Grid item xs={2}>
        <IconButton
          onClick={()=>handleClick('HDMIsource')}
        >
          <Input className={classes.icon} fontSize="large" />
        </IconButton>
      </Grid>
    </Grid>
  );
}

export default App;
