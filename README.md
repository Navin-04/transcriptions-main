# AudioTranscribe: AI Transcription with Speaker Diarization

A modern Next.js application that converts audio files to text with advanced speaker diarization capabilities. Upload audio files and get accurate transcriptions with speaker labels, timestamps, and a clean dashboard interface.

## ✨ Features

- 🎤 **Audio Upload**: Support for MP3, WAV, M4A, MP4, WebM, OGG, FLAC, AAC files (up to 25MB)
- 🎯 **Speaker Diarization**: Automatically identify and label different speakers in conversations
- ☁️ **Multiple AI Services**: Integration with Hugging Face Whisper, OpenAI, AssemblyAI, and Google Cloud
- 📊 **Dashboard**: Clean interface to view, manage, and download transcriptions
- 🔐 **User Authentication**: JSON-based user registration and login system
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔄 **Real-time Processing**: Live status updates during transcription
- 💾 **Local Storage**: Browser-based file management with quota monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd voxboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```

4. **Configure API keys** (choose one or more):
   
   **Hugging Face (Recommended - Free)**
   ```env
   HUGGINGFACE_API_KEY=hf_your_token_here
   ```
   
   **OpenAI Whisper**
   ```env
   OPENAI_API_KEY=sk-your_openai_key_here
   ```
   
   **AssemblyAI (Best for Speaker Diarization)**
   ```env
   ASSEMBLYAI_API_KEY=your_assemblyai_key_here
   ```
   
   **Google Cloud Speech-to-Text**
   ```env
   GOOGLE_CLOUD_API_KEY=your_google_cloud_key_here
   ```
   
   **NextAuth (Required)**
   ```env
   NEXTAUTH_SECRET=your_generated_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔑 API Key Setup

