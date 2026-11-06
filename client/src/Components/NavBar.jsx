import React from "react";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import {
  SettingsRounded,
  SettingsRemoteRounded,
  VideocamRounded,
  LiveTvRounded,
} from "@mui/icons-material";

const links = [
  { to: "/", label: "Remote", icon: <SettingsRemoteRounded /> },
  { to: "/broadcast", label: "Broadcast", icon: <VideocamRounded /> },
  { to: "/watch", label: "Watch", icon: <LiveTvRounded /> },
  { to: "/settings", label: "Settings", icon: <SettingsRounded /> },
];

function NavBar() {
  const { pathname } = useLocation();
  // The watch page is a full-screen player for the TV.
  if (pathname.startsWith("/watch")) return null;

  const current =
    links.find((link) => link.to !== "/" && pathname.startsWith(link.to))
      ?.to ?? "/";

  return (
    <BottomNavigation className="bottom-nav" value={current} showLabels>
      {links.map((link) => (
        <BottomNavigationAction
          key={link.to}
          component={Link}
          to={link.to}
          value={link.to}
          label={link.label}
          icon={link.icon}
        />
      ))}
    </BottomNavigation>
  );
}

export default NavBar;
