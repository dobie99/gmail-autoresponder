/**
 * Configuration - Adjust these to your preferences
 */
const CONFIG = {
  workingHours: {
    start: 9,  // 9 AM (24-hour format)
    end: 17,   // 5 PM (24-hour format)
  },
  workingDays: [1, 2, 3, 4, 5], // Monday=1 to Sunday=7 (currently Mon-Fri)
  
  // Draft email template
  draftSubjectLine: "Out of Hours Auto-Reply Template",
  
  // Fallback message if draft cannot be found
  fallbackMessage: `Thank you for your email. I've received your message outside of my working hours and will respond during my next business day.

My working hours are Monday-Friday, 9:00 AM - 5:00 PM.

Best regards`,
  
  labelName: "AutoReplied", // Label to track which emails we've replied to
  
  // Time window to prevent duplicate replies (in hours)
  replyWindow: 24, // Don't send another auto-reply to the same sender within 24 hours
  
  // Maximum number of threads to process per run (to avoid quota limits)
  maxThreadsPerRun: 50,
  
  // Exclude domains/addresses from auto-reply
  excludeDomains: ['noreply', 'no-reply', 'donotreply', 'mailer-daemon'],
  
  // Timezone for working hours calculation (e.g., 'America/New_York', 'Europe/London')
  timezone: Session.getScriptTimeZone(),
  
  // Reply subject prefix
  subjectPrefix: "Re: "
};

/**
 * Get the auto-reply message from draft or fallback
 */
function getAutoReplyMessage() {
  try {
    const message = getMessageFromDraft();
    return message;
  } catch (e) {
    Logger.log(`Could not load draft template: ${e.message}. Using fallback message.`);
    return CONFIG.fallbackMessage;
  }
}

/**
 * Get message body from a draft email
 */
function getMessageFromDraft() {
  const drafts = GmailApp.getDrafts();
  
  for (let draft of drafts) {
    const message = draft.getMessage();
    if (message.getSubject() === CONFIG.draftSubjectLine) {
      // Get the HTML body for rich formatting
      const htmlBody = message.getBody();
      return htmlBody;
    }
  }
  
  throw new Error(`Draft with subject "${CONFIG.draftSubjectLine}" not found.`);
}

/**
 * Main function - Run this on a time-based trigger
 */
function checkAndReplyToEmails() {
  const label = getOrCreateLabel(CONFIG.labelName);
  const autoReplyMessage = getAutoReplyMessage();
  
  // Get unread emails that haven't been auto-replied to
  const threads = GmailApp.search('is:unread -label:' + CONFIG.labelName, 0, CONFIG.maxThreadsPerRun);
  
  Logger.log(`Processing ${threads.length} thread(s)`);
  let repliedCount = 0;
  
  threads.forEach(thread => {
    const messages = thread.getMessages();
    const latestMessage = messages[messages.length - 1]; // Get the most recent message
    
    // Only process the latest message in the thread
    if (latestMessage.isUnread() && shouldAutoReply(latestMessage)) {
      const receivedDate = latestMessage.getDate();
      
      if (isOutsideWorkingHours(receivedDate)) {
        const sender = extractEmail(latestMessage.getFrom());
        
        // Check if we recently replied to this sender
        if (!hasRecentlyRepliedToSender(sender)) {
          sendAutoReply(latestMessage, autoReplyMessage);
          thread.addLabel(label);
          recordReply(sender);
          repliedCount++;
          Logger.log(`Auto-replied to: ${latestMessage.getFrom()}`);
        } else {
          Logger.log(`Skipped (recently replied): ${sender}`);
        }
      }
    }
  });
  
  Logger.log(`Sent ${repliedCount} auto-reply/replies`);
}

/**
 * Check if a date/time is outside working hours
 */
function isOutsideWorkingHours(date) {
  const hour = date.getHours();
  const day = date.getDay(); // 0=Sunday, 1=Monday, etc.
  
  // Convert day to our format (1-7, where 1=Monday, 7=Sunday)
  const dayFormatted = day === 0 ? 7 : day;
  
  // Check if it's a working day
  if (!CONFIG.workingDays.includes(dayFormatted)) {
    return true; // Weekend or non-working day
  }
  
  // Check if it's outside working hours
  if (hour < CONFIG.workingHours.start || hour >= CONFIG.workingHours.end) {
    return true;
  }
  
  return false;
}

/**
 * Determine if we should auto-reply to this message
 */
function shouldAutoReply(message) {
  const from = message.getFrom().toLowerCase();
  
  // Check excluded domains
  for (let excluded of CONFIG.excludeDomains) {
    if (from.includes(excluded.toLowerCase())) {
      Logger.log(`Skipped (excluded domain): ${from}`);
      return false;
    }
  }
  
  // Don't reply to mailing lists
  if (message.getHeader('List-Unsubscribe') || 
      message.getHeader('List-Id') ||
      message.getHeader('Precedence') === 'bulk') {
    Logger.log(`Skipped (mailing list): ${from}`);
    return false;
  }
  
  // Don't reply if we're CC'd or BCC'd (only direct emails)
  const to = message.getTo().toLowerCase();
  const myEmail = Session.getActiveUser().getEmail().toLowerCase();
  if (!to.includes(myEmail)) {
    Logger.log(`Skipped (not primary recipient): ${from}`);
    return false;
  }
  
  return true;
}

/**
 * Send auto-reply to a message
 */
