# 🎤 Voice Bot Pro

A production-ready voice chatbot built with Next.js, featuring real-time speech recognition, AI responses, and text-to-speech.

## ✨ Features

- 🎤 **Real-time Speech Recognition** - Using Whisper via Hugging Face Transformers
- 🤖 **AI Conversations** - Powered by Google Gemini API
- 🔊 **Text-to-Speech** - Browser-based voice synthesis
- ⚡ **High Performance** - Optimized to achieve <1200ms response times
- 🎛️ **User Settings** - Customizable TTS speed, volume, and caching
- 📊 **Performance Metrics** - Real-time latency tracking and history
- 🛠️ **Production Ready** - Enhanced error handling and retry logic

## 🚀 Quick Start

1. **Clone the repository**
git clone https://github.com/gauravsingh0001/voice-bot-pro.git
cd voice-bot-pro

3. **Install dependencies**
npm install


3. **Set up environment variables**
 .env.local
Add your GEMINI_API_KEY to .env.local


4. **Run the development server**
npm run dev


5. **Open your browser**
Visit [http://localhost:3000](http://localhost:3000)

## 🔧 Environment Variables

Create a `.env.local` file with:
GEMINI_API_KEY=your_google_generative_ai_key_here


## 📦 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Speech Recognition**: Whisper (Hugging Face Transformers)
- **AI**: Google Gemini API
- **Text-to-Speech**: Web Speech API
- **Styling**: Tailwind CSS

## 🎯 Performance

- **STT**: ~400-800ms (Whisper)
- **API**: ~800-1200ms (Gemini)
- **TTS**: ~200-400ms (Web Speech API)
- **Total**: Often achieves <1200ms target response time

## 🏗️ Architecture

User Voice Input
↓
Whisper STT (Worker)
↓
Gemini AI API
↓
Web Speech TTS
↓
Audio Output


## 🎮 Usage

1. **Click "Start Recording"** to begin voice interaction
2. **Speak your message** clearly into the microphone
3. **Click "Stop Recording"** when finished speaking
4. **Wait for AI response** with real-time performance metrics
5. **Listen to audio response** or read the text output
6. **Adjust settings** for TTS speed, volume, and caching preferences

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

src/
├── app/
│ ├── api/chat/route.ts # Gemini API integration
│ ├── page.tsx # Main voice bot interface
│ └── layout.tsx # App layout
├── workers/
│ └── whisperWorker.ts # Whisper STT worker
├── components/ # Reusable UI components
└── styles/ # Global styles


## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub** (if not already done)
2. **Connect to Vercel**: Visit [vercel.com](https://vercel.com)
3. **Import repository** and deploy
4. **Add environment variables** in Vercel dashboard:
   - `GEMINI_API_KEY`: Your Google Generative AI key

### Deploy to Netlify

1. **Build the project**: `npm run build`
2. **Deploy the `out` folder** to Netlify
3. **Set environment variables** in Netlify dashboard

## 🔒 Security & Privacy

- ✅ **API keys protected** - Environment variables not committed to repository
- ✅ **Rate limiting** - Built-in API call rate limiting
- ✅ **Input validation** - Sanitized user inputs
- ✅ **HTTPS ready** - Secure by default
- ✅ **No data storage** - Conversations are not stored or logged

## 🐛 Troubleshooting

### Common Issues

**"TTS not available"**
- Ensure you're using a modern browser (Chrome, Firefox, Safari)
- Check browser permissions for microphone access

**"Whisper taking too long to load"**
- First load downloads ~100MB model, subsequent loads are faster
- Check internet connection and browser console for errors

**"API errors"**
- Verify your `GEMINI_API_KEY` is correctly set
- Check API quota and rate limits in Google AI Studio

### Browser Compatibility

- ✅ **Chrome 80+** (Recommended)
- ✅ **Firefox 76+**
- ✅ **Safari 14+**
- ✅ **Edge 80+**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js) for Whisper integration
- [Google Generative AI](https://ai.google.dev/) for Gemini API
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📞 Support

If you encounter any issues or have questions:

1. **Check the troubleshooting section** above
2. **Open an issue** on GitHub
3. **Check browser console** for error messages

---

**Built with ❤️ using modern web technologies**

