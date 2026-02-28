require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===== Supabase 驗證 Middleware =====
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

  req.user = data.user;
  next();
}

// ===== 取得任務 =====
app.get("/tasks", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", req.user.id)
    .order("id", { ascending: false });

  if (error) return res.status(500).json(error);
  res.json(data);
});

// ===== 新增任務 =====
app.post("/tasks", auth, async (req, res) => {
  const { content, priority, status, due_date } = req.body;

  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        content,
        priority,
        status,
        due_date,
        user_id: req.user.id
      }
    ])
    .select();

  if (error) return res.status(500).json(error);
  res.json(data[0]);
});

// ===== 更新任務 =====
app.patch("/tasks/:id", auth, async (req, res) => {
  const { status } = req.body;

  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select();

  if (error) return res.status(500).json(error);
  res.json(data[0]);
});

// ===== 刪除任務 =====
app.delete("/tasks/:id", auth, async (req, res) => {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json(error);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});