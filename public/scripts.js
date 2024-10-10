// Initiate the state object with the assistant_id and threadId as null and an empty array for messages
let state = {
  assistant_id: null,
  assistant_name: null,
  threadId: null,
  messages: [],
};

// Get assistand details by name or ID
async function getAssistant(){
  // Get the assistant name from the input field
  // let name = document.getElementById('assistant_name').value;
  const assistantSelect = document.getElementById('assistantSelect');
  const assistantId = assistantSelect.value;
  const assistantName = assistantSelect.options[assistantSelect.selectedIndex].text;
  
  state.assistant_id = assistantId;
  state.assistant_name = assistantName;

  // Log the assistant name to the console
  console.log(`assistant_id: ${state.assistant_id}`);

  // Make a POST request to the server to get the assistant details
  const response = await fetch('/api/assistants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: state.assistant_id }),
  });
  
  // Log the response to the console
  state = await response.json();  // the state object is updated with the response from the server
  // writeToMessages(`Assistant ${state.assistant_name} is ready to chat`);
  writeToMessages(`Assistant is ready to chat`);
  console.log(`back from fetch with state: ${JSON.stringify(state)}`)
}

// Create a new thread for the selected assistant
async function getThread(){
  // Check if an assistant is selected
  if (!state.assistant_id) {
    writeToMessages('Please select an assistant first.', 'error');
    return;
  }

  // Make a POST request to the server to create a new thread
  try {
    const response = await fetch('/api/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assistantId: state.assistant_id }),
    });

    // Log the response to the console
    const result = await response.json();
    state.threadId = result.threadId;  // Save thread ID to state
    console.log(`Thread ID: ${state.threadId}`);
    writeToMessages('New thread created. You can start chatting now.', 'assistant');
  } catch (error) {
    console.error('Error creating thread:', error);
    writeToMessages('Failed to create a new thread. Please try again.', 'error');
  }
}

// Send a message to the assistant and get a response
async function getResponse() {
  const message = document.getElementById('messageInput').value;

  // Check if the message is empty
  if (!message) {
    writeToMessages('Please enter a message to send.', 'error');
    return;
  }

  // Check if a thread is created
  if (!state.threadId) {
    writeToMessages('Please create a thread before sending a message.', 'error');
    return;
  }

  // Add the user's message to the state
  writeToMessages(message, 'user');  // Display the user's message
  document.getElementById('messageInput').value = '';  // Clear input field

  // Make a POST request to the server to send the message and get a response
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    // Log the response to the console
    const result = await response.json();
    console.log('Assistant response:', result);

    // Display the assistant's messages
    const assistantMessage = result.messages.find(msg => msg.role === 'assistant');
    if (assistantMessage) {
      // Extract the text value from the assistant's message
      const content = assistantMessage.content.map(part => part.text.value).join(' ');
      writeToMessages(content, 'assistant');
    } else {
      writeToMessages('No response from assistant.', 'error');
    }
  } catch (error) {
    console.error('Error fetching assistant response:', error);
    writeToMessages('Failed to get a response from the assistant.', 'error');
  }
}

// Function to display messages in the chat interface
function writeToMessages(message, role = 'user') {
  const messageContainer = document.getElementById('message-container');

  // Create a new div for each message
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', role);
  messageElement.textContent = message;

  // Append the new message to the message container
  messageContainer.appendChild(messageElement);

  // Scroll to the bottom of the message container to show the latest message
  messageContainer.scrollTop = messageContainer.scrollHeight;
}