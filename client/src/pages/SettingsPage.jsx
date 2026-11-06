import React, { useEffect, useState } from "react";
import { Button, Snackbar, TextField } from "@mui/material";
import {
  CheckCircleRounded,
  DnsRounded,
  HistoryRounded,
  VideocamRounded,
} from "@mui/icons-material";
import PageHeader from "../Components/PageHeader";
import { useServer } from "../context/ServerContext";
import { useServerStatus } from "../hooks/useServerStatus";
import "./SettingsPage.css";

const CEC_LABELS = {
  ready: "TV connected over HDMI-CEC",
  starting: "Connecting to the TV…",
  disabled: "Test mode: HDMI-CEC is off",
};

function serverStatusLine(status) {
  if (!status) return "Checking…";
  if (!status.online) return "Server offline";
  return `Server online · ${CEC_LABELS[status.cec] ?? "TV status unknown"}`;
}

// Tapping a recent URL puts it in the field; the user still presses Save.
function RecentList({ title, urls, current, onPick }) {
  if (urls.length === 0) return null;
  return (
    <div className="st-recent">
      <div className="st-recent__title">{title}</div>
      <ul className="st-recent__list">
        {urls.map((url) => (
          <li key={url}>
            <button
              type="button"
              className="st-recent__item"
              onClick={() => onPick(url)}
            >
              <HistoryRounded className="st-recent__icon" fontSize="small" />
              <span className="st-recent__url">{url}</span>
              {url === current && <span className="st-tag">In use</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsPage() {
  const {
    serverURL,
    saveServerURL,
    history,
    cameraURL,
    saveCameraURL,
    cameraHistory,
  } = useServer();
  const status = useServerStatus();
  const [tempServerURL, setTempServerURL] = useState(serverURL);
  const [tempCameraURL, setTempCameraURL] = useState(cameraURL || "");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setTempServerURL(serverURL);
  }, [serverURL]);

  useEffect(() => {
    setTempCameraURL(cameraURL || "");
  }, [cameraURL]);

  const sameOrigin = !serverURL;
  const serverDirty = tempServerURL.trim() !== serverURL;
  const cameraDirty = tempCameraURL.trim() !== (cameraURL || "");

  const handleSaveServer = () => {
    saveServerURL(tempServerURL);
    setNotice(
      tempServerURL.trim() ? "Server URL saved" : "Using this server"
    );
  };

  const handleUseThisServer = () => {
    setTempServerURL("");
    saveServerURL("");
    setNotice("Using this server");
  };

  const handleSaveCamera = () => {
    saveCameraURL(tempCameraURL.trim());
    setNotice("Camera URL saved");
  };

  const handleClearCamera = () => {
    setTempCameraURL("");
    saveCameraURL("");
    setNotice("Camera URL cleared");
  };

  return (
    <div className="st-page">
      <PageHeader title="Settings" />

      <main className="st-body">
        <section className="st-section" aria-labelledby="st-server">
          <h2 className="st-section__heading" id="st-server">
            Server
          </h2>
          <div className="st-card">
            <div className="st-row">
              <span className="st-row__icon" aria-hidden="true">
                <DnsRounded />
              </span>
              <div className="st-row__text">
                <div className="st-row__title">
                  {sameOrigin ? "Using this server" : "Using a custom server"}
                  {sameOrigin && (
                    <span className="st-tag st-tag--ok">
                      <CheckCircleRounded fontSize="inherit" />
                      Recommended
                    </span>
                  )}
                </div>
                <div className="st-row__hint">
                  {sameOrigin
                    ? "The app talks to the TV Hub that served this page. Nothing to set up."
                    : serverURL}
                </div>
              </div>
            </div>

            <div className="st-field">
              <TextField
                fullWidth
                label="Server URL"
                placeholder="Leave blank to use this server"
                helperText="Leave blank unless the TV Hub server runs at a different address from this page."
                value={tempServerURL}
                onChange={(e) => setTempServerURL(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && serverDirty) handleSaveServer();
                }}
                slotProps={{ htmlInput: { inputMode: "url", spellCheck: false } }}
              />
              <div className="st-actions">
                {!sameOrigin && (
                  <Button variant="outlined" onClick={handleUseThisServer}>
                    Use this server
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleSaveServer}
                  disabled={!serverDirty}
                >
                  Save
                </Button>
              </div>
            </div>

            <RecentList
              title="Recent servers"
              urls={history}
              current={serverURL}
              onPick={setTempServerURL}
            />
          </div>
        </section>

        <section className="st-section" aria-labelledby="st-camera">
          <h2 className="st-section__heading" id="st-camera">
            IP camera
          </h2>
          <div className="st-card">
            <div className="st-row">
              <span className="st-row__icon" aria-hidden="true">
                <VideocamRounded />
              </span>
              <div className="st-row__text">
                <div className="st-row__title">
                  {cameraURL ? "Camera added" : "No camera added"}
                </div>
                <div className="st-row__hint">
                  {cameraURL ||
                    "Add a network camera's MJPEG stream and it shows up as a video source on the Watch page."}
                </div>
              </div>
            </div>

            <div className="st-field">
              <TextField
                fullWidth
                label="MJPEG stream URL"
                placeholder="http://camera.local/stream"
                helperText="The camera's MJPEG (motion JPEG) address, often ending in /video or /mjpg. It appears as a source on Watch."
                value={tempCameraURL}
                onChange={(e) => setTempCameraURL(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && cameraDirty && tempCameraURL.trim())
                    handleSaveCamera();
                }}
                slotProps={{ htmlInput: { inputMode: "url", spellCheck: false } }}
              />
              <div className="st-actions">
                {(cameraURL || tempCameraURL) && (
                  <Button variant="outlined" onClick={handleClearCamera}>
                    Clear
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleSaveCamera}
                  disabled={!cameraDirty || !tempCameraURL.trim()}
                >
                  Save
                </Button>
              </div>
            </div>

            <RecentList
              title="Recent cameras"
              urls={cameraHistory}
              current={cameraURL}
              onPick={setTempCameraURL}
            />
          </div>
        </section>

        <section className="st-section" aria-labelledby="st-about">
          <h2 className="st-section__heading" id="st-about">
            About
          </h2>
          <div className="st-card">
            <div className="st-row">
              <span className="st-row__icon st-row__icon--brand" aria-hidden="true">
                TV
              </span>
              <div className="st-row__text">
                <div className="st-row__title">TV Hub</div>
                <div className="st-row__hint">
                  Remote, broadcast and replay for the living-room TV.
                </div>
              </div>
            </div>
            <div className="st-row st-row--compact">
              <span
                className={`st-dot${
                  status?.online ? " st-dot--ok" : status ? " st-dot--bad" : ""
                }`}
                aria-hidden="true"
              />
              <div className="st-row__hint" role="status">
                {serverStatusLine(status)}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Snackbar
        open={Boolean(notice)}
        message={notice}
        autoHideDuration={2500}
        onClose={() => setNotice("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        className="st-snackbar"
      />
    </div>
  );
}

export default SettingsPage;
