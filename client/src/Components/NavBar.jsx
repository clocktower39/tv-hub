import React from "react";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { Settings, Videocam, Tv } from "@mui/icons-material";

const links = [
  { to: "/", label: "Controller" },
  { to: "/stream", label: "Stream" },
  { to: "/settings", label: "Settings" },
];

function NavBar() {
  const location = useLocation();
  const currentPath = location.pathname.startsWith("/settings")
    ? "/settings"
    : location.pathname.startsWith("/stream")
      ? "/stream"
      : "/";

  return (
    <BottomNavigation className="bottom-nav" value={currentPath} showLabels>
      {links.map((link) => (
        <BottomNavigationAction
          key={link.to}
          component={Link}
          to={link.to}
          value={link.to}
          label={link.label}
          icon={
            link.to === "/"
              ? <Tv />
              : link.to === "/stream"
                ? <Videocam />
                : <Settings />
          }
        />
      ))}
    </BottomNavigation>
  );
}

export default NavBar;
