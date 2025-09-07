# Migration Plan: OpenAI Agents SDK Integration

## Overview
This document outlines the technical migration plan for replacing manual WebSocket and session management with the @openai/agents SDK in our voice bot implementation.

## Current Architecture Analysis

### Components to Replace
1. **Manual WebSocket Management** (`routes/twilio-realtime.js`)
   - Direct WebSocket connection to OpenAI Realtime API
   - Manual message parsing and error handling
   - Custom reconnection logic

2. **Session Configuration** (`routes/utils.js`)
   - File-based prompt management
   - Manual session object construction
   - Language switching via file system

3. **Audio Stream Handling** (`routes/twilio-realtime.js`)
   - Manual audio buffer management
   - Custom interruption detection
   - Mark queue for playback tracking

## Migration Strategy

### Phase 1: Setup and Dependencies

#### 1.1 Install OpenAI Agents SDK
```bash
npm install @openai/agents
```

#### 1.2 Environment Configuration
- Keep existing `OPENAI_API_KEY` in `.env`
- Add new configuration variables:
  ```env
  OPENAI_AGENT_MODEL=gpt-4o-realtime-preview
  OPENAI_AGENT_VOICE=alloy
  OPENAI_AGENT_TEMPERATURE=0.8
  ```

#### 1.3 Create Agent Configuration Module
```javascript
// config/agent-config.js
export const agentConfig = {
  model: process.env.OPENAI_AGENT_MODEL,
  voice: process.env.OPENAI_AGENT_VOICE,
  temperature: parseFloat(process.env.OPENAI_AGENT_TEMPERATURE),
  audioFormat: 'pcmu',
  turnDetection: 'server_vad'
};
```

### Phase 2: Agent Implementation

#### 2.1 Create Agent Factory
```javascript
// services/agent-factory.js
import { Agent } from '@openai/agents';

class AgentFactory {
  constructor() {
    this.agents = new Map();
  }

  createAgent(callSid, language) {
    const agent = new Agent({
      apiKey: process.env.OPENAI_API_KEY,
      model: agentConfig.model,
      voice: agentConfig.voice,
      language: language,
      audioConfig: {
        input: {
          format: 'pcmu',
          sampleRate: 8000,
          channels: 1
        },
        output: {
          format: 'pcmu',
          sampleRate: 8000,
          channels: 1
        }
      }
    });
    
    this.agents.set(callSid, agent);
    return agent;
  }

  getAgent(callSid) {
    return this.agents.get(callSid);
  }

  destroyAgent(callSid) {
    const agent = this.agents.get(callSid);
    if (agent) {
      agent.disconnect();
      this.agents.delete(callSid);
    }
  }
}
```

#### 2.2 Replace WebSocket Handler
```javascript
// routes/twilio-realtime-v2.js
import { AgentFactory } from '../services/agent-factory.js';

const agentFactory = new AgentFactory();

export const mediaStreamWebSocketHandler = async (ws, req) => {
  let agent = null;
  let callSid = null;

  ws.on('message', async (message) => {
    const data = JSON.parse(message);

    switch (data.event) {
      case 'start':
        callSid = data.start.callSid;
        const language = callMetadata.get(callSid)?.language || 'hindi';
        
        // Create agent instead of WebSocket
        agent = agentFactory.createAgent(callSid, language);
        
        // Set up agent event listeners
        agent.on('audio', (audioData) => {
          ws.send(JSON.stringify({
            event: 'media',
            streamSid: data.start.streamSid,
            media: { payload: audioData }
          }));
        });

        agent.on('interruption', () => {
          ws.send(JSON.stringify({
            event: 'clear',
            streamSid: data.start.streamSid
          }));
        });

        await agent.connect();
        await agent.startConversation();
        break;

      case 'media':
        if (agent) {
          await agent.processAudio(data.media.payload);
        }
        break;

      case 'stop':
        if (agent) {
          agentFactory.destroyAgent(callSid);
        }
        break;
    }
  });
};
```

### Phase 3: Enhanced Features

#### 3.1 Dynamic Prompt Management
```javascript
// services/prompt-manager.js
import { PromptTemplate } from '@openai/agents';

class PromptManager {
  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  initializeTemplates() {
    // Hindi template
    this.templates.set('hindi', new PromptTemplate({
      role: 'system',
      content: `आप एक सहायक हैं...`,
      variables: ['userName', 'context']
    }));

    // Kannada template
    this.templates.set('kannada', new PromptTemplate({
      role: 'system',
      content: `ನೀವು ಸಹಾಯಕರು...`,
      variables: ['userName', 'context']
    }));

    // Telugu template
    this.templates.set('telugu', new PromptTemplate({
      role: 'system',
      content: `మీరు సహాయకుడు...`,
      variables: ['userName', 'context']
    }));
  }

  getPrompt(language, variables = {}) {
    const template = this.templates.get(language) || this.templates.get('hindi');
    return template.render(variables);
  }
}
```

