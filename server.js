require("dotenv").config()
const express = require("express")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const { createClient } = require("@supabase/supabase-js")

console.log("SUPABASE_URL:", process.env.SUPABASE_URL)
console.log("SERVICE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY)

const app = express()
app.use(express.json())
app.use(cookieParser())

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})

const SECRET = "todo_v4_secret"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ===== Supabase 驗證 =====
async function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "未提供 token" });
  }

  const token = authHeader.replace("Bearer ", "");

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "無效 token" });
  }

  req.user = data.user; // 把 user 掛上去
  next();
}


// ===== 登入 =====
app.post("/login", (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: "請輸入帳密" })

  const token = jwt.sign({ email }, SECRET, { expiresIn: "2h" })

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax"
  })

  res.json({ message: "登入成功" })
})

app.get("/me", (req, res) => {
  const token = req.cookies.token
  if (!token) return res.status(401).json({})

  try {
    const decoded = jwt.verify(token, SECRET)
    res.json(decoded)
  } catch {
    res.status(401).json({})
  }
})

app.post("/logout", (req, res) => {
  res.clearCookie("token")
  res.json({})
})


// ===== 取得任務 =====
app.get("/tasks", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return res.status(500).json(error)
  res.json(data)
})

// ===== 建立任務 =====
app.post("/tasks", auth, async (req, res) => {
  const { content, priority, due_date } = req.body

  if (!content) return res.status(400).json({ error: "內容必填" })

  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        content,
        priority,
        due_date,
        status: "Todo",
        progress: 0
      }
    ])
    .select()

  if (error) return res.status(500).json(error)
  res.json(data[0])
})

// ===== 更新狀態 =====
app.patch("/tasks/:id", auth, async (req, res) => {
  const updates = req.body

  if (updates.status === "Done") {
    updates.complete_time = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", req.params.id)
    .select()

  if (error) return res.status(500).json(error)
  res.json(data[0])
})

// ===== 刪除 =====
app.delete("/tasks/:id", auth, async (req, res) => {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", req.params.id)

  if (error) return res.status(500).json(error)
  res.json({})
})

const PORT = process.env.PORT || 3000

app.use(express.static("public"))


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})