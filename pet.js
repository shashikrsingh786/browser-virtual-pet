// Function to inject CSS
function injectCSS(cssPath) {
  const link = document.createElement('link');
  link.href = chrome.runtime.getURL(cssPath);
  link.type = 'text/css';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

// Initialize extension state (enabled by default)
let isExtensionEnabled = true;

// Load extension state from storage
chrome.storage.sync.get('isExtensionEnabled', function(data) {
  if (data.hasOwnProperty('isExtensionEnabled')) {
    isExtensionEnabled = data.isExtensionEnabled;
    if (!isExtensionEnabled) {
      hideExtensionElements();
    }
  }
});

// Function to save extension state
function saveExtensionState(enabled) {
  chrome.storage.sync.set({isExtensionEnabled: enabled}, function() {
    if (chrome.runtime.lastError) {
      console.error('Error saving extension state:', chrome.runtime.lastError);
    }
  });
}

// Function to show all extension elements
function showExtensionElements() {
  pet.style.display = 'block';
  if (todoContainer.classList.contains('visible')) {
    todoContainer.style.display = 'flex';
  }
  startMessageSystem();
}

// Function to hide all extension elements
function hideExtensionElements() {
  pet.style.display = 'none';
  todoContainer.style.display = 'none';
  stopPetMovement();
  stopMessageSystem();
}

// Function to toggle extension state
function toggleExtension() {
  isExtensionEnabled = !isExtensionEnabled;
  
  if (isExtensionEnabled) {
    showExtensionElements();
  } else {
    hideExtensionElements();
  }
  
  saveExtensionState(isExtensionEnabled);
}

// Inject the stylesheet
injectCSS('style.css');
const pet = document.createElement('img');
pet.src = chrome.runtime.getURL('pet2.gif'); // Ensure pet.gif is in your project directory
pet.style.position = 'fixed';
pet.style.bottom = '0px';
pet.style.left = '100px';
pet.style.zIndex = '10000';
pet.style.height = 'auto';
pet.style.width = '150px';
document.body.appendChild(pet);

// To-Do List Container krn
const todoContainer = document.createElement('div');
todoContainer.id = 'todo-list-container';
todoContainer.style.position = 'fixed';
todoContainer.style.bottom = '120px'; // Position above the pet
todoContainer.style.left = '100px';
todoContainer.style.display = 'none'; // Initially hidden
todoContainer.style.zIndex = '10001'; // Above the pet
todoContainer.innerHTML = `
<div class="todo-content">
  <div id="todo-header">
    <h3>My To-Do List</h3>
    <div id="date-display" style="font-size: 0.8em; text-align: right; margin-bottom: 5px;"></div>
  </div>
  <input type="text" id="todo-input" placeholder="Add a new task...">
  <button id="add-todo-btn">Add</button>
  <ul id="todo-items"></ul>
  <div id="info-icon">i</div>
</div>
<div id="creator-info">
  <h2>Created By</h2>
  <p>Shashi Kumar Singh</p>
</div>
`;
document.body.appendChild(todoContainer);

let movementIntervalId;
let isPetMoving = true;

// Simple left-right walk loop
let dir = 1;
function startPetMovement() {
  if (movementIntervalId) clearInterval(movementIntervalId); // Clear existing interval if any
  movementIntervalId = setInterval(() => {
    const left = parseInt(pet.style.left);
    if (left < 0 || left > window.innerWidth - 100) {
      dir *= -1;
      // Flip the pet image horizontally when changing direction
      pet.style.transform = dir === 1 ? 'scaleX(1)' : 'scaleX(-1)';
    }
    // Always keep pet at the very bottom
    pet.style.bottom = '0px';
    pet.style.left = `${left + 5 * dir}px`;
  }, 50);
  isPetMoving = true;
}

function stopPetMovement() {
  clearInterval(movementIntervalId);
  isPetMoving = false;
}

function toggleTodoList() {
  if (todoContainer.style.display === 'none') {
    todoContainer.style.display = 'flex';
    todoContainer.classList.add('visible');
    // Position todo list near the pet
    const petRect = pet.getBoundingClientRect();
    todoContainer.style.left = `${petRect.left}px`;
    todoContainer.style.bottom = `${window.innerHeight - petRect.top + 10}px`; // 10px above pet
    updateDateDisplay(); // Update date when showing
    loadTodos(); // Load todos when showing
    // Add click outside event listener
    setTimeout(() => {
      document.addEventListener('click', closeOnClickOutside);
    }, 10);
  } else {
    todoContainer.style.display = 'none';
    todoContainer.classList.remove('visible');
    // Remove click outside event listener
    document.removeEventListener('click', closeOnClickOutside);
    // Do NOT startPetMovement here
  }
}

// Function to close todo list when clicking outside
function closeOnClickOutside(e) {
  if (!todoContainer.contains(e.target) && e.target !== pet) {
    toggleTodoList();
    startPetMovement(); // Resume pet movement when clicking outside
  }
}

pet.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent document click from immediately closing
  if (isPetMoving) {
    stopPetMovement();
  }
  toggleTodoList();
});