### Hugging Face (Free & Recommended)
1. Create account at [Hugging Face](https://huggingface.co)
2. Generate token at [Settings → Tokens](https://huggingface.co/settings/tokens)
3. Enable inference providers at [Settings → Inference Providers](https://huggingface.co/settings/inference-providers)
4. Add to `.env.local`: `HUGGINGFACE_API_KEY=hf_your_token_here`

### OpenAI Whisper
1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Generate API key from [API Keys](https://platform.openai.com/api-keys)
3. Add to `.env.local`: `OPENAI_API_KEY=sk-your_openai_key_here`

### AssemblyAI (Best Speaker Diarization)
1. Sign up at [AssemblyAI](https://www.assemblyai.com/)
2. Get your API key from the dashboard
3. Add to `.env.local`: `ASSEMBLYAI_API_KEY=your_key_here`

### Google Cloud Speech-to-Text
1. Create project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Speech-to-Text API
3. Create service account and download JSON key
4. Add to `.env.local`: `GOOGLE_CLOUD_API_KEY=your_key_here`

### NextAuth Secret
Generate a secure secret:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# PowerShell
[Convert]::ToBase64String((1..32 | % {Get-Random -Maximum 256}))
```

## 👤 User Authentication

The app includes a complete user management system:

- **Registration**: Create new accounts at `/register`
- **Login**: Sign in at `/login`
- **JSON Storage**: User credentials stored in `data/users.json`
- **Password Hashing**: Secure bcrypt encryption
- **Session Management**: NextAuth.js integration

### Default Demo Account
- **Email**: demo@example.com
- **Password**: password

*Note: This is only available if no users are registered in the JSON file.*

## 🎯 Usage

1. **Register/Login**: Create an account or sign in
2. **Upload Audio**: Go to `/upload` and select your audio file
3. **Choose Service**: Select from available transcription services
4. **Automatic Processing**: The app processes your audio with real-time updates
5. **View Results**: Check the dashboard for transcriptions with speaker labels
6. **Download**: Export transcriptions as text files

## 🎭 Speaker Diarization

The app automatically identifies different speakers in your audio:

- **Speaker A, B, C**: Each speaker gets a unique label
- **Timestamps**: See when each speaker talked
- **Clean Format**: Easy-to-read conversation flow

Example output:
```
Speaker A [0s - 5s]: Hello, welcome to our meeting today.
Speaker B [5s - 8s]: Thank you for having me.
Speaker A [8s - 15s]: Let's discuss the quarterly results...
```

## 🏗️ Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/     # NextAuth configuration
│   │   ├── register/               # User registration endpoint
│   │   ├── transcribe/             # Main transcription endpoint
│   │   ├── transcribe-whisper/     # Hugging Face Whisper
│   │   ├── transcribe-google/      # Google Cloud Speech-to-Text
│   │   └── transcribe-assemblyai/  # AssemblyAI endpoint
│   ├── components/
│   │   ├── TranscriptionServiceSelector.js
│   │   ├── Navbar.js
│   │   └── Providers.js
│   ├── dashboard/                  # Transcription management
│   ├── login/                      # Login page
│   ├── register/                   # Registration page
│   ├── upload/                     # File upload interface
│   └── utils/
│       └── fileStorage.js          # Local storage management
├── lib/
│   └── users.js                    # JSON user management
├── data/
│   └── users.json                  # User credentials storage
├── public/                         # Static assets
└── docs/                           # Setup guides
```

## 🔌 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `GET/POST /api/auth/*` - NextAuth authentication

### Transcription
- `POST /api/transcribe` - Main transcription with fallbacks
- `POST /api/transcribe-whisper` - Hugging Face Whisper only
- `POST /api/transcribe-google` - Google Cloud Speech-to-Text
- `POST /api/transcribe-assemblyai` - AssemblyAI with speaker diarization

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

Ensure you set these environment variables:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your production URL)
- `HUGGINGFACE_API_KEY` (optional)
- `OPENAI_API_KEY` (optional)
- `ASSEMBLYAI_API_KEY` (optional)
- `GOOGLE_CLOUD_API_KEY` (optional)

## 🔧 Troubleshooting

### Common Issues

**"Transcription failed"**
- Check API keys are valid and properly formatted
- Ensure audio file is under 25MB
- Try a shorter audio clip first
- Check browser console for detailed error messages

**"Speaker diarization not working"**
- AssemblyAI provides the best speaker diarization
- Ensure `ASSEMBLYAI_API_KEY` is set
- Audio should have clear speaker separation
- Try with different audio quality

**"Authentication errors"**
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies and try again
- Ensure `data/users.json` exists and is writable

**"Module not found errors"**
- Delete `.next` folder and restart dev server
- Run `npm install` to ensure all dependencies are installed
- Check file paths in import statements

### File Format Support

- **Audio**: MP3, WAV, M4A, MP4, WebM, OGG, FLAC, AAC
- **Size**: Up to 25MB
- **Duration**: No limit (but longer files take more time)
- **Quality**: Higher quality audio produces better results

## 📊 Service Comparison

| Service | Cost | Speaker Diarization | Accuracy | Speed |
|---------|------|-------------------|----------|-------|
| Hugging Face | Free | Basic | Good | Fast |
| OpenAI Whisper | Pay-per-use | No | Excellent | Fast |
| AssemblyAI | Free tier | Excellent | Very Good | Medium |
| Google Cloud | Pay-per-use | Good | Very Good | Fast |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

For issues and questions:
- Check the troubleshooting section above
- Review the setup guides in `/docs`
- Open an issue on [GitHub](https://github.com/your-username/voxboard/issues)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Hugging Face](https://huggingface.co/) - AI models
- [OpenAI](https://openai.com/) - Whisper models
- [AssemblyAI](https://www.assemblyai.com/) - Speech-to-text API
- [Google Cloud](https://cloud.google.com/) - Speech-to-text API

---

**Built with Next.js, NextAuth, and AI transcription services** 🚀
