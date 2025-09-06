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

    console.log('Processing file with AssemblyAI:', file.name, 'Size:', file.size, 'Type:', file.type)

    // Check API key
    const apiKey = process.env.ASSEMBLYAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'ASSEMBLYAI_API_KEY is not configured. Please add it to your .env.local file.',
        status: 'missing_key',
        instructions: [
          '1. Sign up at https://www.assemblyai.com/',
          '2. Get your API key from the dashboard',
          '3. Add ASSEMBLYAI_API_KEY=your_key_here to .env.local',
          '4. Restart the development server'
        ]
      }, { status: 500 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('File converted to buffer, size:', buffer.length)

    // Upload to AssemblyAI
    try {
      // First, upload the file to AssemblyAI
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
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
          'Authorization': apiKey,
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
            'Authorization': apiKey
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
      
      throw new Error('Transcription timed out')
      
    } catch (assemblyError) {
      console.log('AssemblyAI transcription failed:', assemblyError.message)
      return NextResponse.json({ 
        error: 'AssemblyAI transcription failed',
        status: 'assemblyai_failed',
        details: assemblyError.message,
        instructions: [
          '1. Check your AssemblyAI API key is valid',
          '2. Verify you have credits available',
          '3. Try a different audio file',
          '4. Or use Hugging Face or local Whisper.cpp'
        ]
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ 
      error: 'Transcription failed. Please try again.',
      details: error.message
    }, { status: 500 })
  }
}
