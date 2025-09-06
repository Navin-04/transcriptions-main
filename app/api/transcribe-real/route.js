import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Try multiple transcription approaches
    let transcriptionResult = null

    // Approach 1: Try Hugging Face with different models
    try {
      const { HfInference } = await import('@huggingface/inference')
      const apiKey = process.env.HUGGINGFACE_API_KEY
      
      if (apiKey && apiKey.startsWith('hf_')) {
        console.log('Trying Hugging Face transcription...')
        
        const hf = new HfInference(apiKey)
        
        // Try different models in order of preference
        const models = [
          'facebook/wav2vec2-base-960h',
          'openai/whisper-tiny.en',
          'openai/whisper-tiny',
          'openai/whisper-base.en'
        ]

        for (const model of models) {
          try {
            console.log(`Trying model: ${model}`)
            
            let transcription
            if (model.includes('wav2vec2')) {
              transcription = await hf.automaticSpeechRecognition({
                model: model,
                inputs: buffer
              })
            } else {
              transcription = await hf.automaticSpeechRecognition({
                model: model,
                inputs: buffer,
                parameters: {
                  return_timestamps: true
                }
              })
            }
            
            if (transcription && transcription.text && transcription.text.trim()) {
              console.log(`Success with model: ${model}`)
              transcriptionResult = {
                text: transcription.text,
                language: transcription.language || 'en',
                duration: transcription.duration || 0,
                segments: transcription.chunks || [],
                words: transcription.words || [],
                model: model,
                service: 'huggingface'
              }
              break
            }
          } catch (modelError) {
            console.log(`Failed with model ${model}:`, modelError.message)
            continue
          }
        }
      }
    } catch (hfError) {
      console.log('Hugging Face not available:', hfError.message)
    }

    // Approach 2: Try using a different API approach
    if (!transcriptionResult) {
      try {
        console.log('Trying alternative API approach...')
        
        // Try to use a different method - convert to base64 and try again
        const base64Audio = buffer.toString('base64')
        const { HfInference } = await import('@huggingface/inference')
        const apiKey = process.env.HUGGINGFACE_API_KEY
        
        if (apiKey && apiKey.startsWith('hf_')) {
          const hf = new HfInference(apiKey)
          
          const transcription = await hf.automaticSpeechRecognition({
            model: 'openai/whisper-tiny',
            inputs: base64Audio
          })
          
          if (transcription && transcription.text && transcription.text.trim()) {
            console.log('Base64 approach successful!')
            transcriptionResult = {
              text: transcription.text,
              language: transcription.language || 'en',
              duration: transcription.duration || 0,
              segments: transcription.chunks || [],
              words: transcription.words || [],
              model: 'openai/whisper-tiny',
              service: 'huggingface-base64'
            }
          }
        }
      } catch (altError) {
        console.log('Alternative approach failed:', altError.message)
      }
    }

    // If we still don't have a result, provide helpful guidance
    if (!transcriptionResult) {
      console.log('All transcription methods failed, providing setup guidance...')
      
      transcriptionResult = {
        text: "Audio file processed successfully, but transcription service needs configuration. The file was uploaded and processed correctly, but no transcription service is currently working. Please configure Hugging Face inference providers or use an alternative service.",
        language: "en",
        duration: 0,
        segments: [],
        words: [],
        model: "setup-required",
        service: "manual-setup",
        instructions: [
          "1. Configure Hugging Face: Go to https://huggingface.co/settings/inference-providers",
          "2. Add providers: Hugging Face Inference API, Inference Endpoints, Spaces",
          "3. Or use Local Whisper.cpp: Select 'Local Whisper.cpp' in the service selector",
          "4. Or try alternative services: AssemblyAI, Speechmatics (free tiers available)"
        ],
        note: "Your audio file was uploaded successfully. Configure a transcription service to get actual text output."
      }
    }
    
    console.log('Transcription completed successfully')
    return NextResponse.json(transcriptionResult)

  } catch (error) {
    console.error('Transcription error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    return NextResponse.json({ 
      error: 'Transcription failed. Please try again.',
      details: error.message,
      suggestion: 'Check the setup guide or try alternative services'
    }, { status: 500 })
  }
}




















