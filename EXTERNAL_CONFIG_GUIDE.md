# External Configuration System Guide

The voice bot now supports external configuration files, allowing you to completely customize the bot's behavior without modifying the source code.

## Quick Start

### 1. Create Configuration Directory
```bash
mkdir my-bot-config
cd my-bot-config
```

### 2. Create config.json
```json
{
  "app": {
    "name": "My Custom Assistant",
    "description": "Custom voice assistant for my business"
  },
  "bot": {
    "defaultLanguage": "english", 
    "supportedLanguages": ["english", "hindi"]
  },
  "persona": {
    "type": "my_assistant",
    "name": "Jordan",
    "role": "Customer Care Specialist", 
    "company": "My Business Inc",
    "tone": "friendly",
    "variables": {
      "businessHours": "9 AM to 5 PM",
      "website": "www.mybusiness.com"
    }
  }
}
```

### 3. Create Prompt Files
Create `english.prompt.txt`:
```
You are {{name}}, a {{role}} at {{company}}.

I'm here to help you with any questions about our services. 

Business hours: {{businessHours}}
Website: {{website}}

How can I assist you today?
```

### 4. Run the Application
```bash
CONFIG_DIR=/path/to/my-bot-config npm run dev
```

## Configuration Options

### App Settings
```json
{
  "app": {
    "name": "Your App Name",           // Required
    "description": "App description",   // Required 
    "version": "1.0.0"                 // Optional
  }
}
```

### Bot Settings
```json
{
  "bot": {
    "defaultLanguage": "english",                    // Required
    "supportedLanguages": ["english", "hindi"],     // Required array
    "voice": "alloy",                               // Optional - OpenAI voice (defaults to alloy)
    "model": "gpt-4o-realtime-preview",            // Optional - OpenAI model (defaults to gpt-4o-realtime-preview)
    "temperature": 0.8                             // Optional - 0.0 to 1.0 (defaults to 0.8)
  }
}
```

### Persona Settings
```json
{
  "persona": {
    "type": "unique_identifier",     // Required - unique ID
    "name": "Assistant Name",        // Required - bot's name
    "role": "Job Title",            // Required - bot's role
    "company": "Company Name",      // Required - company name
    "tone": "friendly",             // Required - communication style
    "variables": {                  // Optional - custom variables
      "key": "value"
    }
  }
}
```

### Advanced Settings (Optional)
```json
{
  "features": {
    "allowInterruption": true,    // Allow user to interrupt bot
    "enableLogging": true,        // Enable conversation logging
    "recordCalls": false,         // Record phone calls
    "maxCallDuration": 900        // Max call length in seconds
  }
}
```

**Note**: System-level configurations like Twilio webhook paths and OpenAI API settings are automatically configured with sensible defaults and don't need to be specified in external config files.

## Prompt Files

### File Naming Convention
- `{language}.prompt.txt` - General prompts for a language
- `{persona_type}.{language}.prompt.txt` - Persona-specific prompts

### Examples
- `english.prompt.txt` - English prompts
- `hindi.prompt.txt` - Hindi prompts
- `support_agent.english.prompt.txt` - English prompts for support agent
- `sales_rep.spanish.prompt.txt` - Spanish prompts for sales rep

### Variable Substitution
Use `{{variable}}` in prompt files:

```
You are {{name}}, a {{role}} at {{company}}.
Your communication style should be {{tone}}.
Contact us: {{supportEmail}} or call {{supportPhone}}.
```

Available built-in variables:
- `{{name}}` - Persona name
- `{{role}}` - Persona role
- `{{company}}` - Company name
- `{{tone}}` - Communication tone
- `{{appName}}` - Application name

Plus any custom variables from `persona.variables`

## Usage Examples

### Customer Support Bot
```json
{
  "app": {
    "name": "TechCorp Support Assistant",
    "description": "24/7 technical support automation"
  },
  "persona": {
    "type": "tech_support",
    "name": "Alex",
    "role": "Senior Technical Support Specialist",
    "company": "TechCorp Solutions",
    "tone": "helpful",
    "variables": {
      "department": "Technical Support",
      "ticketSystem": "ServiceNow",
      "escalationEmail": "escalation@techcorp.com"
    }
  }
}
```

