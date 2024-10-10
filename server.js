// Load environment variables
import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
// If using Node.js < 18, uncomment the next line
// const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the 'public' directory

// State dictionary
let state = {
  assistant_id: null,
  assistant_name: null,
  threadId: null,
  messages: [],
};
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
// Route to get the list of Assistants
app.post('/api/assistants', async (req, res) => {
  let assistant_id = req.body.name;
    try {
        let myAssistant = await openai.beta.assistants.retrieve(
          assistant_id
        );
        console.log(myAssistant);
              // Extract the list of assistants from 'data.data'
        state.assistant_id = myAssistant.id; // Updated line
        state.assistant_name = myAssistant.name; // Updated line
        res.status(200).json(state);
      }
      catch{
        if (!myAssistant.ok) {
          const errorText = await myAssistant.text;
          console.error('Error fetching assistants:', errorText);
          return res.status(myAssistant.status).json({ error: 'Failed to fetch assistants' });
        }
      }
  });
  

// Route to create a new Thread
app.post('/api/threads', async (req, res) => {
  // Extract assistant ID from the request body
  const { assistantId } = req.body;

  // Create a new thread
  try {
    let response = await openai.beta.threads.create();

    // Log response for debugging
    console.log('Thread creation response:', response);

    // Return thread ID in the response
    if (response.id) {
      state.threadId = response.id;
      state.messages = [];  // Reset messages
      res.json({ threadId: state.threadId });
    } else {
      console.error('Failed to create thread. No thread ID returned.');
      res.status(500).json({ error: 'Failed to create thread. No thread ID returned.' });
    }
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: 'Failed to create thread.' });
  }
});

// Route to send a message and run the Assistant
app.post('/api/run', async (req, res) => {
  const { message } = req.body;

  // // Add the user's message to the state
  // state.messages.push({ role: 'user', content: message });
  // Reset the messages array to only keep the latest interaction
  state.messages = [{ role: 'user', content: message }];
    
  try {
    // Ensure state.threadId exists before making the request
    if (!state.threadId) {
      throw new Error('No thread ID available.');
    }

    // Send the user's message to the Assistant
    await openai.beta.threads.messages.create(state.threadId, {
      role: 'user',
      content: message,
    });

    // Run and poll thread V2 API feature
    let run = await openai.beta.threads.runs.createAndPoll(state.threadId, {
      assistant_id: state.assistant_id
    });
    state.run_id = run.id;

    // List messages after the run completes
    let messagesResponse = await openai.beta.threads.messages.list(state.threadId);
    let messages = messagesResponse.data;

    let assistantMessage = messages.find(msg => msg.role === 'assistant');

    if (assistantMessage) {
      state.messages.push(assistantMessage);
    }
    res.json({ messages: state.messages });
  } catch (error) {
    console.error('Error running assistant:', error);
    res.status(500).json({ error: 'Failed to run assistant' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});