//======== [Server Init] =======================
const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const app = express();
const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");

const CLIENT = "http://192.168.1.28:3000";
const MONGODB_ADDRESS = "mongodb+srv://admin:admin@chatify.jayrowv.mongodb.net/?retryWrites=true&w=majority";

mongoose.set("strictQuery", false);
mongoose
  .connect(MONGODB_ADDRESS)
  .then(console.log("Connected to DataBase"))
  .catch((err) => console.log(err));

const PRODUCTION = false;

let server;
let wss;
if (PRODUCTION) {
  server = app.listen("3001");
  wss = new WebSocket.Server({ server });
} else {
  app.listen("3001");
  wss = new WebSocket.Server({ port: 8080 });
}

const UserSchema = new mongoose.Schema({
  userid: {
    type: Number,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  joinDate: {
    type: Date,
    required: true,
    default: new Date(),
  },
  salt: {
    type: String,
    required: true,
  },
  chats: [Number],
});

const MessageSchema = new mongoose.Schema({
  from: Number,
  to: Number,
  timestamp: Number,
  fromusername: String,
  tousername: String,
  text: String,
  chatid: String,
  image: Boolean,
  images: {
    type: Array,
    data: Buffer,
    contentType: String,
  },
});

const SessionSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
  },
  userid: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("users", UserSchema);
const Message = mongoose.model("messages", MessageSchema);
const Session = mongoose.model("sessions", SessionSchema);

const connections = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      message = JSON.parse(message);
    } catch (error) {
      console.error("Error parsing message:", error);
      return;
    }

    if (message.MyID) {
      connections.set(message.MyID, ws);
      ws.id = message.MyID;
    }
    if (message.privateMessage) {
      message.chatid = `u${message.from}u${message.to}`;
      ws.send(JSON.stringify(message));
      if (connections.get(message.to)) {
        connections.get(message.to).send(JSON.stringify(message));
      }

      saveMessageInDataBase(message);
    }
    // console.log(message);
    if (message.typing != undefined) {
      if (connections.get(message.to)) {
        connections.get(message.to).send(JSON.stringify(message));
      }
    }
  });

  ws.on("close", () => {
    connections.delete(ws.id);
  });
});

//========= [Middleware Functions] ===================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: CLIENT,
    credentials: true,
  })
);

app.use(async (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", CLIENT);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.header("cookies")) {
    req.cookies = parseCookies(req.header("cookies"));
  }

  if (!req.cookies || !req.cookies.connect_sid) return next();
  let sessionFromDB = await Session.findOne({ session_id: req.cookies.connect_sid });
  if (!sessionFromDB) return next();
  let userFromDB = await User.findOne({ _id: sessionFromDB.userid });
  if (!userFromDB) {
    await Session.deleteOne({ _id: sessionFromDB._id });
    return next();
  }
  userFromDB.password = undefined;
  userFromDB.salt = undefined;
  req.user = userFromDB;
  next();
});

app.post("/register", async (req, res) => {
  if (req.user) return res.sendStatus(401);
  if (!req.body.username) return res.send({ error: true, field: "username", message: "enter a username" });
  let user = await User.findOne({ username: req.body.username });
  if (user) return res.send({ error: true, field: "username", message: "username already exists" });
  if (!req.body.password) return res.send({ error: true, field: "password", message: "enter a password" });
  if (req.body.password.length < 4) return res.send({ error: true, field: "password", message: "password must be at least 4 characters" });

  let salt = bcrypt.genSaltSync(10);
  let usersCount = await User.countDocuments();
  let newUser = await User.create({ userid: usersCount, username: req.body.username, password: hashPassword(req.body.password, salt), salt: salt });
  let session = newsession();
  res.cookie("connect_sid", session);
  await Session.create({ session_id: session, userid: newUser._id });
  res.send({ authenticated: true, session_id: session, user: newUser });
});

