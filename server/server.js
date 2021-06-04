const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  const cors = require('cors');
  let PORT = process.env.PORT;
  if( PORT == null || PORT == ""){
      PORT = 8000;
  }
const { wakeUp } = require('./tv-controller');

  
app.use(cors())
app.use(express.static(__dirname));
app.use(bodyParser.json());
let corsWhitelist = ['*'];
var corsOptions = {
  origin: function (origin, callback) {
    if (corsWhitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

app.get('/turn_on', (req, res) => {
  wakeUp();
  res.send('Hello');
})

io.on('connection', (socket) => {
    console.log('a user connected')
});

let server = http.listen(PORT, ()=> {
    console.log(`Server is listening on port ${PORT}`);
});

