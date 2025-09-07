# Twilio Voice Bot - Multi-Language Support

A TypeScript-based voice bot application that makes outbound phone calls using Twilio and OpenAI's GPT-4o Realtime Preview model. The bot supports multiple languages (Hindi, Kannada, Telugu) and can be configured for various use cases.

## Features

- **WebRTC Browser Calls**: Direct voice chat through your browser with microphone access
- **Twilio Phone Calls**: Make outbound calls to any phone number
- **Bidirectional Audio**: Real-time voice conversation with natural interruption handling
- **Multi-Language Support**: Supports Hindi, Kannada, and Telugu languages
- **OpenAI Realtime API**: Powered by GPT-4o Realtime Preview model
- **Dual Interface**: Single web page supports both WebRTC and phone calls
- **TypeScript**: Fully typed codebase with strict type checking

## Prerequisites

- Node.js 18.0.0 or higher
- **OpenAI API Key** with access to the Realtime API
- **Twilio Account** with:
  - Account SID
  - Auth Token  
  - Phone number capable of making outbound calls
- **ngrok** or similar tunneling service for local development

## Setup

### 1. Install Dependencies

```bash
cd node-impl
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Twilio Configuration  
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Start ngrok (For Local Development)

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

### 4. Configure Twilio Console

This is the **most important step**. Go to [Twilio Console](https://console.twilio.com) and configure your phone number:

#### Phone Number Configuration:
1. Navigate to **Phone Numbers → Manage → Active numbers**
2. Click on your Twilio phone number
3. In the **Voice Configuration** section:

   - **Webhook URL**: `https://your-ngrok-url.ngrok-free.app/twilio-realtime/answer`
   - **HTTP Method**: `POST`

4. In the **Status Callbacks** section (optional but recommended):

   - **Status Callback URL**: `https://your-ngrok-url.ngrok-free.app/twilio-realtime/status`  
   - **Status Callback Events**: Check `Initiated`, `Ringing`, `Answered`, `Completed`
   - **HTTP Method**: `POST`

5. **Save Configuration**

⚠️ **Important**: Replace `your-ngrok-url.ngrok-free.app` with your actual ngrok URL.

### 5. Build and Run the Application

#### Development Mode
```bash
npm run dev  # Runs TypeScript directly with hot reload
```

#### Production Mode
```bash
npm run build  # Compile TypeScript to JavaScript
npm start      # Run compiled JavaScript
```

#### Type Checking
```bash
npm run type-check  # Check types without building
```

## Usage

### Using the Voice Bot

Navigate to `http://localhost:3000` for the main interface with two options:

#### Browser Voice Chat (WebRTC)
1. Click **"Start Voice Chat"** in the Browser Voice Call section
2. Allow microphone access when prompted
3. Start speaking - the bot will respond in Hindi in real-time
4. Click **"Stop Voice Chat"** to end the session

#### Phone Calls (Twilio)
1. Enter a phone number in **E.164 format** (e.g., `+919876543210`) in the Phone Call section
2. Click **"Start Call"**
3. The bot will initiate the call and start speaking in Hindi once answered
4. Use **"End Call"** to terminate the call

### Testing the Setup

You can test if everything is configured correctly by:

1. Check server logs for successful startup
2. Verify ngrok is running and accessible
3. Test webhook endpoints by visiting them in browser:
   - `https://your-ngrok-url.ngrok-free.app/twilio-realtime/answer`
   - Should return XML response

## API Endpoints

### WebRTC Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/rtc` | Create WebRTC connection for browser calls |
| `POST` | `/observer/:callId` | Monitor WebRTC call sessions |

