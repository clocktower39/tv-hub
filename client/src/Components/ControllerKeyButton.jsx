import { Grid, IconButton, } from "@mui/material";
import { useServer } from "../context/ServerContext";

const ControllerKeyButton = ({ buttonCommand, icon, gridSize = 2, }) => {
  const { serverURL } = useServer();
  
  const handleClick = (type, key) => {
    fetch(`${serverURL}/`, {
      method: "POST", 
      mode: "cors",
      cache: "no-cache", 
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      referrerPolicy: "no-referrer",
      body: JSON.stringify({ type, key }),
    });
  };

    return (
        <Grid container size={gridSize} className="JCAICenter">
            <IconButton
                sx={{ color: 'white' }}
                onClick={() => handleClick("key", buttonCommand)}
            >
                {icon}
            </IconButton>
        </Grid>
    );
};

export default ControllerKeyButton