// Prevent clicks inside todo container from closing it
todoContainer.addEventListener('click', (e) => {
  e.stopPropagation();
});

// Start pet movement initially
startPetMovement();

// On initial setup, make sure pet is facing right and at the bottom
pet.style.transform = 'scaleX(1)';
pet.style.bottom = '0px';

// --- To-Do List Functionality ---
const todoInput = document.getElementById('todo-input');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoItemsUl = document.getElementById('todo-items');

function saveTodos() {
  const todos = [];
  todoItemsUl.querySelectorAll('li').forEach(li => {
    const textSpan = li.querySelector('span.todo-text');
    const dateSpan = li.querySelector('span.date-badge');
    
    if (textSpan) {
      todos.push({
        text: textSpan.textContent,
        completed: li.classList.contains('completed'),
        date: dateSpan ? dateSpan.dataset.timestamp : new Date().toISOString()
      });
    }
  });
  chrome.storage.sync.set({todos: todos}, function() {
    if (chrome.runtime.lastError) {
      console.error('Error saving todos:', chrome.runtime.lastError);
    }
  });
}

function updateDateDisplay() {
  const dateDisplay = document.getElementById('date-display');
  if (dateDisplay) {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = now.toLocaleDateString(undefined, options);
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return 'Today';
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

function loadTodos() {
  todoItemsUl.innerHTML = ''; // Clear existing items
  chrome.storage.sync.get('todos', function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading todos:', chrome.runtime.lastError);
      return;
    }
    const todos = data.todos || [];
    todos.forEach(todoData => {
      addTodoItem(todoData.text, todoData.completed, todoData.date);
    });
  });
}

function addTodoItem(text, completed = false, date = null) {
  if (!text && todoInput) text = todoInput.value.trim();
  if (text === '') return;

  // Use the provided date or create a new one
  const todoDate = date || new Date().toISOString();
  
  const li = document.createElement('li');
  
  // Create text container to hold both text and date
  const textContainer = document.createElement('div');
  textContainer.classList.add('text-container');
  
  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  textSpan.classList.add('todo-text');
  textContainer.appendChild(textSpan);
  
  // Add date badge
  const dateSpan = document.createElement('span');
  dateSpan.classList.add('date-badge');
  dateSpan.textContent = formatDate(todoDate);
  dateSpan.dataset.timestamp = todoDate; // Store full timestamp as data attribute
  textContainer.appendChild(dateSpan);
  
  li.appendChild(textContainer);

  if (completed) {
    li.classList.add('completed');
  }

  // Click on text to toggle complete
  textSpan.addEventListener('click', () => {
    li.classList.toggle('completed');
    saveTodos();
  });

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.title = "Edit"; // Add tooltip
  editBtn.classList.add('edit-btn');
  
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!textContainer.querySelector('.edit-input')) {
      textSpan.style.display = 'none';
      const inputField = document.createElement('input');
      inputField.type = 'text';
      inputField.value = textSpan.textContent;
      inputField.classList.add('edit-input');
      textContainer.insertBefore(inputField, textSpan);
      inputField.focus();
      
      // Add event listener to save on Enter
      inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          saveEdit();
        }
      });
      
      // Add event listener to save on blur
      inputField.addEventListener('blur', saveEdit);
      
      function saveEdit() {
        if (textContainer.contains(inputField)) {
          textSpan.textContent = inputField.value.trim();
          textSpan.style.display = 'inline';
          inputField.remove();
          saveTodos();
        }
      }
    }
  });

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.title = "Delete"; // Add tooltip
  deleteBtn.classList.add('delete-btn');
  
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent li click event
    
    // Add a fade-out animation before removing
    li.style.opacity = '0';
    li.style.transform = 'translateX(20px)';
    li.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
      li.remove();
      saveTodos();
    }, 300);
  });

  // Buttons container
  const buttonsDiv = document.createElement('div');
  buttonsDiv.classList.add('buttons-container');
  buttonsDiv.appendChild(editBtn);
  buttonsDiv.appendChild(deleteBtn);
  li.appendChild(buttonsDiv);

  // Add with animation
  li.style.opacity = '0';
  li.style.transform = 'translateY(10px)';
  todoItemsUl.appendChild(li);
  
  // Trigger reflow
  void li.offsetWidth;
  
  // Apply animation
  li.style.opacity = '1';
  li.style.transform = 'translateY(0)';
  li.style.transition = 'all 0.3s ease';

  if (todoInput) todoInput.value = ''; // Clear input if adding from input
  saveTodos();
}

