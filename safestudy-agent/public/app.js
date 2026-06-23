document.getElementById('chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const input = document.getElementById('question-input');
  const sendBtn = document.getElementById('send-btn');
  const chatHistory = document.getElementById('chat-history');
  
  const question = input.value.trim();
  if (!question) return;

  // Add User Message
  addMessage(question, 'user');
  input.value = '';
  
  // Disable input while loading
  input.disabled = true;
  sendBtn.disabled = true;
  
  // Add Loading Indicator
  const loadingId = addMessage('', 'bot', true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    
    const data = await res.json();
    
    // Remove loading
    document.getElementById(loadingId).remove();
    
    if (data.error) {
      addMessage('Error: ' + data.error, 'bot');
    } else {
      addMessage(data.answer, 'bot', false, !data.isSafe ? data.reason : null);
    }
  } catch (err) {
    document.getElementById(loadingId).remove();
    addMessage('Connection error. Is the backend running?', 'bot');
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
});

function addMessage(text, sender, isLoading = false, warningReason = null) {
  const chatHistory = document.getElementById('chat-history');
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  
  if (isLoading) {
    msgDiv.id = 'loading-' + Date.now();
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (isLoading) bubble.classList.add('loading');
  bubble.innerText = text;

  msgDiv.appendChild(bubble);

  if (warningReason) {
    const warning = document.createElement('div');
    warning.className = 'guardrail-warning';
    warning.innerText = `⚠️ ${warningReason}`;
    msgDiv.appendChild(warning);
  }

  chatHistory.appendChild(msgDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  
  return msgDiv.id;
}
