'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { saveUploadedFile, transcribeWithOpenAI } from '../utils/fileStorage'
import TranscriptionServiceSelector from '../components/TranscriptionServiceSelector'

export default function UploadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedService, setSelectedService] = useState('whisper')
  const [showAlternative, setShowAlternative] = useState(false)
  const [lastUploadedFile, setLastUploadedFile] = useState(null)

  // Handle authentication redirects
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const validateFile = useCallback((file) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/aac']
    const maxSize = 25 * 1024 * 1024 // 25MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload MP3, WAV, M4A, MP4, WebM, OGG, FLAC, or AAC files.')
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 25MB.')
    }

    return true
  }, [])

  const handleFileUpload = useCallback(async (file) => {
    try {
      setError('')
      setSuccess('')
      setIsUploading(true)
      setUploadProgress(0)

      // Validate file
      validateFile(file)
      
      // Store file for potential retry
      setLastUploadedFile(file)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Save file to localStorage
      const fileData = await saveUploadedFile(file)
      
      // Start transcription with selected service
      let apiEndpoint
      if (selectedService === 'whisper') {
        // Use the robust route that tries HF and falls back to AssemblyAI/mocked result
        apiEndpoint = '/api/transcribe'
      } else if (selectedService === 'huggingface-direct') {
        apiEndpoint = '/api/transcribe-no-ffmpeg'
      } else if (selectedService === 'simple') {
        apiEndpoint = '/api/transcribe-working'
      } else {
        apiEndpoint = '/api/transcribe'
      }
      
      try {
        await transcribeWithOpenAI(fileData.id, file, apiEndpoint)
      } catch (transcriptionError) {
        // If transcription fails, show alternative option
        throw transcriptionError
      }
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setSuccess('File uploaded and transcription started successfully!')
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      setError(error.message)
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }, [selectedService, validateFile, router])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const handleServiceChange = useCallback((serviceId) => {
    setSelectedService(serviceId)
  }, [])

  const tryAlternativeEndpoint = useCallback(async (file) => {
    try {
      setError('')
      setSuccess('')
      setIsUploading(true)
      setUploadProgress(50)

      // Try working endpoint
      const fileData = await saveUploadedFile(file)
      await transcribeWithOpenAI(fileData.id, file, '/api/transcribe-working')
      
      setUploadProgress(100)
      setSuccess('File uploaded and transcription completed with working method!')
      setShowAlternative(false)
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      setError(error.message)
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }, [router])

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Don't render anything if not authenticated
  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Upload Audio File
          </h1>
          <p className="text-lg text-gray-600">
            Upload your audio file to convert it to text using AI transcription
          </p>
          </div>

        {/* Service Selector */}
        <TranscriptionServiceSelector onServiceChange={handleServiceChange} />

        {/* Upload Area */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
              onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isUploading ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
              </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Processing your audio file...
                </h3>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {uploadProgress}% complete
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
            </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop your audio file here
                </h3>
                <p className="text-gray-500 mb-4">
                  or click to browse files
                </p>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                >
                  Choose File
                </label>
              </>
            )}
                      </div>

          {/* File Requirements */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">File Requirements:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Maximum file size: 25MB</li>
              <li>• Supported formats: MP3, WAV, M4A, MP4, WebM, OGG, FLAC, AAC</li>
              <li>• Processing time depends on file size and length</li>
              <li>• Selected service: <span className="font-medium">{selectedService === 'huggingface' ? 'Hugging Face Whisper' : selectedService === 'local' ? 'Local Whisper.cpp' : selectedService}</span></li>
            </ul>
                    </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
                  </div>
              {showAlternative && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-sm mb-2">The main transcription service is having issues. Try the alternative method:</p>
                  <button 
                    onClick={() => lastUploadedFile && tryAlternativeEndpoint(lastUploadedFile)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Try Alternative Transcription
                  </button>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              <div className="flex">
                <svg className="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {success}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}