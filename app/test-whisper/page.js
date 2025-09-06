'use client'

import { useState } from 'react'

export default function TestWhisperPage() {
  const [testResult, setTestResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSetup, setShowSetup] = useState(false)

  const testWhisperModel = async () => {
    setIsLoading(true)
    setError(null)
    setTestResult(null)

    try {
      const response = await fetch('/api/test-whisper')
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getOverallStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100 border-green-300'
      case 'partial': return 'text-yellow-600 bg-yellow-100 border-yellow-300'
      case 'failed': return 'text-red-600 bg-red-100 border-red-300'
      default: return 'text-gray-600 bg-gray-100 border-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎵 OpenAI Whisper Model Test
          </h1>
          <p className="text-lg text-gray-600">
            Test your OpenAI Whisper model integration through Hugging Face API
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Test Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Test Controls
              </h3>
              
              <button
                onClick={testWhisperModel}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 mb-4"
              >
                {isLoading ? '🧪 Testing...' : '🧪 Test Whisper Model'}
              </button>

              <button
                onClick={() => setShowSetup(!showSetup)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {showSetup ? 'Hide' : 'Show'} Setup Instructions
              </button>

              {showSetup && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
                  <h4 className="font-medium text-blue-900 mb-2">Setup Steps:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800">
                    <li>Get Hugging Face API key from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">settings</a></li>
                    <li>Create <code className="bg-blue-100 px-1 rounded">.env.local</code> file</li>
                    <li>Add <code className="bg-blue-100 px-1 rounded">HUGGINGFACE_API_KEY=hf_your_key_here</code></li>
                    <li>Enable inference providers at <a href="https://huggingface.co/settings/inference-providers" target="_blank" rel="noopener noreferrer" className="underline">inference providers</a></li>
                    <li>Restart development server</li>
                  </ol>
                </div>
              )}

              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ Important Notes:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• API key must start with "hf_"</li>
                  <li>• Inference providers must be enabled</li>
                  <li>• Check your API quota and billing</li>
                  <li>• WAV format works best for testing</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="lg:col-span-2">
            {isLoading && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-xl text-gray-600">Testing Whisper Model...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
              </div>
            )}

            {error && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  <h3 className="font-semibold mb-2">❌ Test Error:</h3>
                  <p className="mb-2">{error.error || error.message}</p>
                  {error.details && (
                    <details className="text-sm">
                      <summary className="cursor-pointer">View Details</summary>
                      <pre className="mt-2 bg-red-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(error, null, 2)}
                      </pre>
                    </details>
                  )}
                  {error.setup_instructions && (
                    <div className="mt-3">
                      <h4 className="font-medium mb-2">Setup Instructions:</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {error.setup_instructions.map((instruction, index) => (
                          <li key={index} className="text-sm">{instruction}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}

            {testResult && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                {/* Overall Status */}
                <div className={`p-4 rounded-lg border-2 mb-6 ${getOverallStatusColor(testResult.status)}`}>
                  <h3 className="font-semibold mb-2">
                    {testResult.status === 'success' && '✅ All Tests Passed!'}
                    {testResult.status === 'partial' && '⚠️ Partial Success'}
                    {testResult.status === 'failed' && '❌ All Tests Failed'}
                  </h3>
                  <p className="text-sm">{testResult.message}</p>
                </div>

                {/* Test Summary */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Test Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{testResult.summary?.total_tests || 0}</div>
                      <div className="text-sm text-gray-600">Total Tests</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{testResult.summary?.passed_tests || 0}</div>
                      <div className="text-sm text-green-600">Passed</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{testResult.summary?.failed_tests || 0}</div>
                      <div className="text-sm text-red-600">Failed</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{testResult.summary?.success_rate || '0%'}</div>
                      <div className="text-sm text-blue-600">Success Rate</div>
                    </div>
                  </div>
                </div>

                {/* Individual Test Results */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Test Details</h4>
                  <div className="space-y-3">
                    {testResult.tests?.map((test, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{test.test}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                            {test.status === 'passed' ? '✅ Passed' : '❌ Failed'}
                          </span>
                        </div>
                        
                        {test.status === 'passed' && test.details && (
                          <p className="text-sm text-gray-600 mb-2">{test.details}</p>
                        )}
                        
                        {test.status === 'failed' && test.error && (
                          <div className="text-sm text-red-600 mb-2">
                            <strong>Error:</strong> {test.error}
                          </div>
                        )}
                        
                        {test.troubleshooting && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-600">Troubleshooting</summary>
                            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-600">
                              {test.troubleshooting.map((tip, tipIndex) => (
                                <li key={tipIndex}>{tip}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                        
                        {test.model_info && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-600">Model Info</summary>
                            <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                              {JSON.stringify(test.model_info, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Raw Results */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-gray-600">View Raw Test Results</summary>
                  <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {/* Instructions */}
            {!isLoading && !testResult && !error && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Ready to Test Whisper?
                </h3>
                <p className="text-gray-600 mb-4">
                  Click the "Test Whisper Model" button to run comprehensive tests on your OpenAI Whisper integration through Hugging Face.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">What This Test Checks:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• API key validity and format</li>
                    <li>• Hugging Face API connectivity</li>
                    <li>• Whisper model availability</li>
                    <li>• Inference service functionality</li>
                    <li>• Audio model processing capability</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
