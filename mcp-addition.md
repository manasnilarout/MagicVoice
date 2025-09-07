# MCP Server Addition Plan
## Hindi Voice Bot - Model Context Protocol Integration

### Overview
This document outlines the plan to integrate MCP (Model Context Protocol) server functionality into the existing Hindi Voice Bot application. The MCP server will enable the bot to access external tools and resources dynamically during voice conversations.

---

## Current Architecture Analysis

### Existing Components
- **WebRTC Voice Chat**: Browser-based real-time voice interaction
- **Twilio Phone Calls**: Outbound phone calls with bidirectional audio
- **OpenAI Realtime API**: GPT-4o Realtime Preview model integration
- **Hindi Collection Agent**: Specialized for Fibe NBFC loan recovery

### Current Data Flow
```
Browser/Phone → Express Server → OpenAI Realtime API → Voice Response
```

### Existing Files Structure
```
node-impl/
├── server.js                    # Main Express server
├── routes/
│   ├── twilio-realtime.js      # Twilio + OpenAI integration
│   ├── rtc.js                  # WebRTC handler
│   ├── observer.js             # WebRTC monitoring
│   ├── twilio-utils.js         # Twilio utilities
│   └── utils.js                # Bot configuration
└── public/
    └── index.html              # Unified interface
```

---

## MCP Server Integration Plan

### Phase 1: MCP Server Foundation (Week 1)

#### 1.1 MCP Server Setup
- **New Files to Create:**
  - `mcp/server.js` - Main MCP server implementation
  - `mcp/tools/` - Directory for MCP tools
  - `mcp/resources/` - Directory for MCP resources
  - `mcp/prompts/` - Directory for MCP prompts

#### 1.2 Core MCP Implementation
```javascript
// mcp/server.js structure
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

class VoiceBotMCPServer {
  constructor() {
    this.server = new Server({
      name: "hindi-voice-bot",
      version: "1.0.0"
    });
    this.setupTools();
    this.setupResources();
    this.setupPrompts();
  }
}
```

#### 1.3 Initial Tool Categories
1. **Customer Data Tools**
   - `get_customer_info` - Retrieve customer loan details
   - `update_payment_status` - Update payment records
   - `get_payment_history` - Fetch payment history

2. **Communication Tools**
   - `send_sms` - Send SMS reminders
   - `schedule_callback` - Schedule follow-up calls
   - `create_payment_link` - Generate payment links

3. **System Tools**
   - `log_conversation` - Log call details
   - `escalate_case` - Escalate to human agent
   - `get_business_hours` - Check operating hours

### Phase 2: Voice Bot Integration (Week 2)

#### 2.1 OpenAI Realtime Integration
- **Modify `routes/utils.js`:**
  - Add MCP tool definitions to session instructions
  - Configure function calling capabilities
  - Add tool response handling

- **Enhanced Session Configuration:**
```javascript
const sessionUpdate = {
  type: 'session.update',
  session: {
    // ... existing config
    tools: await mcpServer.getAvailableTools(),
    tool_choice: "auto"
  }
};
```

#### 2.2 Real-time Tool Execution
- **Modify `routes/twilio-realtime.js`:**
  - Add function call detection in OpenAI responses
  - Implement MCP tool execution middleware
  - Handle tool results and continue conversation

- **Tool Execution Flow:**
```javascript
// In OpenAI message handler
if (response.type === 'response.function_call_delta') {
  // Buffer function call data
}

if (response.type === 'response.function_call.done') {
  const result = await mcpServer.executeTool(functionCall);
  // Send result back to OpenAI
}
```

### Phase 3: Context-Aware Features (Week 3)

#### 3.1 Dynamic Context Loading
- **Customer Context Resources:**
  - Load customer data based on phone number
  - Fetch recent payment history
  - Get loan agreement details

#### 3.2 Conversation Memory
- **Persistent Context:**
  - Store conversation state in MCP resources
  - Maintain call history across sessions
  - Track payment commitments made during calls

#### 3.3 Smart Prompting
- **Dynamic Prompt Templates:**
  - Adjust conversation style based on customer profile
  - Use different approaches for different default stages
  - Personalize based on previous interactions

### Phase 4: External Integrations (Week 4)

#### 4.1 Database Integration
- **Customer Database Tools:**
  - MongoDB/PostgreSQL connection
  - Customer information CRUD operations
  - Payment status updates

#### 4.2 Payment Gateway Integration
- **Payment Tools:**
  - Razorpay/Stripe integration
  - Generate secure payment links
  - Verify payment completion

#### 4.3 CRM Integration
- **CRM Tools:**
  - Salesforce/HubSpot connection
  - Create leads and opportunities
  - Update customer interaction logs

---

## Technical Implementation Details

### MCP Server Architecture

#### Tool Implementation Pattern
```javascript
// mcp/tools/customer-tools.js
export class CustomerTools {
  async getCustomerInfo(phoneNumber) {
    // Query customer database
    return {
      name: "Manoj Kumar",
      loanAmount: 100000,
      outstandingAmount: 80000,
      // ... other details
    };
  }

  async updatePaymentStatus(customerId, amount, date) {
    // Update payment in database
    return { success: true, transactionId: "TXN123" };
  }
}
```

#### Resource Implementation Pattern
```javascript
// mcp/resources/customer-resources.js
export class CustomerResources {
  async getResource(uri) {
    const [, customerId] = uri.match(/customer:\/\/(\d+)/);
    return await this.fetchCustomerData(customerId);
  }
}
```

### Integration Points

#### 1. OpenAI Function Calling
- Configure OpenAI Realtime API to support function calls
- Map MCP tools to OpenAI function schemas
- Handle streaming function call responses

