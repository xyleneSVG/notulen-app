const rawInput = document.getElementById("rawInput")
const parseBtn = document.getElementById("parseBtn")
const sampleBtn = document.getElementById("sampleBtn")
const clearBtn = document.getElementById("clearBtn")
const generateBtn = document.getElementById("generateBtn")

const emptyState = document.getElementById("emptyState")
const preview = document.getElementById("preview")
const docResult = document.getElementById("docResult")
const toast = document.getElementById("toast")

const previewJudul = document.getElementById("previewJudul")
const previewAgenda = document.getElementById("previewAgenda")
const editTanggal = document.getElementById("editTanggal")
const editWaktu = document.getElementById("editWaktu")
const editTempat = document.getElementById("editTempat")
const absensiBody = document.getElementById("absensiBody")
const pembahasanList = document.getElementById("pembahasanList")
const agendaList = document.getElementById("agendaList")
const jsonOutput = document.getElementById("jsonOutput")

const manualAbsensiBody = document.getElementById("manualAbsensiBody")
const setAllPresentBtn = document.getElementById("setAllPresentBtn")

let currentNotulen = null

const defaultMembers = [
  "Artanti Najwa Salsabila",
  "Reivantoro",
  "Muhamad Risqi Febriano",
  "Dicce Queen Malika",
  "Mutiara Eka Krisnawati",
  "Emilia Rahmawati",
  "Helmi Fauzi Ahmad",
  "Almira Eka Sutrisno",
  "Widia Lailatul Annisa",
  "Azzahratunnisa Erdiansyah",
  "Dhavin Fasya Alviyanto",
  "Muhammad Alif Erdiansyah",
  "Dimas Seno Putra Budiyono",
  "Dewanta Artari Putra",
  "Anneke Fidelina Sigarlaki",
]

let manualAbsensi = defaultMembers.map((nama, index) => ({
  no: index + 1,
  nama,
  status: "Hadir",
}))

const sampleText = `Agenda rapat pembahasan seminar, malam keakraban, dan persiapan program kerja.
Hari Jumat, 8 Mei 2026. Waktu 19.00 - 21.00. Tempat Balai RW 01.

Absensi:
Artanti Najwa Salsabila hadir
Reivantoro hadir
Muhamad Risqi Febriano hadir
Dicce Queen Malika tidak hadir
Mutiara Eka Krisnawati hadir
Emilia Rahmawati hadir
Helmi Fauzi Ahmad tidak hadir
Almira Eka Sutrisno hadir
Widia Lailatul Annisa hadir
Azzahratunnisa Erdiansyah hadir
Dhavin Fasya Alviyanto hadir

Pembahasan:
Bulan Juni ada dua seminar sebelum Mba Widia nikah.
Seminar pertama tanggal 6 Juni 2026 tentang public speaking dan penyuluhan bersama Karang Taruna RW 01 di Kelurahan.
Tanggal 14 Juni 2026 ada pernikahan Mba Widia.
Akhir Juni ada seminar mahasiswa Udinus tanggal 27 Juni 2026.
Awal Juli ada malam keakraban tanggal 4 sampai 5 Juli 2026, masih menyesuaikan.
Agustus mulai menyiapkan program kerja.`

function showToast(message) {
  toast.textContent = message
  toast.classList.remove("hidden")

  setTimeout(() => {
    toast.classList.add("hidden")
  }, 3200)
}

function setLoading(button, isLoading, loadingText, normalText) {
  button.disabled = isLoading

  if (isLoading) {
    button.dataset.oldText = button.textContent
    button.textContent = loadingText
  } else {
    button.textContent = normalText || button.dataset.oldText
  }
}

function normalizeStatus(status) {
  const clean = String(status || "").toLowerCase()

  if (clean.includes("tidak")) return "Tidak Hadir"

  return "Hadir"
}

function getMark(status, target) {
  return normalizeStatus(status) === target ? "X" : ""
}

