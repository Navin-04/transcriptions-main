'use client'

import { useState } from 'react'

export default function DebugPage() {
  const [testResult, setTestResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const testHuggingFaceAPI = async () => {
    setIsLoading(true)
    setError(null)
    setTestResult(null)

    try {
      const response = await fetch('/api/test-hf-setup')
      const data = await response.json()
      
      if (response.ok) {
        setTestResult(data)
      } else {
        setError(data)
      }
    } catch (err) {
      setError({ error: 'Network error', details: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  const testMultiProvider = async () => {
    setIsLoading(true)
    setError(null)
    setTestResult(null)

    try {
      const response = await fetch('/api/transcribe-multi', {
        method: 'POST',
        body: new FormData()
      })
      const data = await response.json()
      
      if (response.ok) {
        setTestResult(data)
      } else {
        setError(data)
      }
    } catch (err) {
      setError({ error: 'Network error', details: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Hugging Face API Debug
          </h1>
          <p className="text-lg text-gray-600">
            Test your Hugging Face API connection and identify issues
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
                  <div className="mb-6 space-y-4">
          <div>
            <button
              onClick={testHuggingFaceAPI}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 mr-4"
            >
              {isLoading ? 'Testing...' : 'Test Hugging Face API'}
            </button>
            <button
              onClick={testMultiProvider}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test Multi-Provider Setup'}
            </button>
          </div>
          <p className="text-sm text-gray-600">
            The first button tests Hugging Face connectivity. The second button tests the complete multi-provider transcription setup.
          </p>
        </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Testing API connection...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <h3 className="font-semibold mb-2">Error Found:</h3>
              <p className="mb-2">{error.error}</p>
              {error.details && (
                <details className="text-sm">
                  <summary className="cursor-pointer">View Details</summary>
                  <pre className="mt-2 bg-red-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(error, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {testResult && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              <h3 className="font-semibold mb-2">✅ API Test Successful!</h3>
              <p className="mb-2">{testResult.message}</p>
              <details className="text-sm">
                <summary className="cursor-pointer">View Test Details</summary>
                <pre className="mt-2 bg-green-100 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </details>
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Common Issues & Solutions:</h3>
            <div className="space-y-3 text-sm">
              <div>
                <strong>1. Missing API Key:</strong>
                <p>Make sure you have created a <code>&#96;.env.local&#96;</code> file with:</p>
                <code className="bg-gray-200 px-2 py-1 rounded">HUGGINGFACE_API_KEY=hf_your_token_here</code>
              </div>
              <div>
                <strong>2. Invalid API Key:</strong>
                <p>Your API key should start with &quot;hf_&quot; and be from <a href="https://huggingface.co/settings/tokens" target="_blank" className="text-blue-600 underline">Hugging Face</a></p>
              </div>
              <div>
                <strong>3. API Quota Exceeded:</strong>
                <p>Check your Hugging Face usage limits at <a href="https://huggingface.co/settings/billing" target="_blank" className="text-blue-600 underline">billing settings</a></p>
              </div>
              <div>
                <strong>4. Server Restart Required:</strong>
                <p>After updating `.env.local`, restart your development server with <code className="bg-gray-200 px-2 py-1 rounded">npm run dev</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