if (addTodoBtn) {
  addTodoBtn.addEventListener('click', () => addTodoItem());
}

if (todoInput) {
  todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTodoItem();
    }
  });
}

// Load todos on initial script load if the list was somehow left open (though it's hidden by default)
// Or, more practically, if we want to manage todos even if the pet isn't clicked yet.
// For now, todos are loaded when the list is shown.

// --- Toggle Pet Visibility Functionality ---
function togglePetVisibility() {
  if (pet.style.display === 'none') {
    pet.style.display = 'block';
  } else {
    pet.style.display = 'none';
  }
}

// Listen for Ctrl+Enter to toggle pet visibility
window.addEventListener('keydown', function(e) {
  if (e.altKey && e.key === 'Enter') {
    togglePetVisibility();
  }
});

// Add keyboard shortcut to toggle extension (Alt+Shift+E)
window.addEventListener('keydown', function(e) {
  if (e.altKey && e.shiftKey && e.key === 'E') {
    toggleExtension();
  }
});

// Add info icon click handler
const infoIcon = todoContainer.querySelector('#info-icon');
infoIcon.addEventListener('click', (e) => {
  e.stopPropagation();
  todoContainer.classList.toggle('flipped');
});

// Add click handler to creator info to flip back
const creatorInfo = todoContainer.querySelector('#creator-info');
creatorInfo.addEventListener('click', (e) => {
  e.stopPropagation();
  todoContainer.classList.remove('flipped');
});

// Cat messages functionality
const randomMessages = [
  "Mew~ tum phir se kaam mein kho gaye? Main bhi attention chahti hoon~ 😿💻",
  "Prrr~ mujhe laga tum mujhe treat doge... par tum toh sirf bugs fix kar rahe ho! 🐾😾",
  "Mewww! Tumhara screen time 2 ghante cross ho gaya! Break time bacha lo mujhe~ 🐱⏰",
  "Nyaa~ kya tum mujhe ignore kar rahe ho? I'm gonna sit on your tab now! 😼🖱️",
  "Hehe~ tum focus mein ho... toh main thoda dance kar leti hoon yahan! 💃🐈✨",
  "Tumhare face pe thodi si thakan hai... ek stretch toh banta hai~ Mew~ 🐱🧘",
  "Kaam kaam kaam! Aur main? Ek lonely billi hoon is browser mein! 😿📂",
  "Nya~ mujhe bhi kuch type karne do! Let me code: 'console.purr(\"Hi Shashi~\")' 🐾😹",
  "Meeeeow~ kal raat tum late the... main sab dekh rahi thi! 😼🌙",
  "Tum kuch cute dekh rahe ho… oh wait, that's me! 😽🖥️",
  "Mewwwww! Ek naya tab khola? Mujhe laga tum mujhe dekh rahe ho 😾🔍",
  "Shashi! Tumne mujhe naam nahi diya abhi tak! Mew~ naam do warna main tumhara tab close kar dungi 😼💣"
];

