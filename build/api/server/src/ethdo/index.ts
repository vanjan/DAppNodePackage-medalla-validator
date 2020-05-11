import crypto from "crypto";
import { EthdoCmds } from "./cmds";
import { EthdoWallets, WalletAccount, EthdoAccount } from "../../common";
import { logs } from "../logs";
import shell from "../utils/shell";

const withdrawalWallet = "withdrawl";
const validatorWallet = "validator";
type WalletType = typeof validatorWallet | typeof withdrawalWallet;

interface EthdoAccountNoPass {
  account: string;
  passphrase?: string;
}

export class Ethdo extends EthdoCmds {
  /**
   * List all wallets and their accounts
   */
  async listAll(): Promise<EthdoWallets[]> {
    const walletNames = await this.walletList();
    const wallets: EthdoWallets[] = [];
    for (const name of walletNames.sort()) {
      const accounts = await this.walletAccounts({ wallet: name });
      wallets.push({ name, accounts: accounts.sort() });
    }
    return wallets;
  }

  async newRandomValidatorAccount(): Promise<EthdoAccount> {
    await this.assertWalletExists(validatorWallet);
    const accounts = await this.walletAccounts({ wallet: validatorWallet });
    const accountIndex = findFirstAvailableNum(accounts);

    const validatorAccount = `${validatorWallet}/${accountIndex}`;
    const validatorPassword = crypto.randomBytes(32).toString("hex");
    const validator = {
      account: validatorAccount,
      passphrase: validatorPassword
    };
    await this.accountCreate(validator);
    return validator;
  }

  async assertWalletExists(wallet: string): Promise<void> {
    try {
      await this.walletInfo({ wallet });
    } catch (e) {
      await this.walletCreate({ wallet });
    }
  }

  async createValidatorAccount(
    account: EthdoAccountNoPass
  ): Promise<EthdoAccount> {
    return this.createAccount(account, validatorWallet);
  }

  async createWithdrawlAccount(account: EthdoAccount): Promise<EthdoAccount> {
    return this.createAccount(account, withdrawalWallet);
  }

  async createAccount(
    { account, passphrase }: EthdoAccountNoPass,
    wallet: WalletType
  ): Promise<EthdoAccount> {
    await this.assertWalletExists(wallet);
    account = formatAccount(account, wallet);
    passphrase = passphrase || crypto.randomBytes(32).toString("hex");
    await this.accountCreate({ account, passphrase });
    return { account, passphrase };
  }

  async accountWithdrawlList(): Promise<WalletAccount[]> {
    return this.accountList(withdrawalWallet);
  }

  async accountValidatorList(): Promise<WalletAccount[]> {
    return this.accountList(validatorWallet);
  }

  async accountList(wallet: WalletType): Promise<WalletAccount[]> {
    try {
      const accounts = await this.walletAccountsVerbose({ wallet });
      return accounts.map(account => ({
        id: `${wallet}/${account.name}`,
        ...account
      }));
    } catch (e) {
      // In case parsing the wallet account --verbose output fails, fetch each account
      if (!e.message.includes("wallet not found"))
        logs.warn(`Error on walletAccountsVerbose`, e);

      const accounts = await this.walletAccounts({ wallet }).catch(e => {
        if (e.message.includes("wallet not found")) return [] as string[];
        else throw e;
      });
      return await Promise.all(
        accounts.map(async name => {
          const account = `${wallet}/${name}`;
          const publicKey = await this.accountPublicKey(account);
          return {
            id: account,
            name,
            publicKey,
            uuid: ""
          };
        })
      );
    }
  }

  async accountPublicKey(account: string): Promise<string> {
    // publicKeyRes = "Public key: 0x9886f5efa28139ae94302a63dc139ab5b31833b14f8cdebb3314875c7cd890e76a9872aea18d408dba547b3d255e415e"
    const publicKeyRes = await this.accountInfo({ account });
    const publicKey = publicKeyRes.split(":")[1].trim();
    if (!publicKey)
      throw Error(`account info returns unexpected format: ${publicKeyRes}`);
    return publicKey;
  }

  /**
   * Create a new validator account and generate deposit data
   */
  async getDepositData(
    validator: EthdoAccount,
    withdrawalAccount: string
  ): Promise<string> {
    return await this.validatorDepositdata({
      validatoraccount: validator.account,
      passphrase: validator.passphrase,
      withdrawalaccount: withdrawalAccount,
      depositvalue: "32Ether",
      raw: true
    });
  }
}

/**
 * Initialized ethdo instance with local shell
 */
export const ethdo = new Ethdo(shell);

/**
 * Util: Given ["1", "3"] return the first available number: "2"
 * @param arr
 */
function findFirstAvailableNum(arr: string[]): string {
  for (let i = 0; i <= arr.length; i++) {
    const name = String(i + 1);
    if (!arr.includes(name)) return name;
  }
  return String(Math.random()).slice(2); // It's just a label ID
}

/**
 * Makes sure account includes the wallet prefix
 * @param account 1
 * @param wallet validator
 * @return validator/1
 */
function formatAccount(account: string, wallet: string): string {
  if (account.startsWith(wallet)) return account;
  else return `${wallet}/${account}`;
}
