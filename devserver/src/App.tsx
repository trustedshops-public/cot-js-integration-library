import { AnonymousConsumerData } from "../../src";
import "./App.css";
import * as React from "react";

declare global {
  interface Window {
    authUser: AnonymousConsumerData;
  }
}

function App() {
  const [authUser, setAuthUser] = React.useState<AnonymousConsumerData>();

  React.useEffect(() => {
    const authUser = window.authUser;
    if (authUser) {
      setAuthUser(authUser);
    }
  }, []);

  return (
    <main className="App">
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