const fixedMessages = {
  "13:00": "Meeeow~ 1 baj gaya hai, Shashi! Tumhare pet ka toh lunch ho gaya, ab tumhara kab hoga? 🍱🐾 Don't skip it warna main tumhari keyboard pe let jaungi!",
  "16:00": "🐈 4 baj gaye! Tumhari aankhon ka zoom level badh gaya hai... It's coffee o'clock! ☕🐈 Chal, ek garam si sip le lo... warna main tumhara mouse leke bhaag jaungi~"
};

let messageIntervalId;
let messageContainer;

// Create message container
function createMessageContainer() {
  messageContainer = document.createElement('div');
  messageContainer.style.position = 'fixed';
  messageContainer.style.bottom = '220px';
  messageContainer.style.left = '100px';
  messageContainer.style.zIndex = '10002';
  messageContainer.style.display = 'none';
  messageContainer.style.maxWidth = '300px';
  messageContainer.style.padding = '12px 16px';
  messageContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
  messageContainer.style.border = '2px solid #ff69b4';
  messageContainer.style.borderRadius = '20px';
  messageContainer.style.fontSize = '14px';
  messageContainer.style.fontFamily = 'Arial, sans-serif';
  messageContainer.style.color = '#333';
  messageContainer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
  messageContainer.style.transform = 'translateY(10px)';
  messageContainer.style.opacity = '0';
  messageContainer.style.transition = 'all 0.3s ease';
  messageContainer.style.wordWrap = 'break-word';
  
  // Add a small tail to the speech bubble
  const tail = document.createElement('div');
  tail.style.position = 'absolute';
  tail.style.bottom = '-8px';
  tail.style.left = '30px';
  tail.style.width = '0';
  tail.style.height = '0';
  tail.style.borderLeft = '8px solid transparent';
  tail.style.borderRight = '8px solid transparent';
  tail.style.borderTop = '8px solid #ff69b4';
  messageContainer.appendChild(tail);
  
  document.body.appendChild(messageContainer);
}

// Show message with animation
function showMessage(message) {
  if (!isExtensionEnabled) return;
  
  if (!messageContainer) {
    createMessageContainer();
  }
  
  messageContainer.textContent = message;
  messageContainer.style.display = 'block';
  
  // Position near pet
  const petRect = pet.getBoundingClientRect();
  messageContainer.style.left = `${petRect.left}px`;
  messageContainer.style.bottom = `${window.innerHeight - petRect.top + 30}px`;
  
  // Animate in
  setTimeout(() => {
    messageContainer.style.opacity = '1';
    messageContainer.style.transform = 'translateY(0)';
  }, 10);
  
  // Hide after 8 seconds
  setTimeout(() => {
    hideMessage();
  }, 1000*30);
}

// Hide message with animation
function hideMessage() {
  if (messageContainer && messageContainer.style.display !== 'none') {
    messageContainer.style.opacity = '0';
    messageContainer.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      messageContainer.style.display = 'none';
    }, 300);
  }
}

// Check for fixed time messages
function checkFixedMessages() {
  const now = new Date();
  const timeString = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  
  if (fixedMessages[timeString]) {
    showMessage(fixedMessages[timeString]);
  }
}

// Show random message
function showRandomMessage() {
  if (!isExtensionEnabled) return;
  
  const randomIndex = Math.floor(Math.random() * randomMessages.length);
  showMessage(randomMessages[randomIndex]);
}

// Start message system
function startMessageSystem() {
  // Check for fixed messages every minute
  setInterval(checkFixedMessages, 60000);
  
  // Show random messages every 20 minutes (1200000 ms)
  messageIntervalId = setInterval(showRandomMessage, 1200000);
  
  // Check immediately for fixed messages
  checkFixedMessages();
}

// Stop message system
function stopMessageSystem() {
  if (messageIntervalId) {
    clearInterval(messageIntervalId);
    messageIntervalId = null;
  }
  hideMessage();
}

// Start message system initially if extension is enabled
if (isExtensionEnabled) {
  startMessageSystem();
}

// Apply extension state on load
if (!isExtensionEnabled) {
  hideExtensionElements();
}
