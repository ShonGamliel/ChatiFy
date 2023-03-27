import "./Chat.css";
import React from "react";
import axios from "axios";

function getHour(timestamp) {
  const date = new Date(timestamp);

  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function OutComeMessage({ message }) {
  const [imagesUrls, setImagesUrls] = React.useState([]);
  return (
    <div className="outcome-message">
      {message.image ? (
        <div className="message-imagess">
          {message.images.map((img, idx) => {
            return (
              <div className="message-imagee">
                <img key={idx} src={img} alt="" />
              </div>
            );
          })}
        </div>
      ) : (
        <></>
      )}
      <div className="inner-message">
        <div className="message-time">{getHour(message.timestamp)}</div>
        <div className="message-text">{message.text}</div>
      </div>
    </div>
    // <div className="outcome-message">
    //   {message.image ? (
    //     <div className="message-images">
    //       {message.images.map((img, idx) => {
    //         return <img key={idx} className="message-image" src={img} alt="" />;
    //       })}
    //     </div>
    //   ) : (
    //     <></>
    //   )}
    //   <div className="inner-message">
    //     <div className="message-time">{getHour(message.timestamp)}</div>
    //     <div className="message-text">{message.text}</div>
    //     {/* <div className="message-status">sent</div> */}
    //   </div>
    // </div>
  );
}

function InComeMessage({ message }) {
  return (
    <div className="income-message">
      <div className="inner-message">
        <div className="message-text">{message.text}</div>
        <div className="message-time">{getHour(message.timestamp)}</div>
      </div>
      {message.image ? (
        <div className="message-images">
          {message.images.map((img, idx) => (
            <img key={idx} className="message-image" src={img} alt="" />
          ))}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

export default function Chat({ user, setUser }) {
  const chatInputRef = React.useRef();
  const searchInputRef = React.useRef();
  const chatMessagesRef = React.useRef();

  const [messages, setMessages] = React.useState([]);
  const [chatHistory, setChatHistory] = React.useState([]);

  const [currentChat, setCurrentChat] = React.useState(false);

  const [typing, setTyping] = React.useState(false);

  const [ws, setWS] = React.useState();

  const [messagesFromDB, setMessagesFromDB] = React.useState([]);

  const [thinScreen, setThinScreen] = React.useState(false);
  const [screenWidth, setScreenWidth] = React.useState(window.innerWidth);

  const [usersTyping, setUsersTyping] = React.useState([]);

  const addUserTyping = (data) => {
    setUsersTyping((usersTyping) => usersTyping.concat(`u${data.from}u${data.to}`));
  };

  const checkUserTyping = (data) => {
    return usersTyping.includes(`u${data.from}u${user.userid}`) || usersTyping.includes(`u${data.to}u${user.userid}`) || usersTyping.includes(`u${user.userid}u${data.from}`) || usersTyping.includes(`u${user.userid}u${data.to}`);
  };

  const removeUserTyping = (data) => {
    let result = [...usersTyping];
    result = result.filter((item) => item != `u${data.from}u${user.userid}` && item != `u${data.to}u${user.userid}` && item != `u${user.userid}u${data.from}` && item != `u${user.userid}u${data.to}`);
    setUsersTyping(result);
  };

  // const removeUserTyping = (data) => {
  //   removeUserTyping.filter(item => item != )
  // }

  const sendMessageToServer = (message) => {
    if (ws) {
      ws.send(JSON.stringify(message));
    }
  };

  const updateChatHistory = (message) => {
    let result = [...chatHistory];
    let changed = false;
    result = result.map((item) => {
      if (item.chatid == `u${message.to}u${message.from}` || item.chatid == `u${message.from}u${message.to}`) {
        item = message;
        changed = true;
      }
      return item;
    });
    if (!changed) {
      result.push(message);
    }
    setChatHistory(result);
  };

  React.useEffect(() => {
    axios.get(`${process.env.REACT_APP_SERVER}/chats`, { withCredentials: true }).then((res) => {
      setChatHistory(res.data);
    });

    if (window.innerWidth > 550) {
      setThinScreen(false);
    } else {
      setThinScreen(true);
    }

    window.addEventListener("resize", () => {
      setScreenWidth(window.innerWidth);
      if (window.innerWidth > 550) {
        setThinScreen(false);
      } else {
        setThinScreen(true);
      }
    });
  }, []);

  React.useEffect(() => {
    if (currentChat) {
      setTimeout(() => (chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight), 1);
    }
  }, [messages, messagesFromDB, currentChat]);

  React.useEffect(() => {
    let wss = new WebSocket(`ws://192.168.1.28:8080/ws`);
    setWS(wss);

    wss.addEventListener("open", (event) => {
      wss.send(JSON.stringify({ MyID: user.userid }));
    });

    wss.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.privateMessage) {
        updateChatHistory(message);
        if (currentChat.userid == message.from || message.from == user.userid) {
          setMessages([...messages, message]);
        }
        // if (message.image) {
        //   // console.log(message);
        // }
      }
      if (message.typing != undefined) {
        if (message.typing) {
          addUserTyping(message);
        } else {
          removeUserTyping(message);
        }
      }
    });
  }, [messages, currentChat]);

  React.useEffect(() => {
    setMessages([]);
    if (currentChat) {
      axios.get(`${process.env.REACT_APP_SERVER}/chat/${currentChat.userid}`, { withCredentials: true }).then((res) => {
        setMessagesFromDB(res.data);
      });
    }
  }, [currentChat]);

  const lastHistoryString = (str) => {
    const newlineIndex = str.indexOf("\n");
    const truncatedStr = newlineIndex != -1 ? str.slice(0, newlineIndex) : str.slice(0, thinScreen ? screenWidth / 22 : screenWidth / 55);
    const result = truncatedStr.length < str.length ? truncatedStr + "..." : truncatedStr;
    return result;
  };

  const [uploadImages, setUploadImages] = React.useState([]);
  const [imagesUploadNumber, setImagesUploadNumber] = React.useState(0);
  const [imagesReady, setImagesReady] = React.useState(true);

  const imageInputChange = (event) => {
    setImagesReady(false);
    const files = event.target.files;
    setImagesUploadNumber(files.length);

    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.readAsDataURL(files[i]);
      reader.onloadend = () => {
        setUploadImages((uploadImages) => [...uploadImages, reader.result]);
      };
    }
  };

  React.useEffect(() => {
    if (imagesUploadNumber) {
      if (uploadImages.length == imagesUploadNumber) {
        setImagesReady(true);
      }
    }
  }, [imagesUploadNumber, uploadImages]);

  if (ws) {
    return (
      <div id="container">
        <div id="chats-right" style={{ display: thinScreen ? (currentChat ? "none" : "flex") : "flex" }}>
          <div id="title">
            <input
              type="text"
              placeholder="Search user"
              id="search-input"
              ref={searchInputRef}
              onInput={(e) => {
                if (e.target.value.length > 0) {
                  axios.get(`${process.env.REACT_APP_SERVER}/search/${searchInputRef.current.value}`).then((res) => {
                    let result = [];
                    for (let lastSearchItem of res.data) {
                      result.push({
                        from: lastSearchItem.userid,
                        fromusername: lastSearchItem.username,
                        to: lastSearchItem.userid,
                        tousername: lastSearchItem.username,
                        chatid: `u${lastSearchItem.userid}u${user.userid}`,
                      });
                    }
                    setChatHistory(result);
                  });
                } else {
                  axios.get(`${process.env.REACT_APP_SERVER}/chats`, { withCredentials: true }).then((res) => {
                    setChatHistory(res.data);
                  });
                }
              }}
            />
          </div>

          <div id="chats">
            {chatHistory
              .sort((b, a) => a.timestamp - b.timestamp)
              .map((item, idx) => (
                <div
                  className={currentChat.chatid == `u${item.from}u${item.to}` || currentChat.chatid == `u${item.to}u${item.from}` ? "chat-preview-selected" : "chat-preview"}
                  key={idx}
                  onClick={() => {
                    if (currentChat.chatid == `u${item.from}u${item.to}` || currentChat.chatid == `u${item.to}u${item.from}`) return;
                    setMessages([]);
                    setMessagesFromDB([]);
                    console.log("entered chat");
                    setCurrentChat({ userid: item.from == user.userid ? item.to : item.from, username: item.fromusername == user.username ? item.tousername : item.fromusername, chatid: item.chatid, from: item.from, to: item.to });
                  }}
                >
                  <div className="chat-preview-name">{item.fromusername == user.username ? item.tousername : item.fromusername}</div>
                  <div className="chat-preview-text">{checkUserTyping(item) ? "typing..." : lastHistoryString(item.text ? (item.from == user.userid ? "> " : "") + (item.image ? "IMG " : "") + item.text : "")}</div>
                  <div className="chat-preview-time">{item.timestamp ? getHour(item.timestamp) : <></>}</div>
                </div>
              ))}
          </div>
        </div>
        {currentChat ? (
          <div id="chat" style={{ display: thinScreen ? (currentChat ? "flex" : "none") : "flex" }}>
            <div id="chat-top">
              <div
                id="back-button"
                onClick={() => {
                  console.log("left chat");
                  setCurrentChat(false);
                }}
              >
                Back
              </div>
              <div id="chat-title">
                <div id="chat-name">{currentChat.username}</div>
                <div id="chat-status">{checkUserTyping(currentChat) ? "typing..." : ""}</div>
              </div>
            </div>
            <div id="chat-messages" ref={chatMessagesRef}>
              {messagesFromDB.sort((a, b) => a.timestamp - b.timestamp).map((msg, idx) => (msg.from == user.userid ? <OutComeMessage key={idx} message={msg} /> : <InComeMessage key={idx} message={msg} />))}
              {messages.map((msg, idx) => (msg.from == user.userid ? <OutComeMessage key={idx} message={msg} /> : <InComeMessage key={idx} message={msg} />))}
            </div>
            <div>
              {imagesUploadNumber ? (
                <div id="upload-images" style={{ backgroundColor: uploadImages.length == imagesUploadNumber ? "" : "red" }}>
                  {uploadImages.map((img, idx) => (
                    <img key={idx} src={img} alt="" />
                  ))}
                </div>
              ) : (
                <></>
              )}
              <div id="chat-input">
                <div
                  id="chat-input-text"
                  contentEditable="true"
                  ref={chatInputRef}
                  onInput={(e) => {
                    let currentText = e.target.textContent;
                    if (currentText.length == 0) {
                      e.target.innerHTML = "";
                      if (typing) {
                        // console.log("false");
                        sendMessageToServer({ typing: false, from: user.userid, chatid: currentChat.chatid, to: currentChat.userid });
                        setTyping(false);
                      }
                    } else {
                      if (!typing || currentText.length % 10 == 0) {
                        // console.log("true");
                        sendMessageToServer({ typing: true, from: user.userid, chatid: currentChat.chatid, to: currentChat.userid });
                        setTyping(true);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.code == "Enter" && !e.shiftKey) {
                      let text = chatInputRef.current.innerText.trimEnd().trimStart();

                      if (text.length == 0) return;
                      sendMessageToServer({
                        privateMessage: true,
                        from: user.userid,
                        to: currentChat.userid,
                        text: text,
                        timestamp: Date.now(),
                        fromusername: user.username,
                        tousername: currentChat.username,
                        ...{ image: imagesUploadNumber ? true : false, images: imagesUploadNumber ? uploadImages : [] },
                      });
                      setImagesUploadNumber(0);
                      setImagesReady(true);
                      setUploadImages([]);
                      chatInputRef.current.innerText = "";
                      chatInputRef.current.focus();
                    }
                  }}
                ></div>
                <div
                  id="send-button"
                  onClick={() => {
                    let text = chatInputRef.current.innerText.trimEnd().trimStart();
                    if (text.length == 0) return;
                    // setMessages([...messages, { privateMessage: true, from: user.userid, to: currentChat.userid, text: text, timestamp: Date.now() }]);
                    sendMessageToServer({
                      privateMessage: true,
                      from: user.userid,
                      to: currentChat.userid,
                      text: text,
                      timestamp: Date.now(),
                      fromusername: user.username,
                      tousername: currentChat.username,
                      ...{ image: imagesUploadNumber ? true : false, images: imagesUploadNumber ? uploadImages : [] },
                    });
                    setImagesUploadNumber(0);
                    setImagesReady(true);
                    setUploadImages([]);
                    chatInputRef.current.innerText = "";
                    chatInputRef.current.focus();
                  }}
                >
                  Send
                </div>
                <input type="file" id="img-input" multiple style={{ display: "none" }} onChange={(e) => imageInputChange(e)} />
                <label id="img-button" htmlFor="img-input">
                  IMG
                </label>
              </div>
            </div>
          </div>
        ) : (
          <></>
        )}
      </div>
    );
  }
}
