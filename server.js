const express = require("express")
const path = require("path")
const pino = require("pino")
const fs = require("fs")

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const app = express()

app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

let latestCode = "Waiting..."
let connected = false
let sock = null

// 🔥 SAME AUTH FOLDER
const AUTH_FOLDER = "./auth"

async function startBot(number = null) {

  // prevent duplicate socket
  if (sock) {
    try {
      sock.ws.close()
    } catch {}
  }

  // create auth folder
  if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true })
  }

  const { state, saveCreds } =
    await useMultiFileAuthState(AUTH_FOLDER)

  const { version } =
    await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["FoXyMx", "Chrome", "1.0.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  // ✅ already connected
  if (state.creds.registered) {
    console.log("✅ Existing Session Found")
  }

  // 🔑 generate pairing code only if number given
  if (!state.creds.registered && number) {

    setTimeout(async () => {

      try {

        const code =
          await sock.requestPairingCode(number)

        latestCode = code

        console.log("PAIR CODE:", code)

      } catch (err) {

        console.log(err)

        latestCode = "Failed"

      }

    }, 3000)
  }

  sock.ev.on("connection.update", async(update) => {

    const {
      connection,
      lastDisconnect
    } = update

    if(connection === "connecting") {
      console.log("Connecting...")
    }

    if(connection === "open") {

      connected = true

      console.log("✅ Connected")

    }

    if(connection === "close") {

      connected = false

      console.log("❌ Connection Closed")

      const statusCode =
      lastDisconnect?.error?.output?.statusCode

      const shouldReconnect =
      statusCode !== DisconnectReason.loggedOut

      // ❌ logout হলে session delete
      if (
        statusCode === DisconnectReason.loggedOut
      ) {

        try {
          fs.rmSync(AUTH_FOLDER, {
            recursive: true,
            force: true
          })
        } catch {}

        console.log("🗑 Session Deleted")
      }

      // 🔄 reconnect
      if(shouldReconnect) {

        console.log("🔄 Reconnecting...")

        startBot()

      }
    }
  })
}

// 🌐 Website Pairing
app.post("/pair", async (req, res) => {

  try {

    const number = req.body.number

    if(!number) {

      return res.json({
        status: false,
        msg: "Number Required"
      })
    }

    // already connected
    if (connected) {

      return res.json({
        status: true,
        msg: "Already Connected"
      })
    }

    latestCode = "Generating..."

    await startBot(number)

    res.json({
      status: true
    })

  } catch(e) {

    res.json({
      status: false,
      error: e.toString()
    })
  }
})

// 📡 Get Pair Code
app.get("/code", (req, res) => {

  res.json({
    code: latestCode,
    connected
  })
})

// 🚀 Start Existing Session
startBot()

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {

  console.log("Server Running:", PORT)

})      status: false,
      error: e.toString()
    })
  }
})

app.get("/code", (req, res) => {

  res.json({
    code: latestCode,
    connected
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {

  console.log("Server Running:", PORT)
})
