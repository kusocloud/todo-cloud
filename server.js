require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 驗證 middleware
async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = data.user;
  next();
}

// 取得任務
app.get("/tasks", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", req.user.id)
    .order("id", { ascending: false });

  if (error) return res.status(500).json(error);
  res.json(data);
});

// 新增
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

// 更新
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

// 刪除
app.delete("/tasks/:id", auth, async (req, res) => {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json(error);
  res.json({ success: true });
});

app.listen(process.env.PORT || 3000);