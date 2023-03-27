import React from "react";
import axios from "axios";
import "./Login.css";

export default function Login({ setUser }) {
  const [username, setUsername] = React.useState();
  const [password, setPassword] = React.useState();
  const [loginusername, setLoginusername] = React.useState();
  const [loginpassword, setLoginPassword] = React.useState();
  const [error, setError] = React.useState(false);

  return (
    <div id="main-screen" className="fullscreen">
      {error ? <div className="error-box">{error}</div> : <></>}

      <div className="fullscreen-blur">
        <div className="fullscreen-center">
          <input id="main-checkbox" type="checkbox" />

          <form
            onSubmit={(event) => {
              event.preventDefault();
              axios({
                method: "post",
                url: `${process.env.REACT_APP_SERVER}/register`,
                withCredentials: true,
                headers: { "Content-Type": "application/json" },
                data: {
                  username: username,
                  password: password,
                },
              }).then((res) => {
                if (res.data.error) {
                  setError(res.data.message);
                  setTimeout(() => setError(false), 6000);
                } else {
                  setUser(res.data.user);
                }
              });
            }}
            id="register-form"
            className="main-form"
          >
            <div id="main-logo">ChatiFy</div>
            <input type="text" placeholder="Username" name="username" onChange={(e) => setUsername(e.target.value)} />
            <input type="password" placeholder="Password" name="password" onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">Register</button>
            <label htmlFor="main-checkbox">Already have an account?</label>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              axios({
                method: "post",
                url: `${process.env.REACT_APP_SERVER}/login`,
                withCredentials: true,
                headers: { "Content-Type": "application/json" },
                data: {
                  username: loginusername,
                  password: loginpassword,
                },
              }).then((res) => {
                console.log(res.data);

                if (res.data.error) {
                  setError(res.data.message);
                  setTimeout(() => setError(false), 6000);
                } else {
                  setUser(res.data.user);
                }
              });
            }}
            id="login-form"
            className="main-form"
          >
            <div id="main-logo">ChatiFy</div>
            <input type="text" placeholder="Username" name="username" onChange={(e) => setLoginusername(e.target.value)} />
            <input type="password" placeholder="Password" name="password" onChange={(e) => setLoginPassword(e.target.value)} />
            <button type="submit">Login</button>
            <label htmlFor="main-checkbox">Don't have an account?</label>
          </form>
        </div>
      </div>
    </div>
  );
}
