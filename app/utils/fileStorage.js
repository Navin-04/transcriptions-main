// Utility functions for managing uploaded files with better storage management

// Use sessionStorage instead of localStorage to avoid quota issues
const STORAGE_KEY = 'uploadedFiles'

// In-memory fallback storage
let memoryStorage = new Map()

// Clean up storage to prevent quota issues
const cleanupStorage = () => {
  try {
    const allFiles = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
    if (allFiles.length > 10) { // Keep only 10 most recent files
      const recentFiles = allFiles.slice(0, 10)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recentFiles))
      console.log('Storage cleaned up: kept 10 most recent files')
    }
  } catch (error) {
    console.error('Error during storage cleanup:', error)
    // If cleanup fails, clear everything
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to clear storage:', e)
    }
  }
}

// Safe storage operations with fallbacks
const safeStorageGet = () => {
  try {
    // Try sessionStorage first
    const data = sessionStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error reading from sessionStorage:', error)
  }
  
  // Fallback to memory storage
  try {
    const data = memoryStorage.get(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error reading from memory storage:', error)
    return []
  }
}

const safeStorageSet = (data) => {
  try {
    // Try sessionStorage first
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Error writing to sessionStorage:', error)
    if (error.name === 'QuotaExceededError') {
      // Try to clean up and retry
      cleanupStorage()
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        return true
      } catch (retryError) {
        console.error('Retry failed:', retryError)
      }
    }
  }
  
  // Fallback to memory storage
  try {
    memoryStorage.set(STORAGE_KEY, JSON.stringify(data))
    console.log('Using memory storage fallback')
    return true
  } catch (fallbackError) {
    console.error('Memory storage fallback failed:', fallbackError)
    return false
  }
}

export const saveUploadedFile = async (file) => {
  // Get user from session (we'll use a default for demo)
  const userId = 'demo-user' // In production, get this from NextAuth session
  
  // Calculate audio duration
  const duration = await getAudioDuration(file)
  
  const fileData = {
    id: Date.now() + Math.random(),
    fileName: file.name,
    uploadDate: new Date().toISOString(),
    status: 'processing', // Will change to 'completed' after processing
    transcript: '', // Will be populated after transcription
    utterances: [], // Optional speaker-diarized utterances
    duration: duration, // Calculated duration
    fileSize: formatFileSize(file.size),
    userId: userId,
    // Store minimal file info only
    originalFile: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  }

  // Clean up storage before adding new file
  cleanupStorage()

  // Get existing files
  const existingFiles = safeStorageGet()
  
  // Add new file
  const updatedFiles = [fileData, ...existingFiles]
  
  // Save back to storage (only metadata, not the actual file)
  const success = safeStorageSet(updatedFiles)
  
  if (!success) {
    throw new Error('Failed to save file metadata. Storage may be full.')
  }
  
  return fileData
}

export const getUploadedFiles = () => {
  // For demo purposes, we'll use a default user ID
  // In production, get this from NextAuth session
  const userId = 'demo-user'
  
  const allFiles = safeStorageGet()
  // Filter files for current user
  return allFiles.filter(file => file.userId === userId)
}

export const updateFileStatus = (fileId, status, data = {}) => {
  const allFiles = safeStorageGet()
  
  const updatedFiles = allFiles.map(file => {
    if (file.id === fileId) {
      return {
        ...file,
        status,
        transcript: data.transcript !== undefined ? data.transcript : file.transcript,
        utterances: Array.isArray(data.utterances) ? data.utterances : (file.utterances || []),
        completedAt: status === 'completed' ? new Date().toISOString() : file.completedAt
      }
    }
    return file
  })
  
  safeStorageSet(updatedFiles)
}

export const deleteFile = (fileId) => {
  const allFiles = safeStorageGet()
  const updatedFiles = allFiles.filter(file => file.id !== fileId)
  safeStorageSet(updatedFiles)
}

export const clearAllFiles = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    memoryStorage.clear()
    console.log('All files cleared from storage')
  } catch (error) {
    console.error('Error clearing files:', error)
  }
}

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const getAudioDuration = (file) => {
  return new Promise((resolve) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration
      URL.revokeObjectURL(url)
      
      if (duration && !isNaN(duration)) {
        const minutes = Math.floor(duration / 60)
        const seconds = Math.floor(duration % 60)
        resolve(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      } else {
        resolve('00:00')
      }
    })
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      resolve('00:00')
    })
    
    audio.src = url
  })
}

export const transcribeWithOpenAI = async (fileId, file, apiEndpoint = '/api/transcribe') => {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('model', 'whisper-1')

    // Ensure we're using the correct base URL
    const baseUrl = window.location.origin
    const fullEndpoint = `${baseUrl}${apiEndpoint}`

    console.log('Making transcription request to:', fullEndpoint)

    const res = await fetch(fullEndpoint, {
      method: 'POST',
      body: form
    })

    if (!res.ok) {
      const errorData = await res.json()
      updateFileStatus(fileId, 'failed')
      console.error('Transcription error:', errorData.error)
      throw new Error(errorData.error || 'Transcription failed')
    }

    const data = await res.json()
    const text = data.text || ''
    const utterances = Array.isArray(data.utterances) ? data.utterances : []
    
    if (text.trim()) {
      updateFileStatus(fileId, 'completed', { transcript: text, utterances })
    } else {
      updateFileStatus(fileId, 'failed')
      throw new Error('No transcription text received')
    }
    
    return text
  } catch (error) {
    console.error('Transcription failed:', error)
    updateFileStatus(fileId, 'failed')
    throw error
  }
}
