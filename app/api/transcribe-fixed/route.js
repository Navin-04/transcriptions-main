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

    // Check API key first
    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'HUGGINGFACE_API_KEY is not configured. Please add it to your .env.local file.',
        status: 'missing_key',
        instructions: [
          '1. Go to https://huggingface.co/settings/tokens',
          '2. Create a new token',
          '3. Add HUGGINGFACE_API_KEY=hf_your_token_here to .env.local',
          '4. Restart the development server'
        ]
      }, { status: 500 })
    }

    if (!apiKey.startsWith('hf_')) {
      return NextResponse.json({ 
        error: 'Invalid Hugging Face API key format. Should start with "hf_"',
        status: 'invalid_key',
        instructions: [
          '1. Go to https://huggingface.co/settings/tokens',
          '2. Generate a new token',
          '3. Make sure it starts with "hf_"',
          '4. Update your .env.local file'
        ]
      }, { status: 500 })
    }

    // Try Hugging Face transcription
    try {
      const { HfInference } = await import('@huggingface/inference')
      console.log('Trying Hugging Face transcription...')
      
      const hf = new HfInference(apiKey)
      
      // Test API connectivity first
      try {
        await hf.textGeneration({
          model: 'gpt2',
          inputs: 'test',
          parameters: { max_new_tokens: 1 }
        })
        console.log('Hugging Face API connectivity test passed')
      } catch (testError) {
        console.log('Hugging Face API test failed:', testError.message)
        
        // Check if it's an inference provider issue
        if (testError.message.includes('inference') || testError.message.includes('provider')) {
          return NextResponse.json({ 
            error: 'Hugging Face inference providers not configured. Please set up inference providers in your Hugging Face account.',
            status: 'no_inference_providers',
            instructions: [
              '1. Go to https://huggingface.co/settings/inference-providers',
              '2. Click "Add Provider" for Hugging Face Inference API',
              '3. Enable free tier services',
              '4. Or try alternative services like AssemblyAI or Speechmatics'
            ]
          }, { status: 500 })
        }
        
        return NextResponse.json({ 
          error: 'Hugging Face API is not accessible. Please check your API key and account settings.',
          status: 'api_error',
          details: testError.message
        }, { status: 500 })
      }
      
      // Try multiple models for transcription
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
            
            const result = {
              text: transcription.text,
              language: transcription.language || 'en',
              duration: transcription.duration || 0,
              segments: transcription.chunks || [],
              words: transcription.words || [],
              model: model,
              service: 'huggingface'
            }
            
            return NextResponse.json(result)
          }
        } catch (modelError) {
          console.log(`Failed with model ${model}:`, modelError.message)
          continue
        }
      }
      
      // If all models failed, return specific error
      return NextResponse.json({ 
        error: 'All Hugging Face transcription models failed. This may be due to model availability or account limitations.',
        status: 'models_failed',
        instructions: [
          '1. Check your Hugging Face account has inference providers enabled',
          '2. Try using alternative services like AssemblyAI or Speechmatics',
          '3. Or set up local Whisper.cpp for offline transcription'
        ]
      }, { status: 500 })
      
    } catch (hfError) {
      console.log('Hugging Face import or initialization failed:', hfError.message)
      return NextResponse.json({ 
        error: 'Hugging Face service is not available. Please check your setup.',
        status: 'service_unavailable',
        details: hfError.message
      }, { status: 500 })
    }

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
      suggestion: 'Check the Hugging Face setup guide or try alternative services'
    }, { status: 500 })
  }
}
