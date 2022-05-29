import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from "./idl.json";
import kp from "./keypair.json"
import React, {useEffect, useState} from "react";
import { Program, Provider, web3 } from '@project-serum/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
require('dotenv').config();

//solanaコアプログラムへの参照
const {SystemProgram, Keypair} = web3;
//gifデータを保持するアカウントのキーペアを読み込む
//let baseAccount = Keypair.generate();
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

//idlファイルからプログラムidを取得
const programID = new PublicKey(idl.metadata.address);

//ネットワークをdevnetに設定
const network = clusterApiUrl("devnet");

//トランザクションが完了した時の通知方法を制御
const opts = {
  preflightCommitment: "processed"
}

// 定数を宣言します。
const TWITTER_HANDLE = 'naka_aib';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  //ゆざーのウォレットアドレスのstateを管理するためのuseStateを使用する
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);

  //definegif
  const TEST_GIFS = [
    "https://media.giphy.com/media/5pYfUJHTZpsn5A7rIA/giphy.gif",
    "https://media.giphy.com/media/wp0KmG3sINWUz2WgZk/giphy.gif",
    "https://media.giphy.com/media/ZZHY2nlygherWceru9/giphy.gif",
    "https://media.giphy.com/media/9oI3XUcm3svVwvHLvM/giphy.gif"
  ]


  //wallet接続を確認する
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana)  {
        if (solana.isPhantom){
        console.log("Phantom wallet found!");
        const response = await solana.connect({ onlyIftrusted: true })
        console.log(" connected with pubkey:", response.publicKey.toString());
        //stateの更新
        setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("solana object not found! get a phantom wallet")
      }
    } catch (error) {
      console.error(error);
    }
  };

  //connect wallet ボタンを押した時に動作する関数
  const connectWallet = async () => {
    const {solana} = window;
    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };
//入力されたinput関数をもとに、stateを更新
  const onInputChange =  (event) => {
    const {value} = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("created a new baseaccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();
    } catch(error) {
      console.log("error creating account:", error)
    }
  }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("no gif link given")
      return
    }
    setInputValue("");
    console.log("giflink;", inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("gif successfully set to program", inputValue)
      await getGifList();
    } catch (error) {
    console.log("error sending gifs", error)
    }

  };

  //gifのurlの入力boxを作る
  const renderConnectedContainer = () => {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
        Do one time initialization for gif program account
          </button>
        </div>
      )
    } 
    else {
      return(
    <div className="connected-container">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendGif();
        }}
        >
        <input type="text" placeholder="Enter gif link!" value={inputValue} onChange={onInputChange} />
        <button type="submit" className="cta-button submit-gif-button">Submit</button>
        </form>
        <div className="gif-grid">
          {gifList.map((item, index) => (
            <div className="gif-item" key={index}>
              <img src={item.gifLink}/>
            </div>
        ))}
        </div>
    </div>
      )
          }
        }


  //ウォレットをつないでいないユーザーに表示させるui
  const renderNotConnectedContainer = () => (
    <button
    className="cta-button connect-wallet-button"
    onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

//初回のみに行うためのuseEffect 第二引数の[]を空にするとそうなる
useEffect(() => { 
  const onLoad = async () => {
    await checkIfWalletIsConnected();
  };
  window.addEventListener("load", onLoad);
  return () => window.removeEventListener("load", onLoad);
}, []);

//getgiflistを定義
const getGifList = async() => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

    console.log("got an account ", account)
    setGifList(account.gifList);
  } catch (error) {
    console.log("error in getgiflist: ",error)
    setGifList(null);
  }
}

// wallet addressが設定されているのみ実行されるuseeffect を定義。
useEffect(() => {
  if (walletAddress) {
    console.log("Fetching GIF list...");
    //solanaのプロがグラムからフェッチ処理をここに書く
    // testgifsをgiflistに設定
    getGifList()
  }
  
}, [walletAddress]);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🏸 GIF Portal 🎾</p>
          <p className="sub-text">
            View your  tennis GIF collection 🎾
          </p>
          {!walletAddress && renderNotConnectedContainer()}
        </div>
        <main className="main">
          {walletAddress && renderConnectedContainer()}
        </main>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;