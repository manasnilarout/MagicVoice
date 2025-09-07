# Twilio Voice Bot - Hindi Collection Agent

A voice bot application that makes outbound phone calls using Twilio and OpenAI's GPT-4o Realtime Preview model. The bot is configured as a Hindi-speaking collection agent for Fibe NBFC.

## Features

- **WebRTC Browser Calls**: Direct voice chat through your browser with microphone access
- **Twilio Phone Calls**: Make outbound calls to any phone number
- **Bidirectional Audio**: Real-time voice conversation with natural interruption handling
- **Hindi Language**: Configured to speak only in Hindi as a collection agent
- **OpenAI Realtime API**: Powered by GPT-4o Realtime Preview model
- **Dual Interface**: Single web page supports both WebRTC and phone calls

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

### 5. Run the Application

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
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
├── server.js                    # Main Express server
├── routes/
│   ├── twilio-realtime.js      # Twilio integration with OpenAI Realtime API
│   ├── twilio-utils.js         # Twilio client utilities
│   ├── rtc.js                  # WebRTC route handler for browser calls
│   ├── observer.js             # WebRTC session monitoring
│   └── utils.js                # Bot configuration and session management  
├── public/
│   ├── index.html              # Main interface (WebRTC + Twilio)
│   └── index-twilio.html       # Legacy Twilio-only interface
├── package.json                # Dependencies and scripts
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Bot Configuration

The bot is configured as a **Fibe NBFC collection agent** with these characteristics:

- **Language**: Hindi only
- **Role**: Loan recovery agent
- **Customer**: Manoj Kumar  
- **Loan Details**: ₹1,00,000 loan with ₹10,000 monthly EMI
- **Tone**: Professional and polite
- **Voice**: Alloy voice for natural Hindi pronunciation

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

4. **Bot doesn't speak Hindi**
   - The bot instructions are configured in Hindi in `utils.js`
   - Check console logs for any session configuration errors

### Development Tips:

- Use `npm run dev` for auto-reload during development
- Check browser console and server logs for detailed error messages
- Test webhook endpoints manually by visiting them in browser
- Update Twilio webhook URLs whenever ngrok restarts

## Production Deployment

For production deployment:

1. Deploy to a service with HTTPS (Heroku, Railway, etc.)
2. Update Twilio webhook URLs to use your production domain
3. Remove ngrok and update environment variables
4. Enable Twilio webhook signature validation for security

## License

MIT License - See LICENSE file for details.