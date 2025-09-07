import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn("⚠️ Twilio credentials not configured. Twilio features will be disabled.");
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export { client as twilioClient, twilioPhoneNumber };

export function getTwilioWebhookUrl(baseUrl, path) {
  return `${baseUrl}${path}`;
}

export function validateTwilioRequest(req, authToken, url) {
  const twilioSignature = req.headers['x-twilio-signature'];
  return twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    req.body
  );
}