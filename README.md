# Voice Bot - External Configuration System

A TypeScript-based voice bot application that makes outbound phone calls using Twilio and OpenAI's GPT-4o Realtime Preview model. The bot features a flexible **external configuration system** that allows complete customization without code changes.

## Features

- **WebRTC Browser Calls**: Direct voice chat through your browser with microphone access
- **Twilio Phone Calls**: Make outbound calls to any phone number  
- **External Configuration**: Complete bot customization via external config files
- **Multi-Language Support**: Configurable language support with custom prompts
- **Template System**: Dynamic prompt templates with variable substitution
- **Multiple Personas**: Support for different bot personas (debt collection, customer support, sales, etc.)
- **Bidirectional Audio**: Real-time voice conversation with natural interruption handling
- **OpenAI Realtime API**: Powered by GPT-4o Realtime Preview model
- **TypeScript**: Fully typed codebase with strict type checking

## Prerequisites

- Node.js 18.0.0 or higher
- **OpenAI API Key** with access to the Realtime API
- **Twilio Account** with:
  - Account SID
  - Auth Token
  - Phone number capable of making outbound calls
- **ngrok** or similar tunneling service for local development

## Quick Start

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

# External Configuration (Optional)
CONFIG_DIR=/path/to/your/config  # Defaults to ./config-external
```

### 3. Create External Configuration (Recommended)

The application includes a sample configuration in `config-external/`:

```bash
# Use the included example
CONFIG_DIR=config-external npm run dev
```

Or create your own configuration directory:

```bash
mkdir my-bot-config
cd my-bot-config

# Create config.json
cat > config.json << EOF
{
  "app": {
    "name": "My Custom Bot",
    "description": "Custom voice assistant"
  },
  "bot": {
    "defaultLanguage": "english",
    "supportedLanguages": ["english", "hindi"]
  },
  "persona": {
    "type": "customer_support",
    "name": "Assistant",
    "role": "Customer Support Agent", 
    "company": "My Company",
    "tone": "friendly",
    "variables": {
      "department": "Customer Service",
      "hours": "9 AM to 5 PM"
    }
  }
}
EOF

# Create english.prompt.txt
cat > english.prompt.txt << EOF
You are {{name}}, a {{role}} at {{company}}.

I work in the {{department}} department and our hours are {{hours}}.
I'm here to help you with any questions or concerns.

How can I assist you today?
EOF
```

### 4. Start ngrok (For Local Development)

```bash
ngrok http 3000
```

### 5. Configure Twilio Webhooks

In [Twilio Console](https://console.twilio.com):

1. **Phone Number Configuration**:
   - Webhook URL: `https://your-ngrok-url.ngrok-free.app/twilio-realtime/answer`
   - HTTP Method: `POST`

2. **Status Callbacks** (optional):
   - Status Callback URL: `https://your-ngrok-url.ngrok-free.app/twilio-realtime/status`

### 6. Run the Application

```bash
# Development with external config
CONFIG_DIR=my-bot-config npm run dev

# Or use default config-external directory
npm run dev
```

## External Configuration System

### Configuration Structure

#### Required: `config.json`
```json
{
  "app": {
    "name": "Your App Name",
    "description": "App description",
    "version": "1.0.0"
  },
  "bot": {
    "defaultLanguage": "english",
    "supportedLanguages": ["english", "hindi"]
  },
  "persona": {
    "type": "unique_identifier", 
    "name": "Bot Name",
    "role": "Bot Role",
    "company": "Company Name",
    "tone": "friendly",
    "variables": {
      "customVariable": "value"
    }
  },
  "features": {
    "allowInterruption": true,
    "enableLogging": true,
    "recordCalls": false,
    "maxCallDuration": 600
  }
}
```

#### Required: Prompt Files
Create prompt files for each supported language:
- `english.prompt.txt`
- `hindi.prompt.txt`
- `spanish.prompt.txt` (if supported)

#### Template Variables in Prompts
Use `{{variable}}` syntax in prompt files:

```
You are {{name}}, a {{role}} at {{company}}.
Your tone should be {{tone}}.
Department: {{department}}
Support hours: {{supportHours}}
```

Available variables:
- `{{name}}` - Persona name
- `{{role}}` - Persona role
- `{{company}}` - Company name
- `{{tone}}` - Communication tone
- `{{appName}}` - Application name
- Any variables from `persona.variables`

### Configuration Examples

#### Customer Support Bot
```json
{
  "app": {
    "name": "Support Assistant",
    "description": "24/7 customer support automation"
  },
  "persona": {
    "type": "support_agent",
    "name": "Sarah",
    "role": "Senior Support Specialist",
    "company": "TechCorp",
    "tone": "empathetic",
    "variables": {
      "department": "Technical Support",
      "escalationEmail": "escalation@techcorp.com"
    }
  }
}
```

