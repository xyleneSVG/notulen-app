import "dotenv/config"
import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { GoogleGenAI, Type } from "@google/genai"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 3000

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY belum diset di .env")
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

app.use(cors())
app.use(express.json({ limit: "2mb" }))
app.use(express.static(path.join(__dirname, "src")))

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "index.html"))
})

const notulenSchema = {
  type: Type.OBJECT,
  required: [
    "judul",
    "agenda",
    "hari_tanggal",
    "waktu",
    "tempat",
    "absensi",
    "pembahasan",
    "agenda_selanjutnya",
  ],
  properties: {
    judul: {
      type: Type.STRING,
      description: "Judul utama notulen.",
    },
    agenda: {
      type: Type.STRING,
      description: "Agenda rapat.",
    },
    hari_tanggal: {
      type: Type.STRING,
      description: "Hari dan tanggal rapat.",
    },
    waktu: {
      type: Type.STRING,
      description: "Waktu rapat.",
    },
    tempat: {
      type: Type.STRING,
      description: "Tempat rapat.",
    },
    absensi: {
      type: Type.ARRAY,
      description: "Daftar absensi peserta rapat.",
      items: {
        type: Type.OBJECT,
        required: ["no", "nama", "status"],
        properties: {
          no: {
            type: Type.INTEGER,
          },
          nama: {
            type: Type.STRING,
          },
          status: {
            type: Type.STRING,
            enum: ["Hadir", "Tidak Hadir"],
          },
        },
      },
    },
    pembahasan: {
      type: Type.ARRAY,
      description: "Daftar poin pembahasan rapat.",
      items: {
        type: Type.OBJECT,
        required: ["judul", "deskripsi", "poin"],
        properties: {
          judul: {
            type: Type.STRING,
          },
          deskripsi: {
            type: Type.STRING,
          },
          poin: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        },
      },
    },
    agenda_selanjutnya: {
      type: Type.ARRAY,
      description: "Daftar agenda atau tindak lanjut setelah rapat.",
      items: {
        type: Type.STRING,
      },
    },
  },
}

function normalizeNotulen(data) {
  return {
    judul: data.judul || "NOTULEN RAPAT KARANG TARUNA KELURAHAN PEKUNDEN",
    agenda: data.agenda || "",
    hari_tanggal: data.hari_tanggal || "",
    waktu: data.waktu || "",
    tempat: data.tempat || "",
    absensi: Array.isArray(data.absensi)
      ? data.absensi.map((item, index) => ({
          no: Number(item.no || index + 1),
          nama: item.nama || "",
          status: item.status || "Hadir",
        }))
      : [],
    pembahasan: Array.isArray(data.pembahasan)
      ? data.pembahasan.map((item) => ({
          judul: item.judul || "",
          deskripsi: item.deskripsi || "",
          poin: Array.isArray(item.poin) ? item.poin : [],
        }))
      : [],
    agenda_selanjutnya: Array.isArray(data.agenda_selanjutnya)
      ? data.agenda_selanjutnya.map(String)
      : [],
  }
}

app.post("/api/parse-notulen", async (req, res) => {
  try {
    const { text, absensi } = req.body

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        message: "Field text wajib diisi.",
      })
    }

    const manualAbsensi = Array.isArray(absensi)
    ? absensi.map((item, index) => ({
        no: Number(item.no || index + 1),
        nama: String(item.nama || ""),
        status:
          item.status === "Tidak Hadir"
            ? "Tidak Hadir"
            : "Hadir",
      }))
    : []

    const prompt = `
Kamu adalah parser notulen rapat organisasi.

Ubah catatan mentah user menjadi JSON notulen yang formal, rapi, dan siap masuk template dokumen.

Aturan:
- Jangan menambahkan fakta yang tidak ada di input.
- Pada "Agenda selanjutnya" isinya jangan point point namun dirangkum dan dijadikan narasi paragraft.
- Kalau tanggal, waktu, tempat tidak ada, isi string kosong.
- Agenda diisi berdasarkan kesimpulan yang dibahas pada notulen namun detail dan jelas.
- Judul default jika tidak disebutkan: NOTULEN RAPAT KARANG TARUNA KELURAHAN PEKUNDEN.
- Bagian pembahasan harus dibuat seperti subjudul, deskripsi, dan poin-poin.
- Agenda selanjutnya harus berupa daftar tindak lanjut.
- Gunakan bahasa Indonesia formal.
- Status absensi hanya boleh: Hadir atau Tidak Hadir.
- Gunakan data absensi manual dari aplikasi sebagai sumber utama absensi.
- Jangan mengubah nama atau status absensi manual.
- Bahasa jangan kaku seperti AI naamun tetap formal

Data absensi manual:
${JSON.stringify(manualAbsensi, null, 2)}

Catatan mentah:
${text}
`.trim()

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: notulenSchema,
      },
    })

    const rawText = response.text
    const parsed = JSON.parse(rawText)
    const normalized = normalizeNotulen(parsed)

    if (manualAbsensi.length > 0) {
      normalized.absensi = manualAbsensi
    }

    return res.json({
      data: normalized,
    })
  } catch (error) {
    console.error(error)

    const message = String(error.message || "")

    if (message.includes("API key")) {
      return res.status(401).json({
        message: "Gemini API key salah atau belum aktif. Cek GEMINI_API_KEY di file .env.",
        detail: error.message,
      })
    }

    if (message.includes("quota") || message.includes("429")) {
      return res.status(429).json({
        message: "Kuota Gemini API terkena limit. Cek Google AI Studio atau billing project kamu.",
        detail: error.message,
      })
    }

    return res.status(500).json({
      message: "Gagal parsing notulen dengan Gemini.",
      detail: error.message,
    })
  }
})

app.post("/api/generate-pdf", async (req, res) => {
  try {
    const gdocxUrl = process.env.GDOCX_WEB_APP_URL

    if (!gdocxUrl) {
      return res.status(500).json({
        message: "GDOCX_WEB_APP_URL belum diset di .env.",
      })
    }

    const response = await fetch(gdocxUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(req.body),
    })

    const result = await response.json()
    if (!result.success) {
    return res.status(500).json({
      message: result.message || "Gagal generate PDF dari Apps Script.",
      detail: result.stack || null,
    })
  }

  if (!result.pdfBase64) {
    return res.status(500).json({
      message: "PDF berhasil dibuat, tapi pdfBase64 tidak dikirim dari Apps Script.",
    })
  }

  const pdfBuffer = Buffer.from(result.pdfBase64, "base64")
  const fileName = result.pdfName || "notulen-rapat.pdf"

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${fileName.replaceAll('"', '')}"`
  )

  return res.send(pdfBuffer)
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Gagal menghubungi microapp GDOCX.",
      detail: error.message,
    })
  }
})

app.listen(port, () => {
  console.log(`Notulen app jalan di http://localhost:${port}`)
})