import { NextRequest, NextResponse } from 'next/server'
import { HfInference } from '@huggingface/inference'
import { getServerSession } from 'next-auth'

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if API key exists
    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'HUGGINGFACE_API_KEY is not set in environment variables. Please check your .env.local file.' 
      }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/aac']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload MP3, WAV, M4A, MP4, WebM, OGG, FLAC, or AAC files.' 
      }, { status: 400 })
    }

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 25MB.' 
      }, { status: 400 })
    }

    console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type)

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('File converted to buffer, size:', buffer.length)

    // Initialize Hugging Face inference
    const hf = new HfInference(apiKey)

    console.log('Starting transcription with alternative approach...')

    // Try different models that might work better
    const models = [
      'openai/whisper-tiny',
      'openai/whisper-base',
      'facebook/wav2vec2-base-960h'
    ]

    let transcription = null
    let lastError = null

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`)
        
        if (model.includes('whisper')) {
          transcription = await hf.automaticSpeechRecognition({
            model: model,
            inputs: buffer,
            parameters: {
              return_timestamps: true
            }
          })
        } else {
          // For non-whisper models, try different approach
          transcription = await hf.automaticSpeechRecognition({
            model: model,
            inputs: buffer
          })
        }
        
        console.log(`Success with model: ${model}`)
        break
        
      } catch (error) {
        console.log(`Failed with model ${model}:`, error.message)
        lastError = error
        continue
      }
    }

    if (!transcription) {
      throw lastError || new Error('All models failed')
    }

    console.log('Transcription completed successfully')

    // Format the response
    const result = {
      text: transcription.text || '',
      language: transcription.language || 'en',
      duration: transcription.duration || 0,
      segments: transcription.chunks || [],
      words: transcription.words || []
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Transcription error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    if (error.message?.includes('quota')) {
      return NextResponse.json({ 
        error: 'API quota exceeded. Please check your Hugging Face API key and usage limits.' 
      }, { status: 429 })
    }
    
    if (error.message?.includes('unauthorized') || error.message?.includes('invalid')) {
      return NextResponse.json({ 
        error: 'Invalid Hugging Face API key. Please check your configuration in .env.local file.' 
      }, { status: 401 })
    }

    return NextResponse.json({ 
      error: 'Transcription failed. Please try again.',
      details: error.message
    }, { status: 500 })
  }
}
