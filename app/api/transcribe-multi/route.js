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

    // Try Hugging Face first
    const hfApiKey = process.env.HUGGINGFACE_API_KEY
    if (hfApiKey && hfApiKey.startsWith('hf_')) {
      try {
        console.log('Trying Hugging Face transcription...')
        const { HfInference } = await import('@huggingface/inference')
        const hf = new HfInference(hfApiKey)
        
        // Test API connectivity first
        try {
          await hf.textGeneration({
            model: 'gpt2',
            inputs: 'test',
            parameters: { max_new_tokens: 1 }
          })
          console.log('Hugging Face API connectivity test passed')
          
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
                console.log(`Success with Hugging Face model: ${model}`)
                
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
          
          console.log('All Hugging Face models failed, trying AssemblyAI...')
          
        } catch (testError) {
          console.log('Hugging Face API test failed:', testError.message)
          console.log('Trying AssemblyAI...')
        }
        
      } catch (hfError) {
        console.log('Hugging Face not available:', hfError.message)
        console.log('Trying AssemblyAI...')
      }
    } else {
      console.log('Hugging Face API key not configured, trying AssemblyAI...')
    }

    // Try AssemblyAI as fallback
    const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY
    if (assemblyApiKey) {
      try {
        console.log('Trying AssemblyAI transcription...')
        
        // Upload to AssemblyAI
        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: {
            'Authorization': assemblyApiKey,
            'Content-Type': 'application/octet-stream'
          },
          body: buffer
        })

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
        }

        const uploadData = await uploadResponse.json()
        const audioUrl = uploadData.upload_url

        console.log('File uploaded to AssemblyAI:', audioUrl)

        // Start transcription
        const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'POST',
          headers: {
            'Authorization': assemblyApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            audio_url: audioUrl,
            language_code: 'en',
            punctuate: true,
            format_text: true
          })
        })

        if (!transcriptResponse.ok) {
          throw new Error(`Transcription request failed: ${transcriptResponse.status} ${transcriptResponse.statusText}`)
        }

        const transcriptData = await transcriptResponse.json()
        const transcriptId = transcriptData.id

        console.log('Transcription started, ID:', transcriptId)

        // Poll for completion
        let attempts = 0
        const maxAttempts = 60 // 5 minutes with 5-second intervals
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
          
          const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: {
              'Authorization': assemblyApiKey
            }
          })

          if (!statusResponse.ok) {
            throw new Error(`Status check failed: ${statusResponse.status} ${statusResponse.statusText}`)
          }

          const statusData = await statusResponse.json()
          
          if (statusData.status === 'completed') {
            console.log('AssemblyAI transcription completed successfully')
            
            const result = {
              text: statusData.text,
              language: statusData.language_code || 'en',
              duration: statusData.audio_duration || 0,
              segments: statusData.words || [],
              words: statusData.words || [],
              model: 'assemblyai',
              service: 'assemblyai',
              confidence: statusData.confidence || 0
            }
            
            return NextResponse.json(result)
          } else if (statusData.status === 'error') {
            throw new Error(`Transcription failed: ${statusData.error}`)
          }
          
          attempts++
          console.log(`Transcription status: ${statusData.status} (attempt ${attempts}/${maxAttempts})`)
        }
        
        throw new Error('AssemblyAI transcription timed out')
        
      } catch (assemblyError) {
        console.log('AssemblyAI transcription failed:', assemblyError.message)
      }
    }

    // If all services failed, return comprehensive error
    const errors = []
    const instructions = []
    
    if (!hfApiKey) {
      errors.push('Hugging Face API key not configured')
      instructions.push('1. Get Hugging Face API key from https://huggingface.co/settings/tokens')
    } else if (!hfApiKey.startsWith('hf_')) {
      errors.push('Invalid Hugging Face API key format')
      instructions.push('1. Hugging Face API key should start with "hf_"')
    }
    
    if (!assemblyApiKey) {
      errors.push('AssemblyAI API key not configured')
      instructions.push('2. Get AssemblyAI API key from https://www.assemblyai.com/')
    }
    
    if (errors.length === 0) {
      errors.push('All transcription services failed')
      instructions.push('1. Check your API keys are valid')
      instructions.push('2. Verify you have credits/quota available')
      instructions.push('3. Try a different audio file')
    }
    
    instructions.push('3. Add API keys to .env.local file')
    instructions.push('4. Restart the development server')

    return NextResponse.json({ 
      error: 'Transcription failed. All available services are not configured or failed.',
      status: 'all_services_failed',
      errors: errors,
      instructions: instructions,
      suggestion: 'Please configure at least one transcription service (Hugging Face or AssemblyAI)'
    }, { status: 500 })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ 
      error: 'Transcription failed. Please try again.',
      details: error.message
    }, { status: 500 })
  }
}