#### 3.2 Tool Integration
```javascript
// tools/index.js
import { Tool } from '@openai/agents';

export const weatherTool = new Tool({
  name: 'get_weather',
  description: 'Get weather information for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string' },
      unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
    },
    required: ['location']
  },
  handler: async ({ location, unit = 'celsius' }) => {
    // Implement weather API call
    return { temperature: 25, condition: 'sunny' };
  }
});

export const databaseTool = new Tool({
  name: 'query_database',
  description: 'Query user information from database',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      query: { type: 'string' }
    },
    required: ['userId']
  },
  handler: async ({ userId, query }) => {
    // Implement database query
    return { result: 'User data' };
  }
});
```

#### 3.3 Enhanced Agent with Tools
```javascript
// services/enhanced-agent-factory.js
import { Agent } from '@openai/agents';
import { weatherTool, databaseTool } from '../tools/index.js';
import { PromptManager } from './prompt-manager.js';

class EnhancedAgentFactory {
  constructor() {
    this.agents = new Map();
    this.promptManager = new PromptManager();
  }

  createAgent(callSid, language, phoneNumber) {
    const agent = new Agent({
      apiKey: process.env.OPENAI_API_KEY,
      model: agentConfig.model,
      instructions: this.promptManager.getPrompt(language, {
        userName: phoneNumber,
        context: 'phone_call'
      }),
      tools: [weatherTool, databaseTool],
      toolChoice: 'auto',
      parallel_tool_calls: true
    });

    // Add conversation memory
    agent.setMemory({
      type: 'buffer',
      maxTokens: 2000
    });

    // Add custom middleware
    agent.use(async (context, next) => {
      console.log(`Processing: ${context.type}`);
      await next();
    });

    this.agents.set(callSid, agent);
    return agent;
  }
}
```

### Phase 4: Migration Steps

#### 4.1 Parallel Implementation
1. Create new route file `twilio-realtime-v2.js` alongside existing
2. Implement agent-based handlers without removing old code
3. Add feature flag for gradual rollout:
   ```javascript
   const USE_AGENT_SDK = process.env.USE_AGENT_SDK === 'true';
   ```

#### 4.2 Testing Strategy
1. **Unit Tests**: Test agent factory, prompt manager, tools
2. **Integration Tests**: Test Twilio webhook integration
3. **Load Tests**: Compare performance metrics
4. **A/B Testing**: Route percentage of calls to new implementation

#### 4.3 Rollout Plan
1. **Week 1**: Deploy parallel implementation to staging
2. **Week 2**: Route 10% traffic to new implementation
3. **Week 3**: Increase to 50% if metrics are positive
4. **Week 4**: Full migration and cleanup

### Phase 5: Cleanup and Optimization

#### 5.1 Remove Legacy Code
- Delete manual WebSocket handling
- Remove file-based prompt system
- Clean up utils.js session management

#### 5.2 Performance Optimizations
```javascript
// Implement connection pooling
class AgentPool {
  constructor(maxSize = 10) {
    this.pool = [];
    this.maxSize = maxSize;
  }

  async getAgent() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return new Agent(agentConfig);
  }

  releaseAgent(agent) {
    if (this.pool.length < this.maxSize) {
      agent.reset();
      this.pool.push(agent);
    } else {
      agent.disconnect();
    }
  }
}
```

#### 5.3 Monitoring and Observability
```javascript
// Add comprehensive logging
agent.on('conversation_start', (data) => {
  metrics.increment('agent.conversation.started');
  logger.info('Conversation started', { callSid, language });
});

agent.on('tool_call', (tool, params, result) => {
  metrics.increment(`agent.tool.${tool.name}`);
  logger.info('Tool called', { tool: tool.name, params, result });
});

agent.on('error', (error) => {
  metrics.increment('agent.error');
  logger.error('Agent error', { error, callSid });
});
```

## Benefits Summary

### Immediate Benefits
- **60-70% code reduction** in WebSocket handling
- **Built-in error recovery** and reconnection logic
- **Type safety** with TypeScript support
- **Automatic audio format handling**

### Long-term Benefits
- **Easier maintenance** with SDK updates
- **Tool ecosystem** for extending functionality
- **Better debugging** with SDK-provided tools
- **Performance optimizations** from SDK team
- **Community support** and examples

## Risk Mitigation

### Potential Risks
1. **SDK bugs or limitations**: Maintain ability to rollback
2. **Performance differences**: Monitor latency metrics
3. **Feature gaps**: Identify custom features that need preservation

### Mitigation Strategies
1. **Gradual rollout** with feature flags
2. **Comprehensive monitoring** before/after metrics
3. **Fallback mechanism** to legacy implementation
4. **Regular SDK updates** and testing

## Timeline

- **Week 1**: Environment setup, dependency installation
- **Week 2**: Basic agent implementation
- **Week 3**: Tool integration and enhanced features
- **Week 4**: Testing and validation
- **Week 5**: Staged rollout begins
- **Week 6-8**: Progressive traffic migration
- **Week 9**: Cleanup and optimization
- **Week 10**: Documentation and knowledge transfer

## Success Metrics

1. **Latency**: < 100ms increase in response time
2. **Reliability**: > 99.9% uptime maintained
3. **Error Rate**: < 0.1% call failure rate
4. **Code Metrics**: 60%+ reduction in lines of code
5. **Developer Velocity**: 50% faster feature implementation

## Conclusion

The migration to @openai/agents SDK represents a significant improvement in code maintainability, reliability, and feature velocity. The phased approach ensures minimal risk while maximizing the benefits of the SDK's capabilities.