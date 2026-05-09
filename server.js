const express = require("express")
const path = require("path")
const pino = require("pino")

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
let sock

async function startBot(number) {

  const { state, saveCreds } =
    await useMultiFileAuthState("./session")

  const { version } =
    await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"]
  })

  sock.ev.on("creds.update", saveCreds)

  if (!state.creds.registered) {

    setTimeout(async () => {

      try {

        const code =
          await sock.requestPairingCode(number)

        latestCode = code

        console.log("PAIR CODE:", code)

      } catch (err) {

        console.log(err)
      }

    }, 3000)
  }

  sock.ev.on("connection.update", async(update) => {

    const { connection, lastDisconnect } = update

    if(connection === "open") {

      connected = true
      console.log("✅ Connected")
    }

    if(connection === "close") {

      connected = false
      console.log("❌ Connection Closed")

      const shouldReconnect =
      lastDisconnect?.error?.output?.statusCode
      !== DisconnectReason.loggedOut

      if(shouldReconnect) {
        startBot(number)
      }
    }
  })
}

app.post("/pair", async (req, res) => {

  try {

    const number = req.body.number

    if(!number) {
      return res.json({
        status: false,
        msg: "Number Required"
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