#### Debt Collection Agent
```json
{
  "app": {
    "name": "Collection Assistant", 
    "description": "NBFC debt collection automation"
  },
  "persona": {
    "type": "debt_collection_agent",
    "name": "Collection Agent",
    "role": "Collection Agent",
    "company": "Fibe NBFC",
    "tone": "professional",
    "variables": {
      "customerName": "John Doe",
      "loanAmount": "$50,000",
      "outstandingAmount": "$25,000"
    }
  }
}
```

## Usage

### API Endpoints

#### Configuration Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Get current active configuration |
| `GET` | `/api/config-info` | Get configuration source info |
| `GET` | `/api/personas` | List available personas |
| `POST` | `/api/reload-config` | Reload configuration cache |

#### Voice Communication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/rtc` | Create WebRTC connection |
| `POST` | `/twilio-realtime/call` | Initiate phone call |
| `WebSocket` | `/twilio-realtime/media-stream` | Audio streaming |

### Making Phone Calls

```javascript
// Phone call with language selection
POST /twilio-realtime/call
{
  "phoneNumber": "+1234567890",
  "language": "hindi"  // Uses hindi.prompt.txt
}

// WebRTC call with language header
POST /rtc
Headers: {
  "x-language": "english"
}
```

### Web Interface

Navigate to `http://localhost:3000`:

1. **Browser Voice Chat**: Click "Start Voice Chat" for WebRTC calls
2. **Phone Calls**: Enter phone number and click "Start Call"

## Project Structure

```
node-impl/
├── server.ts                    # Main Express server
├── config/
│   ├── app.config.ts           # Configuration management
│   └── external-config-loader.ts # External config loader
├── routes/
│   ├── twilio-realtime.ts      # Twilio integration
│   ├── rtc.ts                  # WebRTC handler
│   └── utils.ts                # Utility functions
├── types/
│   ├── index.ts                # Core type definitions
│   ├── config.ts               # Configuration types
│   └── external-config.ts      # External config types
├── config-external/             # Example external configuration
│   ├── config.json             # Sample configuration
│   ├── english.prompt.txt      # English prompts
│   └── hindi.prompt.txt        # Hindi prompts
├── public/                     # Web interface files
├── dist/                       # Compiled JavaScript
├── EXTERNAL_CONFIG_GUIDE.md    # Detailed config documentation
└── README.md                   # This file
```

## Development

### Scripts
```bash
npm run dev          # Development with hot reload
npm run build        # Compile TypeScript
npm run type-check   # Type checking only
npm start           # Run compiled code
```

### Configuration Development
```bash
# Test with custom config
CONFIG_DIR=/path/to/config npm run dev

# Test config loading
curl http://localhost:3000/api/config-info

# Reload config during development
curl -X POST http://localhost:3000/api/reload-config
```

## Advanced Configuration

### Multi-Language Setup
Create language-specific prompt files:
- `english.prompt.txt`
- `hindi.prompt.txt`
- `spanish.prompt.txt`

### Persona-Specific Prompts
Create persona-specific prompts:
- `support_agent.english.prompt.txt`
- `sales_rep.spanish.prompt.txt`

File loading priority:
1. `{persona}.{language}.prompt.txt` (most specific)
2. `{language}.prompt.txt` (language fallback)
3. `english.prompt.txt` (ultimate fallback)

### Configuration Validation

The system validates:
- Required fields are present
- `supportedLanguages` is a non-empty array
- `defaultLanguage` is in `supportedLanguages`
- JSON syntax is valid

## Troubleshooting

### Configuration Issues
- Check JSON syntax in `config.json`
- Ensure all required fields are present
- Verify prompt files exist for supported languages
- Check `CONFIG_DIR` environment variable

### Common Errors
1. **"Required configuration field missing"**: Add missing fields to config.json
2. **"Configuration file not found"**: Check `CONFIG_DIR` path
3. **"Failed to parse config.json"**: Validate JSON syntax
4. **Prompt files not loading**: Ensure correct file naming

### Debugging
```bash
# Check configuration status
curl http://localhost:3000/api/config-info

# View active configuration
curl http://localhost:3000/api/config | jq .

# Reload configuration
curl -X POST http://localhost:3000/api/reload-config
```

## Production Deployment

1. Create production configuration directory
2. Set `CONFIG_DIR` environment variable
3. Build and deploy: `npm run build && npm start`
4. Update Twilio webhooks to production URLs
5. Configure HTTPS and security headers

## Documentation

- **[External Configuration Guide](EXTERNAL_CONFIG_GUIDE.md)**: Complete configuration documentation
- **[Migration Plan](migrate-openai-agent.md)**: Future OpenAI Agents SDK migration

## Contributing

1. Write TypeScript code with proper types
2. Test configuration changes
3. Update documentation for new features
4. Follow existing code patterns

## License

MIT License - See LICENSE file for details.