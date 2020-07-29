import React, { useState, useCallback } from "react";
import {
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  makeStyles,
} from "@material-ui/core";
import { RequestStatus } from "types";
import { ErrorView } from "./ErrorView";
import { Alert } from "@material-ui/lab";
import BackupIcon from "@material-ui/icons/Backup";
import CloseIcon from "@material-ui/icons/Close";
import { useDropzone } from "react-dropzone";
import { processEth2File } from "../utils/eth2FileParser";
import { PublicKeyView } from "./PublicKeyView";
import { ValidatorImport, Eth2Keystore, Eth2Deposit } from "common";
import { api } from "api/rpc";

const useStyles = makeStyles((theme) => ({
  dropzone: {
    height: theme.spacing(20),
    backgroundColor: "#e5e5e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  dropzoneIcon: {
    color: theme.palette.text.secondary,
    fontSize: theme.spacing(6),
  },
  deleteValidator: {
    display: "flex",
    opacity: 0.5,
    "&:hover": {
      opacity: 1,
    },
  },
}));

interface ValidatorFiles {
  pubkey: string;
  keystore?: Eth2Keystore;
  depositData?: Eth2Deposit;
  passphrase?: string;
}

export function ImportValidatorsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [validators, setValidators] = useState(
    new Map<string, ValidatorFiles>()
  );
  const [keystoreStatus, setKeystoreStatus] = useState<RequestStatus<string>>(
    {}
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      console.log({ acceptedFiles });
      for (const file of acceptedFiles) {
        try {
          const eth2File = await processEth2File(file);
          setValidators((_validators) => {
            switch (eth2File.type) {
              case "keystore": {
                let validator = validators.get(eth2File.keystore.pubkey);
                if (!validator)
                  validator = { pubkey: eth2File.keystore.pubkey };
                validator.keystore = eth2File.keystore;
                validators.set(validator.pubkey, validator);
                break;
              }

              case "deposit": {
                for (const deposit of eth2File.data) {
                  let validator = validators.get(deposit.pubkey);
                  if (!validator) validator = { pubkey: deposit.pubkey };
                  validator.depositData = deposit;
                  validators.set(validator.pubkey, validator);
                }
                break;
              }

              case "passphrase": {
                let validator = validators.get(eth2File.pubkey);
                if (!validator) validator = { pubkey: eth2File.pubkey };
                validator.passphrase = eth2File.passphrase;
                validators.set(validator.pubkey, validator);
                break;
              }
            }

            return _validators;
          });
        } catch (e) {
          console.error(`Error processing ${file.name}`, e);
        }
      }
    },
    [setValidators]
  );

  async function importValidators() {
    try {
      const validatorsReady: ValidatorImport[] = [];
      for (const validator of Array.from(validators.values()))
        if (validator.pubkey && validator.keystore && validator.passphrase)
          validatorsReady.push(validator as ValidatorImport);

      if (validatorsReady.length === 0) return;

      await api.importValidators(validatorsReady);
      onClose();
    } catch (e) {
      console.error(`Error importing validators`, e);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const classes = useStyles();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Import validators</DialogTitle>
      <DialogContent>
        <DialogContentText>
          <Typography>
            Drag and drop validator keystores and their passphrases generated by
            either the Ethereum Foundation Launchpad or any client keymanagment
            tool.
          </Typography>
        </DialogContentText>

        <Box my={3}>
          <Box mb={2}>
            <Alert severity="warning">
              Do not upload withdrawal keystores or mnemonics, only voting /
              signing keystores
            </Alert>
          </Box>

          <div {...getRootProps()} className={classes.dropzone}>
            <input {...getInputProps()} />
            <div>
              <BackupIcon className={classes.dropzoneIcon} />
              <Typography color="textSecondary">
                {isDragActive
                  ? "Drop the files here..."
                  : "Drag and drop some files here, or click to select files"}
              </Typography>
            </div>
          </div>
        </Box>

        {validators.size > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pubkey</TableCell>
                  <TableCell>Keystore</TableCell>
                  <TableCell>Passphrase</TableCell>
                  <TableCell>Deposit data</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from(validators.values()).map((validator, i) => (
                  <TableRow key={validator.pubkey}>
                    <TableCell>
                      <PublicKeyView publicKey={validator.pubkey} />
                    </TableCell>
                    <TableCell>
                      {validator.keystore ? "OK" : "missing"}
                    </TableCell>
                    <TableCell>
                      {validator.passphrase ? "OK" : "missing"}
                    </TableCell>
                    <TableCell>
                      {validator.depositData ? "OK" : "missing"}
                    </TableCell>
                    <TableCell
                      className={classes.deleteValidator}
                      onClick={() => validators.delete(validator.pubkey)}
                    >
                      <CloseIcon />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* <Box my={1}>
          <InputPassword
            password={password}
            setPassword={setPassword}
            error={hasErrors}
          />

          <InputPassword
            name="Confirm"
            id="confirm-password-toogle-show"
            password={passwordConfirm}
            setPassword={setPasswordConfirm}
            error={hasErrors}
          />
          {errors.map((error) => (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          ))}
        </Box> */}

        <Box mt={3} mb={1}>
          <Button
            variant="contained"
            color="primary"
            onClick={importValidators}
            disabled={!Array.from(validators.values()).some(isValidatorReady)}
          >
            Import validators
          </Button>
        </Box>

        {keystoreStatus.error && <ErrorView error={keystoreStatus.error} />}
      </DialogContent>
    </Dialog>
  );
}

function isValidatorReady(validator: ValidatorFiles): boolean {
  return Boolean(
    validator.keystore && validator.passphrase && validator.pubkey
  );
}