### Sales Assistant
```json
{
  "app": {
    "name": "Sales Assistant Pro",
    "description": "Lead qualification and sales support"
  },
  "persona": {
    "type": "sales_rep",
    "name": "Sarah",
    "role": "Senior Sales Representative",
    "company": "SalesForce Pro",
    "tone": "enthusiastic",
    "variables": {
      "targetMarket": "Enterprise clients",
      "productLine": "CRM Solutions",
      "meetingScheduler": "calendly.com/sarah-sales"
    }
  }
}
```

### Healthcare Scheduler
```json
{
  "app": {
    "name": "MedCenter Scheduler",
    "description": "Medical appointment scheduling assistant"
  },
  "bot": {
    "defaultLanguage": "english",
    "supportedLanguages": ["english", "spanish"]
  },
  "persona": {
    "type": "medical_scheduler",
    "name": "Maria",
    "role": "Patient Coordinator",
    "company": "Central Medical Center",
    "tone": "professional",
    "variables": {
      "departments": "Cardiology, Dermatology, Internal Medicine",
      "hours": "Monday-Friday 8AM-6PM",
      "emergencyLine": "911 or call our emergency line at 555-URGENT"
    }
  }
}
```

## API Endpoints

### Check Configuration Status
```bash
GET /api/config-info
```
Returns information about current configuration source.

### Get Current Configuration
```bash
GET /api/config
```
Returns the active configuration.

### Reload Configuration (Development)
```bash
POST /api/reload-config
```
Clears configuration cache to reload changes.

## Environment Variables

### CONFIG_DIR
Set the path to your configuration directory:
```bash
export CONFIG_DIR="/path/to/your/config"
npm start
```

If not set, defaults to `./config-external`

### Other Variables
You can still use environment variables for sensitive data:
```bash
export OPENAI_API_KEY="your-key"
export TWILIO_ACCOUNT_SID="your-sid"
export TWILIO_AUTH_TOKEN="your-token"
export TWILIO_PHONE_NUMBER="+1234567890"
```

## Development Workflow

### 1. Create New Configuration
```bash
mkdir my-new-bot
cd my-new-bot

# Create config.json with your settings
# Create prompt files for each language
```

### 2. Test Configuration
```bash
CONFIG_DIR=$(pwd) npm run dev
```

### 3. Validate Setup
Check the console output for:
- ✅ Configuration loaded successfully
- 📝 Prompt files loaded
- No error messages

### 4. Test API Calls
```bash
# Test with specific language
curl -X POST http://localhost:3000/twilio-realtime/call \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "language": "hindi"}'
```

## Troubleshooting

### Configuration Not Loading
- Verify `config.json` exists in the specified directory
- Check JSON syntax is valid
- Ensure all required fields are present
- Check file permissions

### Prompt Files Missing
- Create at least `english.prompt.txt`
- Check file naming convention
- Verify files are in the same directory as `config.json`

### Variables Not Substituting
- Use `{{variableName}}` syntax (double braces)
- Ensure variables are defined in `persona.variables`
- Check spelling of variable names

### Fallback Behavior
If external config fails, the system falls back to built-in presets:
- Check console for error messages
- Verify file paths and permissions
- Test with minimal configuration first

## Production Deployment

### 1. Prepare Configuration
```bash
# Create production config directory
mkdir /opt/voice-bot/config

# Copy your config files
cp config.json /opt/voice-bot/config/
cp *.prompt.txt /opt/voice-bot/config/
```

### 2. Set Environment Variables
```bash
export CONFIG_DIR="/opt/voice-bot/config"
export NODE_ENV="production"
```

### 3. Build and Deploy
```bash
npm run build
npm start
```

## Best Practices

1. **Version Control**: Keep configuration files in git
2. **Testing**: Test configurations in development first  
3. **Backup**: Keep backups of working configurations
4. **Validation**: Use the API endpoints to verify configuration
5. **Security**: Don't store API keys in config files - use environment variables
6. **Documentation**: Document custom variables and their usage
7. **Monitoring**: Monitor logs for configuration-related errors

This system provides complete flexibility while maintaining the stability of fallback to built-in configurations.