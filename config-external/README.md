# External Configuration System

This directory contains external configuration files that override the built-in application settings. This approach provides maximum flexibility for customizing the voice bot without modifying the source code.

## Configuration Structure

### Required Files

#### `config.json`
The main configuration file containing all bot settings:

```json
{
  "app": {
    "name": "Your App Name",
    "description": "App description",
    "version": "1.0.0"
  },
  "bot": {
    "defaultLanguage": "english",
    "supportedLanguages": ["english", "hindi", "spanish"]
  },
  "persona": {
    "type": "your_bot_type",
    "name": "Bot Name",
    "role": "Bot Role",
    "company": "Your Company",
    "tone": "friendly",
    "variables": {
      "custom_variable": "custom_value"
    }
  }
}
```

#### Prompt Files

Create prompt files for each supported language:
- `english.prompt.txt` - English prompts
- `hindi.prompt.txt` - Hindi prompts
- `spanish.prompt.txt` - Spanish prompts (if supported)

You can also create persona-specific prompts:
- `your_bot_type.english.prompt.txt` - English prompts for specific persona
- `your_bot_type.hindi.prompt.txt` - Hindi prompts for specific persona

## Variable Substitution

In prompt files, use `{{variable}}` syntax for dynamic content:

```
You are {{name}}, a {{role}} at {{company}}.
Your department: {{department}}
Support hours: {{supportHours}}
```

Available variables:
- `{{name}}` - Persona name
- `{{role}}` - Persona role  
- `{{company}}` - Company name
- `{{tone}}` - Communication tone
- `{{appName}}` - Application name
- Any custom variables from `persona.variables`

## Usage

### Environment Variable
Set the configuration directory path:
```bash
export CONFIG_DIR=/path/to/your/config
```

If not set, defaults to `./config-external`

### File Loading Priority
1. `{persona}.{language}.prompt.txt` (most specific)
2. `{language}.prompt.txt` (language-specific)
3. `{persona}.english.prompt.txt` (persona fallback)
4. `english.prompt.txt` (ultimate fallback)

## Example Configurations

### Customer Support Bot
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
      "escalation_email": "escalation@techcorp.com"
    }
  }
}
```

### Sales Assistant  
```json
{
  "app": {
    "name": "Sales Assistant",
    "description": "Lead qualification and sales support"
  },
  "persona": {
    "type": "sales_rep",
    "name": "Mike",
    "role": "Sales Representative", 
    "company": "SalesCorp",
    "tone": "enthusiastic",
    "variables": {
      "quota_period": "quarterly",
      "product_focus": "Enterprise Solutions"
    }
  }
}
```

## Validation

The system validates:
- All required fields are present
- `supportedLanguages` is a non-empty array
- `defaultLanguage` is in `supportedLanguages`
- Configuration JSON is valid

## Hot Reloading

Configuration is cached for performance. To reload changes during development, restart the application or implement a cache-clearing endpoint.

## Fallback Behavior

If external configuration fails to load, the system falls back to built-in configuration presets to ensure the application continues running.

## Best Practices

1. **Version Control**: Keep configuration files in version control
2. **Validation**: Test configuration changes in development first
3. **Backup**: Keep backups of working configurations
4. **Documentation**: Document custom variables and their purposes
5. **Security**: Don't store sensitive information in config files (use environment variables for secrets)

## Troubleshooting

- Check file permissions on configuration directory
- Validate JSON syntax in `config.json`
- Ensure all required fields are present
- Check that prompt files exist for supported languages
- Verify `CONFIG_DIR` environment variable if using custom path