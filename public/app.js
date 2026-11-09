import { PLANTED_BUG } from './bugs.js'

// The one test account. This app has no server, so the browser checks it.
const ACCOUNT = { email: 'member@testbed.test', password: 'TestbedMember123!' }
const SESSION_KEY = 'testbed.session'

const signInView = document.querySelector('#sign-in')
const signInForm = document.querySelector('#sign-in-form')
const signInError = document.querySelector('#sign-in-error')
const emailInput = document.querySelector('#email')
const passwordInput = document.querySelector('#password')
const tasksView = document.querySelector('#tasks')
const signedInAs = document.querySelector('#signed-in-as')
const addTaskForm = document.querySelector('#add-task-form')
const titleInput = document.querySelector('#new-task')
const filterButtons = document.querySelectorAll('[data-filter]')
const taskCount = document.querySelector('#task-count')
const taskList = document.querySelector('#task-list')
const emptyTasks = document.querySelector('#empty-tasks')
const deleteDialog = document.querySelector('#delete-dialog')
const deleteTitle = document.querySelector('#delete-title')

const EMPTY_MESSAGES = {
  all: 'No tasks yet. Add one above.',
  open: 'Nothing is open.',
  done: 'Nothing is done yet.',
}

let account = localStorage.getItem(SESSION_KEY)
let tasks = account ? readTasks(account) : []
let filter = 'all'
let pendingDelete = null

function tasksKey(email) {
  return `testbed.tasks.${email}`
}

function readTasks(email) {
  try {
    const stored = JSON.parse(localStorage.getItem(tasksKey(email)) ?? '[]')
    return Array.isArray(stored) ? stored : []
  }
  catch {
    return []
  }
}

function saveTasks() {
  const stored = PLANTED_BUG === 'done-does-not-stick' ? tasks.map(task => ({ ...task, done: false })) : tasks
  localStorage.setItem(tasksKey(account), JSON.stringify(stored))
}

function credentialsMatch(email, password) {
  if (PLANTED_BUG === 'sign-in-always-fails') return false
  return email === ACCOUNT.email && password === ACCOUNT.password
}

function savedTitle(title) {
  return PLANTED_BUG === 'title-drops-last-letter' ? title.slice(0, -1) : title
}

function taskItem(task) {
  const item = document.createElement('li')
  item.dataset.testid = 'task-item'
  item.classList.toggle('done', task.done)

  const label = document.createElement('label')
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.checked = task.done
  checkbox.dataset.testid = 'task-done'
  checkbox.addEventListener('change', () => {
    task.done = checkbox.checked
    saveTasks()
    render()
  })
  const title = document.createElement('span')
  title.textContent = task.title
  title.dataset.testid = 'task-title'
  label.append(checkbox, title)

  const remove = document.createElement('button')
  remove.type = 'button'
  remove.textContent = 'Delete'
  remove.setAttribute('aria-label', `Delete ${task.title}`)
  remove.dataset.testid = 'task-delete'
  remove.addEventListener('click', () => {
    pendingDelete = task
    deleteTitle.textContent = task.title
    deleteDialog.returnValue = ''
    deleteDialog.showModal()
  })

  item.append(label, remove)
  return item
}

function render() {
  signInView.hidden = Boolean(account)
  tasksView.hidden = !account
  if (!account) return

  signedInAs.textContent = account
  const shown = tasks.filter(task => filter === 'all' || (filter === 'done') === task.done)
  taskList.replaceChildren(...shown.map(taskItem))
  emptyTasks.hidden = shown.length > 0
  emptyTasks.textContent = EMPTY_MESSAGES[filter]

  const done = tasks.filter(task => task.done).length
  taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}, ${done} done`
  for (const button of filterButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === filter))
  }
}

signInForm.addEventListener('submit', (event) => {
  event.preventDefault()
  const email = emailInput.value.trim().toLowerCase()
  if (!credentialsMatch(email, passwordInput.value)) {
    signInError.hidden = false
    passwordInput.value = ''
    passwordInput.focus()
    return
  }
  account = email
  localStorage.setItem(SESSION_KEY, account)
  tasks = readTasks(account)
  filter = 'all'
  signInForm.reset()
  signInError.hidden = true
  render()
  titleInput.focus()
})

document.querySelector('#sign-out').addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY)
  account = null
  tasks = []
  render()
  emailInput.focus()
})

addTaskForm.addEventListener('submit', (event) => {
  event.preventDefault()
  const title = titleInput.value.trim()
  if (!title) return
  tasks.push({ id: crypto.randomUUID(), title: savedTitle(title), done: false })
  saveTasks()
  addTaskForm.reset()
  render()
  titleInput.focus()
})

for (const button of filterButtons) {
  button.addEventListener('click', () => {
    filter = button.dataset.filter
    render()
  })
}

deleteDialog.addEventListener('close', () => {
  if (deleteDialog.returnValue === 'delete' && pendingDelete) {
    tasks = tasks.filter(task => task.id !== pendingDelete.id)
    saveTasks()
    render()
    titleInput.focus()
  }
  pendingDelete = null
})

render()