function sendAutoReply(message, replyBody) {
  try {
    // Send with htmlBody parameter to preserve rich formatting
    message.reply('', {
      htmlBody: replyBody
    });
  } catch (e) {
    Logger.log(`Error sending reply: ${e.message}`);
  }
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
function extractEmail(fromString) {
  const match = fromString.match(/<(.+?)>/);
  return match ? match[1].toLowerCase() : fromString.toLowerCase();
}

/**
 * Check if we've recently replied to this sender
 */
function hasRecentlyRepliedToSender(senderEmail) {
  const properties = PropertiesService.getScriptProperties();
  const key = 'lastReply_' + senderEmail;
  const lastReplyTime = properties.getProperty(key);
  
  if (!lastReplyTime) {
    return false;
  }
  
  const hoursSinceReply = (Date.now() - parseInt(lastReplyTime)) / (1000 * 60 * 60);
  return hoursSinceReply < CONFIG.replyWindow;
}

/**
 * Record that we replied to this sender
 */
function recordReply(senderEmail) {
  const properties = PropertiesService.getScriptProperties();
  const key = 'lastReply_' + senderEmail;
  properties.setProperty(key, Date.now().toString());
}

/**
 * Get or create the tracking label
 */
function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log(`Created new label: ${labelName}`);
  }
  
  return label;
}

/**
 * Clean up old reply records (run periodically to avoid property storage bloat)
 */
function cleanupOldReplyRecords() {
  const properties = PropertiesService.getScriptProperties();
  const allProperties = properties.getProperties();
  const cutoffTime = Date.now() - (CONFIG.replyWindow * 60 * 60 * 1000);
  let deletedCount = 0;
  
  for (let key in allProperties) {
    if (key.startsWith('lastReply_')) {
      const timestamp = parseInt(allProperties[key]);
      if (timestamp < cutoffTime) {
        properties.deleteProperty(key);
        deletedCount++;
      }
    }
  }
  
  Logger.log(`Cleaned up ${deletedCount} old reply record(s)`);
}

/**
 * Test function - Run this to see what your auto-reply message looks like
 */
function testAutoReplyMessage() {
  Logger.log("=== CONFIGURATION TEST ===");
  Logger.log(`Working hours: ${CONFIG.workingHours.start}:00 - ${CONFIG.workingHours.end}:00`);
  Logger.log(`Working days: ${CONFIG.workingDays.join(', ')} (1=Mon, 7=Sun)`);
  Logger.log(`Timezone: ${CONFIG.timezone}`);
  Logger.log(`Reply window: ${CONFIG.replyWindow} hours`);
  Logger.log(`Max threads per run: ${CONFIG.maxThreadsPerRun}`);
  Logger.log("");
  
  Logger.log("=== CURRENT TIME TEST ===");
  const now = new Date();
  Logger.log(`Current time: ${now.toLocaleString()}`);
  Logger.log(`Is outside working hours: ${isOutsideWorkingHours(now)}`);
  Logger.log("");
  
  Logger.log("=== AUTO-REPLY MESSAGE TEST ===");
  const message = getAutoReplyMessage();
  Logger.log("Your auto-reply message:");
  Logger.log("------------------------");
  Logger.log(message);
  Logger.log("------------------------");
  
  // Check if we're using draft or fallback
  try {
    getMessageFromDraft();
    Logger.log("✓ Using message from draft: '" + CONFIG.draftSubjectLine + "'");
  } catch (e) {
    Logger.log("⚠ Using fallback message (draft not found)");
  }
  
  Logger.log("");
  Logger.log("=== EXCLUDED DOMAINS ===");
  Logger.log(CONFIG.excludeDomains.join(', '));
}

/**
 * Setup function - Run this once to create the trigger
 */
function setupTrigger() {
  // Test that we can get a message (either draft or fallback)
  const message = getAutoReplyMessage();
  Logger.log("✓ Auto-reply message configured");
  
  // Delete existing triggers for this function to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkAndReplyToEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create a new trigger that runs every 5 minutes
  ScriptApp.newTrigger('checkAndReplyToEmails')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('✓ Trigger created - runs every 5 minutes');
  
  // Also create a daily cleanup trigger
  const cleanupTriggers = triggers.filter(t => t.getHandlerFunction() === 'cleanupOldReplyRecords');
  if (cleanupTriggers.length === 0) {
    ScriptApp.newTrigger('cleanupOldReplyRecords')
      .timeBased()
      .atHour(2) // Run at 2 AM
      .everyDays(1)
      .create();
    Logger.log('✓ Daily cleanup trigger created');
  }
  
  Logger.log('✓ Setup complete!');
}

/**
 * Remove all triggers - Run this if you want to disable the script
 */
function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  
  triggers.forEach(trigger => {
    const funcName = trigger.getHandlerFunction();
    if (funcName === 'checkAndReplyToEmails' || funcName === 'cleanupOldReplyRecords') {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });
  
  Logger.log(`Removed ${count} trigger(s)!`);
}

/**
 * Manual test - Check specific recent emails without sending replies
 */
function testRecentEmails() {
  Logger.log("=== TESTING RECENT EMAILS (DRY RUN) ===");
  
  const threads = GmailApp.search('is:unread', 0, 10);
  Logger.log(`Found ${threads.length} unread thread(s)\n`);
  
  threads.forEach((thread, index) => {
    const messages = thread.getMessages();
    const latestMessage = messages[messages.length - 1];
    
    Logger.log(`Thread ${index + 1}:`);
    Logger.log(`  From: ${latestMessage.getFrom()}`);
    Logger.log(`  Subject: ${latestMessage.getSubject()}`);
    Logger.log(`  Date: ${latestMessage.getDate()}`);
    Logger.log(`  Outside hours: ${isOutsideWorkingHours(latestMessage.getDate())}`);
    Logger.log(`  Should reply: ${shouldAutoReply(latestMessage)}`);
    Logger.log('');
  });
}