function validateNotulen(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Data notulen tidak valid.")
  }

  const requiredArrayFields = ["absensi", "pembahasan", "agenda_selanjutnya"]

  for (const field of requiredArrayFields) {
    if (!Array.isArray(data[field])) {
      throw new Error(`Field ${field} harus berupa array.`)
    }
  }

  return {
    judul: data.judul || "NOTULEN RAPAT KARANG TARUNA KELURAHAN PEKUNDEN",
    agenda: data.agenda || "",
    hari_tanggal: data.hari_tanggal || "",
    waktu: data.waktu || "",
    tempat: data.tempat || "",
    absensi: data.absensi.map((item, index) => ({
      no: Number(item.no || index + 1),
      nama: item.nama || "",
      status: normalizeStatus(item.status),
    })),
    pembahasan: data.pembahasan.map((item) => ({
      judul: item.judul || "",
      deskripsi: item.deskripsi || "",
      poin: Array.isArray(item.poin) ? item.poin : [],
    })),
    agenda_selanjutnya: data.agenda_selanjutnya.map(String),
  }
}

function renderPreview(data) {
  currentNotulen = validateNotulen(data)

  emptyState.classList.add("hidden")
  preview.classList.remove("hidden")
  docResult.classList.add("hidden")
  generateBtn.disabled = false

  previewJudul.textContent = currentNotulen.judul
  previewAgenda.textContent = `Agenda : ${currentNotulen.agenda}`
  editTanggal.value = currentNotulen.hari_tanggal || ""
  editWaktu.value = currentNotulen.waktu || ""
  editTempat.value = currentNotulen.tempat || ""

  attachMetaEvents()

  absensiBody.innerHTML = currentNotulen.absensi
    .map((item, index) => {
      const status = normalizeStatus(item.status)

      return `
        <tr>
          <td>${item.no}</td>
          <td>
            <input
              class="name-input"
              type="text"
              value="${escapeHtml(item.nama)}"
              data-index="${index}"
              data-field="nama"
            />
          </td>

          <td>
            <input
              type="radio"
              name="absensi-${index}"
              value="Hadir"
              data-index="${index}"
              ${status === "Hadir" ? "checked" : ""}
            />
          </td>

          <td>
            <input
              type="radio"
              name="absensi-${index}"
              value="Tidak Hadir"
              data-index="${index}"
              ${status === "Tidak Hadir" ? "checked" : ""}
            />
          </td>
        </tr>
      `
    })
    .join("")

  attachAbsensiEvents()

  pembahasanList.innerHTML = currentNotulen.pembahasan
    .map((item, index) => {
      const points = item.poin
        .map((point) => `<li>${escapeHtml(point)}</li>`)
        .join("")

      return `
        <article class="discussion-card">
          <h5>${index + 1}. ${escapeHtml(item.judul)}</h5>
          <p>${escapeHtml(item.deskripsi)}</p>
          ${points ? `<ul>${points}</ul>` : ""}
        </article>
      `
    })
    .join("")

  agendaList.textContent = currentNotulen.agenda_selanjutnya.length
    ? currentNotulen.agenda_selanjutnya.join(" ")
    : "-"

  jsonOutput.textContent = JSON.stringify(currentNotulen, null, 2)
}

function attachAbsensiEvents() {
  const statusInputs = absensiBody.querySelectorAll('input[type="radio"]')
  const nameInputs = absensiBody.querySelectorAll(".name-input")

  statusInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      const index = Number(event.target.dataset.index)
      const status = event.target.value

      if (!currentNotulen.absensi[index]) return

      currentNotulen.absensi[index].status = status
      jsonOutput.textContent = JSON.stringify(currentNotulen, null, 2)
    })
  })

  nameInputs.forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.index)
      const nama = event.target.value

      if (!currentNotulen.absensi[index]) return

      currentNotulen.absensi[index].nama = nama
      jsonOutput.textContent = JSON.stringify(currentNotulen, null, 2)
    })
  })
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function cleanFileName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function createPdfFileName(notulen) {
  const agenda = cleanFileName(notulen.agenda || "agenda rapat")
  const tanggal = cleanFileName(notulen.hari_tanggal || "tanggal")

  return `notulen rapat-${agenda}-${tanggal}.pdf`
}

async function parseWithAI() {
  const text = rawInput.value.trim()

  if (!text) {
    showToast("Input masih kosong. AI belum bisa membaca pikiran, untungnya.")
    return
  }

  setLoading(parseBtn, true, "Memproses...", "Parse dengan AI")

  try {
    const response = await fetch("/api/parse-notulen", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        absensi: manualAbsensi,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || "Gagal parsing notulen.")
    }

    renderPreview(result.data)
    showToast("Notulen berhasil diparse.")
  } catch (error) {
    showToast(error.message)
  } finally {
    setLoading(parseBtn, false, "Memproses...", "Parse dengan AI")
  }
}