### Twilio Endpoints  
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/twilio-realtime/call` | Initiate an outbound phone call |
| `GET/POST` | `/twilio-realtime/answer` | TwiML webhook for answered calls |
| `WebSocket` | `/twilio-realtime/media-stream` | Bidirectional audio streaming |
| `GET/POST` | `/twilio-realtime/status` | Call status webhook |

## Project Structure

```
node-impl/
├── server.ts                    # Main Express server (TypeScript)
├── routes/
│   ├── twilio-realtime.ts      # Twilio integration with OpenAI Realtime API
│   ├── twilio-utils.ts         # Twilio client utilities
│   ├── rtc.ts                  # WebRTC route handler for browser calls
│   ├── observer.ts             # WebRTC session monitoring
│   └── utils.ts                # Bot configuration and session management
├── types/
│   └── index.ts                # TypeScript type definitions
├── prompts/
│   ├── hindi.txt               # Hindi language prompt
│   ├── kannada.txt             # Kannada language prompt
│   └── telugu.txt              # Telugu language prompt
├── public/
│   ├── index.html              # Main interface (WebRTC + Twilio)
│   └── index-twilio.html       # Legacy Twilio-only interface
├── dist/                       # Compiled JavaScript (generated)
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Bot Configuration

### Language Support

The bot supports multiple languages that can be selected dynamically:

- **Hindi** (default)
- **Kannada**
- **Telugu**

Language can be specified when initiating calls:

```javascript
// Phone call with language selection
POST /twilio-realtime/call
{
  "phoneNumber": "+919876543210",
  "language": "kannada"  // Options: hindi, kannada, telugu
}

// WebRTC call with language header
POST /rtc
Headers: {
  "x-language": "telugu"
}
```

### Voice Configuration

- **Voice**: Marin voice for natural pronunciation
- **Model**: GPT-4o Realtime Preview
- **Temperature**: 0.8 for natural conversation flow

## Troubleshooting

### Common Issues:

1. **"Twilio not configured" error**
   - Check your `.env` file has correct Twilio credentials
   - Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set

2. **Calls connect but no audio from bot**
   - Ensure webhook URL in Twilio Console is correct
   - Check ngrok is running and URL is accessible
   - Verify OpenAI API key has Realtime API access

3. **"404 Not Found" in Twilio logs**
   - Double-check webhook URL configuration in Twilio Console
   - Make sure ngrok URL is up-to-date

4. **Bot language issues**
   - Language prompts are stored in `prompts/` directory
   - Default language is Hindi if not specified
   - Check console logs for language loading errors

### Development Tips:

- Use `npm run dev` for TypeScript hot-reload during development
- Run `npm run type-check` to validate types without building
- Check browser console and server logs for detailed error messages
- Test webhook endpoints manually by visiting them in browser
- Update Twilio webhook URLs whenever ngrok restarts
- TypeScript provides better IDE support with IntelliSense

## TypeScript Features

This project is fully written in TypeScript with:

- **Strict Type Checking**: Enabled in `tsconfig.json` for maximum type safety
- **Custom Type Definitions**: Interfaces for Twilio messages, OpenAI responses, and session configs
- **Type-Safe Routes**: All Express routes and handlers are fully typed
- **WebSocket Type Safety**: Typed WebSocket message handling for both Twilio and OpenAI
- **IDE Support**: Full IntelliSense and auto-completion in VS Code and other TypeScript-aware editors

## Production Deployment

For production deployment:

1. Build the TypeScript code: `npm run build`
2. Deploy to a service with HTTPS (Heroku, Railway, etc.)
3. Update Twilio webhook URLs to use your production domain
4. Remove ngrok and update environment variables
5. Enable Twilio webhook signature validation for security
6. Set `NODE_ENV=production` in environment variables

## Future Enhancements

### Planned Migration to OpenAI Agents SDK

A migration plan (`migrate-openai-agent.md`) has been created to modernize the codebase using the `@openai/agents` SDK, which will provide:

- **60-70% code reduction** in WebSocket handling
- **Built-in error recovery** and reconnection logic
- **Tool calling capabilities** for extending bot functionality
- **Better performance** with SDK optimizations
- **Easier maintenance** with SDK updates

See `migrate-openai-agent.md` for the detailed migration strategy.

## Contributing

Contributions are welcome! Please ensure:

1. All code is written in TypeScript
2. Types are properly defined (no `any` types)
3. Code passes type checking: `npm run type-check`
4. Follow existing code style and patterns

## License

MIT License - See LICENSE file for details.