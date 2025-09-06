import fs from 'fs'
import path from 'path'

const usersFilePath = path.join(process.cwd(), 'data', 'users.json')

function ensureUsersFileExists() {
  if (!fs.existsSync(usersFilePath)) {
    const dir = path.dirname(usersFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(usersFilePath, JSON.stringify({ users: [] }, null, 2), 'utf-8')
  }
}

export function readUsers() {
  ensureUsersFileExists()
  try {
    const raw = fs.readFileSync(usersFilePath, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.users) ? parsed.users : []
  } catch (error) {
    console.error('Failed to read users.json:', error)
    return []
  }
}

export function writeUsers(users) {
  ensureUsersFileExists()
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify({ users }, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Failed to write users.json:', error)
    return false
  }
}

export function findUserByEmail(email) {
  const users = readUsers()
  const lower = String(email || '').toLowerCase()
  return users.find(u => String(u.email || '').toLowerCase() === lower)
}

export function addUser({ id, name, email, passwordHash }) {
  const users = readUsers()
  const exists = users.some(u => String(u.email || '').toLowerCase() === String(email || '').toLowerCase())
  if (exists) {
    throw new Error('Email already registered')
  }
  const user = { id, name, email, password: passwordHash }
  users.push(user)
  writeUsers(users)
  return user
}


