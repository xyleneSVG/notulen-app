import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import apiApp from "./api/index.js"

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(path.join(__dirname, "public")))

app.use(apiApp)

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

export default app