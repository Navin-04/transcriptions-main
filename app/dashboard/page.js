'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUploadedFiles, deleteFile, clearAllFiles } from '../utils/fileStorage'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showStorageWarning, setShowStorageWarning] = useState(false)

  // Redirect unauthenticated users via effect to keep hooks order stable
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Load data only when session is available
  useEffect(() => {
    if (session) {
      loadFiles()
      checkStorageQuota()
    }
  }, [session])

  const loadFiles = () => {
    const userFiles = getUploadedFiles()
    setFiles(userFiles)
    setIsLoading(false)
  }

  const checkStorageQuota = () => {
    try {
      // Check if sessionStorage is getting full
      const testKey = 'storage_test'
      const testData = 'x'.repeat(100000) // 100KB test (smaller than before)
      sessionStorage.setItem(testKey, testData)
      sessionStorage.removeItem(testKey)
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        setShowStorageWarning(true)
      }
    }
  }

  const handleDelete = (fileId) => {
    if (confirm('Are you sure you want to delete this file?')) {
      deleteFile(fileId)
      loadFiles()
      if (selectedFile?.id === fileId) {
        setSelectedFile(null)
      }
    }
  }

  const handleClearAllFiles = () => {
    if (confirm('Are you sure you want to delete all files? This action cannot be undone.')) {
      clearAllFiles()
      setFiles([])
      setSelectedFile(null)
      setShowStorageWarning(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const downloadTranscript = (file) => {
    const element = document.createElement('a')
    const fileContent = `Transcription of ${file.fileName}\n\n${file.transcript}`
    const blob = new Blob([fileContent], { type: 'text/plain' })
    element.href = URL.createObjectURL(blob)
    element.download = `${file.fileName.replace(/\.[^/.]+$/, '')}_transcript.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (status === 'loading' || !session || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Your Transcriptions
            </h1>
            <p className="text-lg text-gray-600">
              Manage and view your audio transcriptions
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/upload"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Upload New File
            </Link>
            {files.length > 0 && (
              <button
                onClick={handleClearAllFiles}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Storage Warning */}
        {showStorageWarning && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>Storage space is running low. Consider clearing old files.</span>
              </div>
              <button
                onClick={() => setShowStorageWarning(false)}
                className="text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Files</p>
                <p className="text-2xl font-bold text-gray-900">{files.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {files.filter(f => f.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-gray-900">
                  {files.filter(f => f.status === 'processing').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {files.filter(f => f.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Files</h2>
              
              {files.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 mb-4">No files uploaded yet</p>
                  <Link
                    href="/upload"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Upload Your First File
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedFile?.id === file.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {file.fileName}
                          </h3>
                          <div className="flex items-center mt-1 space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(file.status)}`}>
                              {file.status}
                            </span>
                            <span className="text-xs text-gray-500">{file.fileSize}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(file.uploadDate)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(file.id)
                          }}
                          className="ml-2 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transcription Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              {selectedFile ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{selectedFile.fileName}</h2>
                      <div className="flex items-center mt-2 space-x-4">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedFile.status)}`}>
                          {selectedFile.status}
                        </span>
                        <span className="text-sm text-gray-500">{selectedFile.fileSize}</span>
                        <span className="text-sm text-gray-500">{selectedFile.duration}</span>
                      </div>
                    </div>
                    {selectedFile.status === 'completed' && (
                      <button
                        onClick={() => downloadTranscript(selectedFile)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Download Transcript
                      </button>
                    )}
                  </div>

                  {selectedFile.status === 'processing' && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Processing transcription...</p>
                    </div>
                  )}

                  {selectedFile.status === 'failed' && (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-red-600">Transcription failed. Please try uploading the file again.</p>
                    </div>
                  )}

                  {selectedFile.status === 'completed' && (
                    <div className="space-y-6">
                      {selectedFile.utterances && selectedFile.utterances.length > 0 ? (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Speaker Diarization</h3>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto divide-y divide-gray-200">
                            {selectedFile.utterances.map((u, idx) => (
                              <div key={idx} className="py-2">
                                <div className="text-sm text-gray-500 mb-1">
                                  <span className="font-medium text-gray-700">Speaker {u.speaker || u.speaker_label || 'A'}</span>
                                  <span className="ml-2">[{Math.round((u.start || 0)/1000)}s - {Math.round((u.end || 0)/1000)}s]</span>
                                </div>
                                <p className="text-gray-800 whitespace-pre-wrap">{u.text || ''}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {selectedFile.transcript && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Transcription</h3>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <p className="text-gray-800 whitespace-pre-wrap">{selectedFile.transcript}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Select a file to view its transcription</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}