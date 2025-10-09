# **Gmail Out-of-Hours Autoresponder**

An intelligent Google Apps Script that automatically replies to emails received outside your working hours. Customizable, draft-based templates, and smart filtering to avoid replying to mailing lists or duplicate senders.

## **✨ Features**

- 🕐 **Customizable working hours** \- Set your own schedule (days and hours)  
- 📧 **Draft-based templates** \- Use a Gmail draft as your auto-reply message with rich formatting  
- 🚫 **Smart filtering** \- Automatically skips mailing lists, no-reply addresses, and CC'd emails  
- 🔄 **Duplicate prevention** \- Won't spam the same sender multiple times within 24 hours  
- 🏷️ **Thread labeling** \- Tracks which emails have been replied to  
- 🧪 **Test functions** \- Dry-run your configuration before going live

## **📋 Prerequisites**

- A Gmail account (works with both personal and Google Workspace accounts)  
- Basic familiarity with Google Apps Script (don't worry, step-by-step instructions below\!)

## **🚀 Quick Start**

### **Option 1: Web Interface (Recommended for beginners)**

1. **Open Google Apps Script**  
     
   - Go to [script.google.com](https://script.google.com)  
   - Click "New Project"

   

2. **Copy the script**  
     
   - Delete any default code in the editor  
   - Copy the entire contents of `autoresponder.gs` from this repository  
   - Paste it into the script editor  
   - Click the "Save" icon and give your project a name (e.g., "Gmail Autoresponder")

   

3. **Configure your settings**  
     
   - Edit the `CONFIG` object at the top of the script:

```javascript
const CONFIG = {
  workingHours: {
    start: 9,   // 9 AM
    end: 17,    // 5 PM
  },
  workingDays: [1, 2, 3, 4, 5], // Monday-Friday
  draftSubjectLine: "Out of Hours Auto-Reply Template",
  // ... other settings
};
```

4. **Create your draft email template** (Optional but recommended)  
     
   - In Gmail, compose a new email  
   - Write your auto-reply message with any formatting you like  
   - Set the subject line to exactly match `draftSubjectLine` in your config (default: "Out of Hours Auto-Reply Template")  
   - **Important:** Save as draft, don't send it\!  
   - If you skip this step, the script will use the fallback message in the config

   

5. **Test your configuration**  
     
   - In the script editor, select `testAutoReplyMessage` from the function dropdown  
   - Click "Run"  
   - Check the "Execution log" to see your settings and message preview

   

6. **Grant permissions**  
     
   - The first time you run a function, Google will ask for permissions  
   - Click "Review Permissions" → Select your account → Click "Advanced" → "Go to \[Project Name\] (unsafe)" → "Allow"  
   - This is normal\! The script needs access to Gmail to function

   

7. **Set up the trigger**  
     
   - Select `setupTrigger` from the function dropdown  
   - Click "Run"  
   - This creates an automatic trigger that checks for new emails every 5 minutes

   

8. **Done\!** Your autoresponder is now active.

### **Option 2: Using clasp (For developers)**

If you're comfortable with the command line and want to manage the script locally:

1. **Install clasp**

```shell
npm install -g @google/clasp
```

2. **Login to Google**

```shell
clasp login
```

3. **Clone this repository**

```shell
git clone https://github.com/dobie99/gmail-autoresponder.git
cd gmail-autoresponder
```

4. **Create a new Apps Script project**

```shell
clasp create --type standalone --title "Gmail Autoresponder"
```

   This will create a `.clasp.json` file with your script ID.

   

5. **Push the code**

```shell
clasp push
```

6. **Open in browser to configure**

```shell
clasp open
```

   Then follow steps 3-7 from Option 1 above.

**Tip for clasp users:** Add `.clasp.json` to your `.gitignore` since it contains your personal script ID.

## **⚙️ Configuration Options**

| Option | Description | Default |
| :---- | :---- | :---- |
| `workingHours.start` | Start of working hours (24-hour format) | 9 |
| `workingHours.end` | End of working hours (24-hour format) | 17 |
| `workingDays` | Working days (1=Mon, 7=Sun) | \[1,2,3,4,5\] |
| `draftSubjectLine` | Subject line of your draft template | "Out of Hours Auto-Reply Template" |
| `fallbackMessage` | Message to use if draft not found | (default message) |
| `labelName` | Gmail label for tracking replies | "AutoReplied" |
| `replyWindow` | Hours before replying to same sender again | 24 |
| `maxThreadsPerRun` | Maximum threads to process per trigger | 50 |
| `excludeDomains` | Domains to never reply to | \['noreply', 'no-reply', ...\] |

## **🧪 Testing**

Before enabling the autoresponder, test your configuration:

### **Test your message and settings**

```javascript
// Run: testAutoReplyMessage
```

Shows your working hours, current message, and whether draft was found.

### **Dry-run on recent emails**

```javascript
// Run: testRecentEmails
```

Shows the last 10 unread emails and whether the script would reply to them (without actually sending).

### **Check current time status**

The test functions will show you whether the current time is considered "outside working hours" based on your configuration.

## **🛑 Disabling the Autoresponder**

To temporarily or permanently disable:

1. In the Apps Script editor, select `removeTriggers` from the function dropdown  
2. Click "Run"  
3. This removes all triggers \- the script will stop checking for emails

To re-enable, just run `setupTrigger` again.

## **📊 Gmail Quota Limits**

Be aware of Gmail's sending quotas:

- **Free Gmail accounts:** \~100 emails per day  
- **Google Workspace accounts:** \~1,500 emails per day

The script is designed to stay well within these limits with the default configuration.

## **🔒 Privacy & Security**

- **Your data stays with you** \- This script runs entirely in your Google account  
- **No external servers** \- No data is sent anywhere outside of Google's infrastructure  
- **Open source** \- You can review every line of code  
- **Permissions explained:**  
  - Gmail access: To read incoming emails and send replies  
  - Script properties: To track reply history and prevent duplicates  
  - Triggers: To run automatically every 5 minutes

## **🐛 Troubleshooting**

### **"Draft not found" warning**

- Make sure your draft email's subject line exactly matches `draftSubjectLine` in the config  
- The script will use the fallback message if the draft isn't found

### **Not replying to emails**

- Run `testRecentEmails` to see if emails are being filtered out  
- Check that the email arrived outside your working hours  
- Verify the sender isn't in the excluded domains list  
- Make sure you're the primary recipient (not CC'd)

### **"Authorization required" errors**

- Re-run the function and grant permissions when prompted  
- If issues persist, try removing and re-adding the trigger

### **Replies look like plain text**

- Make sure you created a draft in Gmail (not in the script)  
- Gmail drafts preserve rich formatting automatically

### **Want to change reply frequency**

- Edit the trigger manually in the Apps Script editor  
- Go to "Triggers" (clock icon in left sidebar)  
- Click the three dots on your trigger → Edit  
- Change from "Every 5 minutes" to your preferred interval

## **🔄 Maintenance**

The script includes automatic cleanup of old reply records. A daily trigger removes records older than your configured `replyWindow` to prevent storage bloat.

## **📝 Example Draft Template**

Here's a sample draft email you might create:

**Subject:** Out of Hours Auto-Reply Template

**Body:**

```
Hi there,

Thanks for your email! I've received your message outside of my regular working hours.

I'll review and respond to your email during my next business day.

My working hours are:
Monday - Friday: 9:00 AM - 5:00 PM EST

For urgent matters, please contact: urgent@example.com

Best regards,
[Your Name]
```

## **🤝 Contributing**

Contributions are welcome\! Please feel free to submit a Pull Request.

## **📄 License**

This project is licensed under the MIT License \- see the [LICENSE](http://LICENSE) file for details.

## **⚠️ Disclaimer**

This script is provided as-is with no warranties. Test thoroughly before deploying in a production environment. Always review auto-reply messages before enabling automation on important email accounts.

## **💡 Tips**

- Start with a short `replyWindow` (like 6 hours) to test, then increase to 24 hours  
- Use the `testRecentEmails` function regularly to see what's being filtered  
- Consider adding your company domain to `excludeDomains` for internal emails  
- Check the execution logs periodically: Apps Script editor → "Executions" (left sidebar)

## **📧 Support**

If you encounter issues:

1. Check the troubleshooting section above  
2. Review the execution logs in Apps Script  
3. Open an issue on GitHub with details about your problem

---

Made with ☕ by dobie99 & lots of help from Claude AI  
