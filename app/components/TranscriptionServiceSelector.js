'use client'

import { useState } from 'react'

export default function TranscriptionServiceSelector({ onServiceChange }) {
  const [selectedService, setSelectedService] = useState('whisper')

  const services = [
    {
      id: 'whisper',
      name: '🎵 OpenAI Whisper (Hugging Face)',
      description: 'High-quality transcription using OpenAI Whisper models',
      cost: 'Free tier',
      quality: 'Very High',
      setup: 'Easy'
    }
  ]

  const handleServiceChange = (serviceId) => {
    setSelectedService(serviceId)
    onServiceChange(serviceId)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Choose Transcription Service
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedService === service.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleServiceChange(service.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-gray-900">{service.name}</h4>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedService === service.id
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {selectedService === service.id && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{service.description}</p>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <span className="font-medium text-gray-900">Cost</span>
                <p className="text-gray-600">{service.cost}</p>
              </div>
              <div className="text-center">
                <span className="font-medium text-gray-900">Quality</span>
                <p className="text-gray-600">{service.quality}</p>
              </div>
              <div className="text-center">
                <span className="font-medium text-gray-900">Setup</span>
                <p className="text-gray-600">{service.setup}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
        {selectedService === 'whisper' && (
          <div className="text-sm text-blue-800">
            <p>1. Get free API key from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">Hugging Face</a></p>
            <p>2. Add <code className="bg-blue-100 px-1 rounded">HUGGINGFACE_API_KEY=hf_your_key_here</code> to .env.local</p>
            <p>3. Enable inference providers at <a href="https://huggingface.co/settings/inference-providers" target="_blank" rel="noopener noreferrer" className="underline">Hugging Face settings</a></p>
          </div>
        )}
      </div>
    </div>
  )
}