app.post("/logout", async (req, res) => {
  if (!req.user) return res.sendStatus(401);
  let sessionFromDB = await Session.findOne({ session_id: req.cookies.connect_sid });
  req.user = undefined;
  if (sessionFromDB) await Session.deleteOne({ _id: sessionFromDB._id });
  req.user = undefined;
  res.send({ logout: true });
});

app.post("/login", async (req, res) => {
  if (req.user) return res.sendStatus(401);
  if (!req.body.username) return res.send({ error: true, field: "username", message: "enter a username" });
  let userFromDB = await User.findOne({ username: req.body.username });
  if (!userFromDB) return res.send({ error: true, field: "username", message: "username doesnt exists" });
  if (!req.body.password) return res.send({ error: true, field: "password", message: "enter a password" });
  if (!comparePassword(req.body.password, userFromDB.password, userFromDB.salt)) return res.send({ error: true, field: "password", message: "incorrect password" });
  let existedSession = await Session.findOne({ userid: userFromDB._id });
  if (existedSession) await Session.deleteOne({ _id: existedSession._id });

  let session = newsession();
  await Session.create({ session_id: session, userid: userFromDB._id });
  res.send({ authenticated: true, session_id: session, user: userFromDB });
});

app.get("/user", (req, res) => {
  res.send(req.user);
});

function newsession() {
  let result = "";
  const characters = "j5d^zW8XvAa_LK?0kFyR>s`*iG}w)q3%[t@f{E!#o<2Q$6+SU1(4)p9]xO-cJrB&HNhMT^PbnYg7ClIeV}uZ)";
  for (let i = 0; i < characters.length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function hashPassword(password, salt) {
  const secretCode = "j5d^zW8XvAa_LK?0kFyR>s`*iG}w)q3%[t@f{E!#o<2Q$6+SU1(4)p9]xO-cJrB&HNhMT^PbnYg7ClIeV}uZ)";
  const hashedPassword = bcrypt.hashSync(password + secretCode, salt);
  return hashedPassword;
}

function comparePassword(password, passwordFromDB, saltFromDB) {
  const secretCode = "j5d^zW8XvAa_LK?0kFyR>s`*iG}w)q3%[t@f{E!#o<2Q$6+SU1(4)p9]xO-cJrB&HNhMT^PbnYg7ClIeV}uZ)";
  const hashedPassword = bcrypt.hashSync(password + secretCode, saltFromDB);
  return hashedPassword == passwordFromDB;
}

function parseCookies(source) {
  const lines = source.trim().split("\n");
  const result = {};

  for (const line of lines) {
    const [key, value] = line.split("=");
    result[key] = value;
  }

  return result;
}

async function saveMessageInDataBase(message) {
  try {
    await Message.create(message);
  } catch (e) {
    console.log(e);
    return;
  }
  await User.updateOne({ userid: message.to }, { $addToSet: { chats: message.from } });
  await User.updateOne({ userid: message.from }, { $addToSet: { chats: message.to } });
}

app.get("/search/:username", async (req, res) => {
  let users = await User.find({ username: { $regex: req.params.username, $options: "i" } });
  res.send(users);
});

app.get("/chat/:id", async (req, res) => {
  if (!req.user) return res.sendStatus(401);
  let messages = await Message.find({
    $or: [
      { to: req.user.userid, from: req.params.id },
      { from: req.user.userid, to: req.params.id },
    ],
  });
  res.send(messages);
});

app.get("/chats", async (req, res) => {
  if (!req.user) return res.sendStatus(401);
  let user = await User.findOne({ userid: req.user.userid });
  if (!user.chats) return res.send([]);
  let result = [];
  for (let c of user.chats) {
    let last = await Message.findOne(
      {
        $or: [
          { to: req.user.userid, from: c },
          { from: req.user.userid, to: c },
        ],
      },
      {},
      { sort: { timestamp: -1 } }
    );
    if (last) result.push(last);
  }
  res.send(result);
});
