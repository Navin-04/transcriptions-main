import { NextRequest, NextResponse } from 'next/server'
import { HfInference } from '@huggingface/inference'

export async function GET() {
  try {
    // Check if API key exists
    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'HUGGINGFACE_API_KEY is not set in environment variables',
        status: 'missing_key'
      }, { status: 400 })
    }

    // Check if API key format is correct
    if (!apiKey.startsWith('hf_')) {
      return NextResponse.json({ 
        error: 'Invalid API key format. Should start with "hf_"',
        status: 'invalid_format',
        keyPreview: apiKey.substring(0, 10) + '...'
      }, { status: 400 })
    }

    // Test Hugging Face connection
    const hf = new HfInference(apiKey)
    
    // Test with a simple model to check API connectivity
    try {
      const testResult = await hf.textGeneration({
        model: 'gpt2',
        inputs: 'Hello',
        parameters: {
          max_new_tokens: 5
        }
      })
      
      return NextResponse.json({ 
        success: true,
        message: 'Hugging Face API connection successful',
        testResult: testResult,
        apiKeyPreview: apiKey.substring(0, 10) + '...'
      })
      
    } catch (apiError) {
      console.error('Hugging Face API Error:', apiError)
      
      if (apiError.message?.includes('quota')) {
        return NextResponse.json({ 
          error: 'API quota exceeded. Please check your Hugging Face usage limits.',
          status: 'quota_exceeded',
          details: apiError.message
        }, { status: 429 })
      }
      
      if (apiError.message?.includes('unauthorized') || apiError.message?.includes('invalid')) {
        return NextResponse.json({ 
          error: 'Invalid API key. Please check your Hugging Face token.',
          status: 'unauthorized',
          details: apiError.message
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: 'Hugging Face API error',
        status: 'api_error',
        details: apiError.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      status: 'server_error',
      details: error.message
    }, { status: 500 })
  }
}