#### 2. Real-time Tool Execution
- Execute MCP tools during live conversations
- Handle async operations without breaking call flow
- Provide fallback responses for tool failures

#### 3. Context Injection
- Inject customer context at call start
- Update context based on conversation progress
- Maintain context across call transfers

---

## File Structure After MCP Addition

```
node-impl/
├── server.js                    # Enhanced with MCP integration
├── mcp/
│   ├── server.js               # MCP server implementation
│   ├── tools/
│   │   ├── customer-tools.js   # Customer data operations
│   │   ├── payment-tools.js    # Payment processing tools
│   │   ├── communication-tools.js # SMS, email tools
│   │   └── system-tools.js     # Logging, escalation tools
│   ├── resources/
│   │   ├── customer-resources.js # Customer data resources
│   │   ├── loan-resources.js   # Loan information resources
│   │   └── template-resources.js # Conversation templates
│   ├── prompts/
│   │   ├── collection-prompts.js # Collection conversation prompts
│   │   └── escalation-prompts.js # Escalation handling prompts
│   └── utils/
│       ├── database.js         # Database connection utilities
│       ├── validation.js       # Input validation helpers
│       └── logging.js          # MCP operation logging
├── routes/
│   ├── twilio-realtime.js      # Enhanced with MCP integration
│   ├── rtc.js                  # Enhanced with MCP integration
│   ├── observer.js             # Enhanced with MCP monitoring
│   ├── mcp-api.js              # MCP management API
│   ├── twilio-utils.js         # (Existing)
│   └── utils.js                # Enhanced with MCP config
├── config/
│   ├── mcp-config.js           # MCP server configuration
│   └── database-config.js      # Database connection config
└── public/
    ├── index.html              # Enhanced with MCP management UI
    └── mcp-dashboard.html      # MCP tools monitoring interface
```

---

## Dependencies to Add

### Core MCP Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0",
    "mongodb": "^6.0.0",
    "pg": "^8.11.0",
    "axios": "^1.6.0",
    "jsonschema": "^1.4.1"
  }
}
```

### Additional Tools
- **Database**: MongoDB or PostgreSQL client
- **Validation**: Zod for input validation
- **HTTP Client**: Axios for external API calls
- **Caching**: Redis for conversation state
- **Monitoring**: Winston for enhanced logging

---

## Environment Variables to Add

```env
# MCP Server Configuration
MCP_SERVER_NAME=hindi-voice-bot-mcp
MCP_SERVER_VERSION=1.0.0
MCP_LOG_LEVEL=info

# Database Configuration
DATABASE_URL=mongodb://localhost:27017/voicebot
POSTGRES_URL=postgresql://user:pass@localhost:5432/voicebot

# External Service APIs
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
SMS_API_KEY=xxxxx
CRM_API_KEY=xxxxx

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379
```

---

## Implementation Phases Timeline

### Week 1: Foundation
- [ ] Set up MCP server basic structure
- [ ] Implement core customer tools
- [ ] Create basic resource handlers
- [ ] Add MCP dependencies

### Week 2: Integration
- [ ] Integrate MCP with OpenAI Realtime API
- [ ] Add function calling to voice conversations
- [ ] Implement tool execution middleware
- [ ] Test basic tool operations

### Week 3: Advanced Features
- [ ] Add dynamic context loading
- [ ] Implement conversation memory
- [ ] Create smart prompting system
- [ ] Add call state management

### Week 4: External Services
- [ ] Integrate database operations
- [ ] Add payment gateway tools
- [ ] Implement CRM integration
- [ ] Add monitoring dashboard

---

## Benefits of MCP Integration

### 1. Dynamic Tool Access
- Bot can access real customer data during calls
- Process payments in real-time
- Update records based on conversation outcomes

### 2. Context Awareness
- Personalized conversations based on customer history
- Appropriate response based on current loan status
- Escalation triggers based on customer profile

### 3. Scalability
- Easy addition of new tools and integrations
- Modular architecture for different business domains
- Standardized protocol for external service integration

### 4. Monitoring & Analytics
- Detailed logs of tool usage during calls
- Performance metrics for different tools
- Success rates for different conversation strategies

---

## Testing Strategy

### Unit Tests
- Individual MCP tool functionality
- Resource handler validation
- Prompt template rendering

### Integration Tests
- OpenAI + MCP tool execution flow
- Database operations during live calls
- Error handling and fallback scenarios

### End-to-End Tests
- Complete voice conversation with tool usage
- Phone call with payment processing
- Customer data retrieval and updates

---

## Risk Mitigation

### 1. Tool Execution Failures
- Implement fallback responses for all tools
- Add retry logic for transient failures
- Graceful degradation when tools are unavailable

### 2. Performance Impact
- Cache frequently accessed data
- Implement async tool execution where possible
- Add timeout controls for external API calls

### 3. Data Security
- Encrypt sensitive customer data
- Implement proper authentication for MCP tools
- Add audit logging for all data access

### 4. Conversation Flow Interruption
- Non-blocking tool execution
- Maintain conversation state during tool calls
- Provide immediate acknowledgment while processing

---

## Future Enhancements

### 1. Multi-language Support
- Extend MCP tools to support multiple languages
- Dynamic prompt switching based on customer preference

### 2. AI-Powered Decision Making
- Use MCP tools to gather context for AI decisions
- Implement smart escalation based on conversation analysis

### 3. Voice Analytics
- Add sentiment analysis tools
- Real-time conversation coaching for agents

### 4. Integration Marketplace
- Standardized tool interfaces for third-party integrations
- Plugin architecture for custom business tools

---

This plan provides a comprehensive roadmap for integrating MCP server functionality into the existing Hindi Voice Bot, enhancing its capabilities while maintaining the current reliable voice interaction features.