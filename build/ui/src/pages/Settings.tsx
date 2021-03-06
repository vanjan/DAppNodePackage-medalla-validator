import React from "react";
import { useApi } from "api/rpc";
import { Typography, makeStyles } from "@material-ui/core";
import { LayoutItem } from "components/LayoutItem";
import { Title, TitlePage } from "components/Title";
import { SelectBeaconProvider } from "components/SelectBeaconProvider";
import { SelectValidatorClient } from "components/SelectValidatorClient";
import { ErrorView } from "components/ErrorView";
import { LoadingView } from "components/LoadingView";
import { Alert } from "@material-ui/lab";

const useStyles = makeStyles((theme) => ({
  selectDescription: {
    flexGrow: 1,
  },
  selectFormControl: {
    marginTop: theme.spacing(3),
  },
}));

export function Settings() {
  const appSettings = useApi.getSettings();
  const classes = useStyles();
  return (
    <>
      <TitlePage>Settings</TitlePage>

      {appSettings.data ? (
        <>
          {appSettings.data.beaconProvider &&
            appSettings.data.validatorClient &&
            appSettings.data.validatorClient !==
              appSettings.data.beaconProvider && (
              <Alert severity="warning">
                Validating with different Beacon and Validator client may cause
                incompatibility issues
              </Alert>
            )}

          <LayoutItem>
            <Title>Beacon node provider</Title>
            <Typography className={classes.selectDescription}>
              Beacon node provider that all validators connect to, to fetch
              duties and publish attestations and blocks
            </Typography>
            <SelectBeaconProvider
              appSettings={appSettings.data}
              onSuccess={appSettings.revalidate}
            />
          </LayoutItem>

          <LayoutItem>
            <Title>Validator client</Title>
            <Typography className={classes.selectDescription}>
              Validator client used to validate with all provided keystores
            </Typography>
            <SelectValidatorClient
              appSettings={appSettings.data}
              onSuccess={appSettings.revalidate}
            />
          </LayoutItem>
        </>
      ) : appSettings.error ? (
        <ErrorView error={appSettings.error} />
      ) : appSettings.isValidating ? (
        <LoadingView steps={["Loading settings..."]} />
      ) : null}
    </>
  );
}
