# Configuration Examples

This directory contains example configuration files for different use cases of the voice bot application.

## Available Examples

### 1. Fibe Collection Agent (`fibe-collection.env`)
Configuration for a loan collection agent at Fibe NBFC:
- **Language**: Hindi (default)
- **Persona**: Professional loan recovery specialist
- **Features**: Call recording enabled, longer call duration
- **Use Case**: Automated loan collection calls

### 2. Customer Support (`customer-support.env`)
Configuration for technical customer support:
- **Language**: English (default)
- **Persona**: Empathetic support specialist
- **Features**: Extended call duration for troubleshooting
- **Use Case**: Technical support and issue resolution

### 3. Generic Assistant (`.env.example`)
Basic configuration for general-purpose assistance:
- **Language**: English (default)
- **Persona**: Friendly virtual assistant
- **Features**: Standard settings for general queries
- **Use Case**: General customer service and information

## Usage Instructions

1. **Choose Your Configuration**: Select the example that best matches your use case
2. **Copy to Root**: Copy the chosen file to the project root as `.env`
3. **Fill Credentials**: Replace placeholder values with your actual API keys and credentials
4. **Customize**: Modify any settings to match your specific requirements

## Switching Between Personas

You can switch personas in three ways:

### 1. Environment Variables
Set `BOT_PERSONA_TYPE` in your `.env` file:
```bash
BOT_PERSONA_TYPE=customer_support
```

### 2. API Request (Twilio Calls)
Include `personaType` in your call request:
```json
{
  "phoneNumber": "+1234567890",
  "language": "english", 
  "personaType": "sales_assistant"
}
```

### 3. Headers (WebRTC Calls)
Add the `x-persona` header:
```
x-persona: appointment_scheduler
x-language: kannada
```

## Available Personas

- `generic_assistant` - General purpose virtual assistant
- `fibe_collection_agent` - Loan collection specialist for Fibe NBFC
- `customer_support` - Technical support specialist
- `sales_assistant` - Sales representative
- `appointment_scheduler` - Appointment coordination specialist

## Supported Languages

- `english` - English
- `hindi` - हिंदी
- `kannada` - ಕನ್ನಡ
- `telugu` - తెలుగు

## Custom Configuration

To create your own persona configuration:

1. Define your persona in `config/app.config.ts`
2. Add corresponding prompt templates in `prompts/templates/`
3. Set environment variables or use API parameters to activate it

For detailed configuration options, see the main README.md file.