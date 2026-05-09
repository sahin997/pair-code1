async function loadCode() {

  const res = await fetch("/code")

  const data = await res.json()

  document.getElementById("code").innerText = data.code

  const status = document.getElementById("status")

  if(data.connected) {

    status.innerText = "Connected"
    status.className = "status online"

  } else {

    status.innerText = "Waiting For Login"
    status.className = "status offline"
  }
}

setInterval(loadCode, 3000)

loadCode()

function copyCode() {

  const code =
  document.getElementById("code").innerText

  navigator.clipboard.writeText(code)

  alert("Code Copied")
}
