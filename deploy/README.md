# Running TV Hub on the Pi

## TURN relay (coturn)

Phones and TVs normally connect to each other directly. On some networks they
can't: a desktop wired into another subnet, guest Wi-Fi that isolates devices,
or a browser (often Firefox on Windows or Linux) that can't resolve the other
side's hidden `.local` address. Firefox then reports
`WebRTC: ICE failed, add a TURN server`.

A TURN relay on the Pi fixes that: when a direct connection fails, video goes
phone → Pi → TV instead. Devices that can connect directly still do. The relay
only forwards packets to addresses on the local network (see
`coturn/turnserver.conf`), and the video stays end-to-end encrypted.

### Set up

1. Install coturn:

   ```sh
   sudo apt install -y coturn
   ```

2. Make a secret and install the config with it:

   ```sh
   SECRET=$(openssl rand -hex 32)
   sed "s/^static-auth-secret=.*/static-auth-secret=$SECRET/" \
     deploy/coturn/turnserver.conf | sudo tee /etc/turnserver.conf >/dev/null
   echo "TURN_SECRET=$SECRET" >> server/.env
   ```

   `server/.env` is git-ignored. The app server reads `TURN_SECRET` and hands
   out short-lived credentials made from it at `GET /api/ice`.

3. Enable and start coturn:

   ```sh
   # Older Debian packages only start coturn when this line is uncommented.
   sudo sed -i 's/^#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn 2>/dev/null
   sudo systemctl enable --now coturn
   sudo systemctl status coturn --no-pager | head -5
   ```

4. Restart the app (stop it with Ctrl-C, then `npx yarn@1.22.22 dev` or
   `npx yarn@1.22.22 start` again) so the server picks up `TURN_SECRET`.

5. Check: `curl -sk https://localhost:5173/api/ice` (or port 4173 for
   `start`) should print a `turn` object with a username and credential.
   `{"turn":null}` means the server didn't see `TURN_SECRET`.

If the Pi runs a firewall (`ufw`), allow the relay ports:

```sh
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 49160:49200/udp
```

The relay address is the host the page was opened with (`https://<pi-ip>:…`),
so nothing changes when the Pi moves to another network.
