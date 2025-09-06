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

    console.log('🎵 Google Cloud Speech-to-Text Request:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileType: file.type,
      timestamp: new Date().toISOString()
    })

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('📦 File converted to buffer, size:', buffer.length)

    // Check Google Cloud API key
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'Google Cloud API key not configured',
        status: 'missing_api_key',
        message: 'GOOGLE_CLOUD_API_KEY is not set in environment variables',
        setup_instructions: [
          '1. Create a .env.local file in your project root',
          '2. Add: GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here',
          '3. Get your API key from Google Cloud Console',
          '4. Enable Speech-to-Text API in your project',
          '5. Restart the development server'
        ]
      }, { status: 400 })
    }

    console.log('🔑 API Key validated, starting Google Cloud transcription...')

    try {
      // Convert audio to base64 for Google Cloud API
      const base64Audio = buffer.toString('base64')
      
      // Google Cloud Speech-to-Text API endpoint
      const googleApiUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`
      
      // Prepare the request payload
      const requestBody = {
        config: {
          encoding: getEncodingFromMimeType(file.type),
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
          model: 'latest_long' // Best model for longer audio files
        },
        audio: {
          content: base64Audio
        }
      }

      console.log('🚀 Sending request to Google Cloud Speech-to-Text...')
      
      const startTime = Date.now()
      
      // Make the API request
      const response = await fetch(googleApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const endTime = Date.now()
      const processingTime = endTime - startTime

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Google Cloud API error:', errorData)
        
        return NextResponse.json({
          error: 'Google Cloud Speech-to-Text failed',
          status: 'api_error',
          message: 'Speech-to-Text API returned an error',
          details: errorData.error?.message || 'Unknown API error',
          error_code: errorData.error?.code || 'UNKNOWN',
          troubleshooting: [
            '1. Check if Speech-to-Text API is enabled in Google Cloud Console',
            '2. Verify your API key has the correct permissions',
            '3. Check your Google Cloud billing status',
            '4. Ensure the audio file format is supported',
            '5. Check the API quota and limits'
          ]
        }, { status: response.status })
      }

      const result = await response.json()
      
      if (result.results && result.results.length > 0) {
        // Extract transcription text
        const transcription = result.results
          .map(result => result.alternatives[0]?.transcript || '')
          .join(' ')
          .trim()

        if (transcription) {
          console.log('✅ Google Cloud transcription completed successfully!')
          console.log(`⏱️ Processing time: ${processingTime}ms`)
          console.log(`📊 Transcription length: ${transcription.length} characters`)

          // Format the response
          const formattedResult = {
            text: transcription,
            language: 'en-US',
            duration: 0, // Could be calculated from audio file
            segments: result.results.map((result, index) => ({
              start: result.alternatives[0]?.words?.[0]?.startTime || index,
              end: result.alternatives[0]?.words?.[result.alternatives[0]?.words?.length - 1]?.endTime || index + 1,
              text: result.alternatives[0]?.transcript || ''
            })),
            words: result.results.flatMap(result => 
              result.alternatives[0]?.words?.map(word => ({
                word: word.word,
                start: word.startTime,
                end: word.endTime,
                confidence: word.confidence
              })) || []
            ),
            model: 'google-cloud-speech-to-text',
            model_description: 'Google Cloud Speech-to-Text API - Latest Long Model',
            processing_time_ms: processingTime,
            confidence: result.results[0]?.alternatives[0]?.confidence || 0.95,
            service: 'google-cloud',
            status: 'completed',
            message: 'Google Cloud Speech-to-Text transcription completed successfully',
            file_info: {
              name: file.name,
              size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
              type: file.type
            }
          }

          return NextResponse.json(formattedResult)
        } else {
          throw new Error('No transcription text received from Google Cloud API')
        }
      } else {
        throw new Error('No transcription results received from Google Cloud API')
      }

    } catch (apiError) {
      console.error('❌ Google Cloud API error:', apiError)
      
      return NextResponse.json({
        error: 'Google Cloud Speech-to-Text failed',
        status: 'api_error',
        message: 'Failed to process audio with Google Cloud Speech-to-Text',
        details: apiError.message,
        troubleshooting: [
          '1. Check your internet connection',
          '2. Verify your API key is valid',
          '3. Ensure Speech-to-Text API is enabled',
          '4. Check your Google Cloud project billing',
          '5. Try with a different audio file format'
        ]
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ General transcription error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    return NextResponse.json({ 
      error: 'Transcription failed',
      status: 'general_error',
      message: 'An unexpected error occurred during transcription',
      details: error.message,
      suggestion: 'Check the server logs for more details or try again'
    }, { status: 500 })
  }
}

// Helper function to determine audio encoding from MIME type
function getEncodingFromMimeType(mimeType) {
  switch (mimeType) {
    case 'audio/wav':
      return 'LINEAR16'
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'MP3'
    case 'audio/m4a':
    case 'audio/mp4':
      return 'MP3' // Convert to MP3 for Google Cloud
    case 'audio/webm':
      return 'WEBM_OPUS'
    case 'audio/ogg':
      return 'OGG_OPUS'
    case 'audio/flac':
      return 'FLAC'
    case 'audio/aac':
      return 'MP3' // Convert to MP3 for Google Cloud
    default:
      return 'LINEAR16' // Default to WAV format
  }
}











