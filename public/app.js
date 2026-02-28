document.addEventListener("DOMContentLoaded", function () {

  fetch("/me", { credentials: "include" })
    .then(res => {
      if (!res.ok) window.location.href = "/login.html"
    })

  const taskInput = document.getElementById("taskInput")
  const prioritySelect = document.getElementById("priority")
  const dueDateInput = document.getElementById("dueDate")

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await fetch("/logout", { method: "POST", credentials: "include" })
    window.location.href = "/login.html"
  })

  document.getElementById("addBtn").addEventListener("click", addTask)

  taskInput.addEventListener("keypress", e => {
    if (e.key === "Enter") addTask()
  })

  async function addTask() {
    const content = taskInput.value.trim()
    const priority = prioritySelect.value
    const due_date = dueDateInput.value

    if (!content) return alert("任務內容必填")

    await fetch("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content, priority, due_date })
    })

    taskInput.value = ""
    loadTasks()
  }

  async function loadTasks() {
    const res = await fetch("/tasks", { credentials: "include" })
    const tasks = await res.json()

    document.getElementById("todo").innerHTML = ""
    document.getElementById("doing").innerHTML = ""
    document.getElementById("done").innerHTML = ""

    tasks.forEach(task => {
      renderTask(task)
    })
  }

  function renderTask(task) {
    const div = document.createElement("div")
    div.className = "task-card"
    div.draggable = task.status !== "Done"

    // 優先順序顏色條
    let priorityColor = {
      High: "red",
      Medium: "orange",
      Low: "green"
    }[task.priority] || "gray"

    div.style.borderLeft = `6px solid ${priorityColor}`

    // 逾期判斷
    let overdueText = "正常"
    let isOverdue = false

    if (task.due_date && task.status !== "Done") {
      const due = new Date(task.due_date)
      const now = new Date()
      if (due < now) {
        overdueText = "🔴 已逾期"
        isOverdue = true
      }
    }

    // Done 樣式
    if (task.status === "Done") {
      div.style.opacity = "0.5"
      div.style.textDecoration = "line-through"
    }

    div.innerHTML = `
      <strong>${task.content}</strong><br>
      狀態: ${task.status}<br>
      逾期: ${overdueText}<br>
      到期日: ${task.due_date || "未設定"}<br>
      完成時間: ${task.complete_time || "未完成"}
      <br><br>
      <button onclick="updateStatus(${task.id}, 'Todo')">待辦中</button>
      <button onclick="updateStatus(${task.id}, 'Doing')">進行中</button>
      <button onclick="updateStatus(${task.id}, 'Done')">已完成</button>
      <button onclick="deleteTask(${task.id})">刪除</button>
    `

    if (isOverdue) {
      div.style.background = "#eee"
    }

    div.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", task.id)
    })

    document.getElementById(task.status.toLowerCase()).appendChild(div)
  }

  window.updateStatus = async function (id, status) {
    await fetch(`/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status })
    })
    loadTasks()
  }

  window.deleteTask = async function (id) {
    await fetch(`/tasks/${id}`, {
      method: "DELETE",
      credentials: "include"
    })
    loadTasks()
  }

  document.querySelectorAll(".column").forEach(col => {
    col.addEventListener("dragover", e => e.preventDefault())

    col.addEventListener("drop", async e => {
      const id = e.dataTransfer.getData("text/plain")
      const status = col.dataset.status

      await fetch(`/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status })
      })

      loadTasks()
    })
  })

  loadTasks()
})