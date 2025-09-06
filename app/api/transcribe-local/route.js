import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)

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

    // Create temporary directory for processing
    const tempDir = path.join(process.cwd(), 'temp', uuidv4())
    await fs.promises.mkdir(tempDir, { recursive: true })

    try {
      // Save uploaded file
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const inputPath = path.join(tempDir, `input.${file.name.split('.').pop()}`)
      await fs.promises.writeFile(inputPath, buffer)

      // Convert to WAV if needed (Whisper.cpp works best with WAV)
      let wavPath = inputPath
      if (!file.name.toLowerCase().endsWith('.wav')) {
        wavPath = path.join(tempDir, 'input.wav')
        await execAsync(`ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`)
      }

      // Run Whisper.cpp transcription
      // Note: You need to have Whisper.cpp installed and the model downloaded
      const modelPath = process.env.WHISPER_MODEL_PATH || './models/ggml-base.bin'
      const outputPath = path.join(tempDir, 'output.txt')
      
      const { stdout, stderr } = await execAsync(
        `./whisper.cpp/main -m "${modelPath}" -f "${wavPath}" -otxt -of "${outputPath}" --output-txt`
      )

      // Read transcription result
      const transcription = await fs.promises.readFile(outputPath, 'utf-8')

      // Clean up temporary files
      await fs.promises.rm(tempDir, { recursive: true, force: true })

      // Format the response
      const result = {
        text: transcription.trim(),
        language: 'en', // Whisper.cpp can detect language, but we'll default to English
        duration: 0, // Could be calculated from audio file
        segments: [],
        words: []
      }

      return NextResponse.json(result)

    } catch (processingError) {
      // Clean up on error
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError)
      }
      throw processingError
    }

  } catch (error) {
    console.error('Transcription error:', error)
    
    if (error.message?.includes('ffmpeg')) {
      return NextResponse.json({ 
        error: 'Audio conversion failed. Please ensure ffmpeg is installed.' 
      }, { status: 500 })
    }
    
    if (error.message?.includes('whisper.cpp')) {
      return NextResponse.json({ 
        error: 'Whisper.cpp not found. Please install Whisper.cpp and download the model.' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      error: 'Transcription failed. Please try again.' 
    }, { status: 500 })
  }
}










