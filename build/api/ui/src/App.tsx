import React, { useState, useEffect, useCallback } from "react";
import { Layout } from "./Layout";
import * as auth from "api/auth";
import * as apiPaths from "api/paths";
// import { Chart } from "./Chart";
import { SummaryStats } from "./components/SummaryStats";
import { AccountsTable } from "./components/AccountsTable";
import { SignIn } from "./components/SignIn";
import { WelcomeFlow } from "./components/WelcomeFlow";
import { LoadingView } from "components/LoadingView";
import { Box } from "@material-ui/core";

type LoginStatus = "login" | "logout" | "loading";

export default function App() {
  const [showValidatorFlow, setShowValidatorFlow] = useState(false);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>();
  const [isOffline, setIsOffline] = useState<boolean>();

  const checkLogin = useCallback(() => {
    auth
      .loginStatus()
      .then(() => {
        setLoginStatus("login");
        setIsOffline(false);
      })
      .catch((e) => {
        console.log(`Login check error`, e);
        setLoginStatus("logout");
        fetch(apiPaths.ping).then(
          (res) => setIsOffline(!res.ok),
          () => setIsOffline(true)
        );
      });
  }, [setLoginStatus]);

  // If it's logged in, keep checking for logged in
  useEffect(() => {
    if (loginStatus === "logout") return;
    const interval = setInterval(checkLogin, 5000);
    return () => clearInterval(interval);
  }, [loginStatus, checkLogin]);

  function onSignIn() {
    checkLogin();
  }

  function logout() {
    auth.logout().then(checkLogin).catch(console.error);
  }

  function addValidator() {
    setShowValidatorFlow(true);
  }

  if (loginStatus === "login")
    if (showValidatorFlow)
      return <WelcomeFlow onExit={() => setShowValidatorFlow(false)} />;
    else
      return (
        <Layout logout={logout}>
          {/* <Chart /> */}
          <SummaryStats />
          <AccountsTable addValidator={addValidator} />
        </Layout>
      );

  if (loginStatus === "logout")
    return <SignIn onSignIn={onSignIn} isOffline={isOffline} />;

  return (
    <Box m={3}>
      <LoadingView steps={["Connecting to server", "Retrieving session"]} />
    </Box>
  );
}
