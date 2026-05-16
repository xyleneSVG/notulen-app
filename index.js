import express from "express"
import apiApp from "./api/index.js"

const app = express()

app.use(apiApp)

export default app