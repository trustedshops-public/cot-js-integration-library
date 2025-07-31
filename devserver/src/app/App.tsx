import { useEffect, useState } from "react";

import "./App.css";
import { ConsumerData } from "../../../src";

declare global {
  interface Window {
    authUser: ConsumerData;
  }
}

function App() {
  const [authUser, setAuthUser] = useState<ConsumerData>();

  useEffect(() => {
    const authUser = window.authUser;
    if (authUser) {
      setAuthUser(authUser);
    }
  }, []);

  return (
    <main className="App" style={{ display: "none" }}>
      <div className="App-header">
        <h1>Development Server</h1>
        <trstd-switch tsid="X832CCBC339C1B6586599463D3C2C5DF5"></trstd-switch>
      </div>
      <hr />
      {authUser ? (
        <div>
          <h2>User Insights</h2>
          <pre>{JSON.stringify(authUser, null, 2)}</pre>
        </div>
      ) : (
        <div>
          <h2>No user data available</h2>
          <p>Try logging in using the Switch and refresh page</p>
        </div>
      )}
    </main>
  );
}

export default App;
