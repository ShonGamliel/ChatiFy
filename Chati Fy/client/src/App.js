import axios from "axios";
import React from "react";
import "./App.css";
import Login from "./Login";
import Chat from "./Chat";

axios.defaults.headers.common["cookies"] = document.cookie;
axios.interceptors.response.use((res) => {
  if (res.data.authenticated) {
    var farFutureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10);
    document.cookie = `connect_sid=${res.data.session_id}; expires=` + farFutureDate.toUTCString() + "; path=/";
  }
  if (res.data.logout) {
    document.cookie = "connect_sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }
  return res;
});

export default function App() {
  const [user, setUser] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    
    axios
      .get(`${process.env.REACT_APP_SERVER}/user`, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
      .then((res) => {
        setUser(res.data);
        setLoading(false);
      });
  }, []);

  if (!loading) {
    return user ? <Chat setUser={setUser} user={user} /> : <Login setUser={setUser} />;
  } else {
    return <>LOADING</>;
  }
}