async function generateGoogleDocs() {
  if (!currentNotulen) {
    showToast("Belum ada data notulen.")
    return
  }

  setLoading(generateBtn, true, "Membuat PDF...", "Download PDF")

  try {
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(currentNotulen),
    })

    if (!response.ok) {
      let message = "Gagal membuat PDF."

      try {
        const errorResult = await response.clone().json()
        message = errorResult.message || message
      } catch (_) {
        try {
          const errorText = await response.clone().text()
          message = errorText || message
        } catch (_) {
          message = "Gagal membaca pesan error dari server."
        }
      }

      throw new Error(message)
    }

    const contentType = response.headers.get("Content-Type") || ""

    if (!contentType.includes("application/pdf")) {
      let message = "Response dari server bukan PDF."

      try {
        const errorResult = await response.clone().json()
        message = errorResult.message || message
      } catch (_) {
        try {
          const text = await response.clone().text()
          message = text || message
        } catch (_) {}
      }

      throw new Error(message)
    }

    const blob = await response.blob()

    if (!blob || blob.size === 0) {
      throw new Error("PDF kosong atau gagal dibuat.")
    }

    const url = window.URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = createPdfFileName(currentNotulen)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    window.URL.revokeObjectURL(url)

    if (docResult) {
      docResult.classList.add("hidden")
      docResult.innerHTML = ""
    }

    showToast("PDF berhasil dibuat dan diunduh.")
  } catch (error) {
    showToast(error.message)
  } finally {
    setLoading(generateBtn, false, "Membuat PDF...", "Download PDF")
  }
}

sampleBtn.addEventListener("click", () => {
  rawInput.value = sampleText
  showToast("Contoh catatan dimasukkan.")
})

clearBtn.addEventListener("click", () => {
  rawInput.value = ""
  currentNotulen = null
  preview.classList.add("hidden")
  emptyState.classList.remove("hidden")
  docResult.classList.add("hidden")
  generateBtn.disabled = true
  showToast("Form direset.")
})

parseBtn.addEventListener("click", parseWithAI)
generateBtn.addEventListener("click", generateGoogleDocs)

function renderManualAbsensiTable() {
  manualAbsensiBody.innerHTML = manualAbsensi
    .map((item, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <input
              class="member-name-input"
              type="text"
              value="${escapeHtml(item.nama)}"
              data-index="${index}"
            />
          </td>
          <td>
            <input
              type="radio"
              name="manual-absensi-${index}"
              value="Hadir"
              data-index="${index}"
              ${item.status === "Hadir" ? "checked" : ""}
            />
          </td>
          <td>
            <input
              type="radio"
              name="manual-absensi-${index}"
              value="Tidak Hadir"
              data-index="${index}"
              ${item.status === "Tidak Hadir" ? "checked" : ""}
            />
          </td>
        </tr>
      `
    })
    .join("")

  attachManualAbsensiEvents()
}

function attachManualAbsensiEvents() {
  const nameInputs = manualAbsensiBody.querySelectorAll(".member-name-input")
  const statusInputs = manualAbsensiBody.querySelectorAll('input[type="radio"]')

  nameInputs.forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.index)

      if (!manualAbsensi[index]) return

      manualAbsensi[index].nama = event.target.value
    })
  })

  statusInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      const index = Number(event.target.dataset.index)

      if (!manualAbsensi[index]) return

      manualAbsensi[index].status = event.target.value
    })
  })
}

setAllPresentBtn.addEventListener("click", () => {
  manualAbsensi = manualAbsensi.map((item) => ({
    ...item,
    status: "Hadir",
  }))

  renderManualAbsensiTable()
  showToast("Semua anggota ditandai hadir.")
})

renderManualAbsensiTable()

function attachMetaEvents() {
  editTanggal.oninput = () => {
    if (!currentNotulen) return

    currentNotulen.hari_tanggal = editTanggal.value
    jsonOutput.textContent = JSON.stringify(currentNotulen, null, 2)
  }

  editWaktu.oninput = () => {
    if (!currentNotulen) return

    currentNotulen.waktu = editWaktu.value
    jsonOutput.textContent = JSON.stringify(currentNotulen, null, 2)
  }

  editTempat.oninput = () => {
    if (!currentNotulen) return

    currentNotulen.tempat = editTempat.value
    jsonOutput.textContent = JSON.stringify(currentNotulen, null, 2)
  }
}