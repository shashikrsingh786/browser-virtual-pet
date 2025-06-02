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
  // startPetMovement();
}

// Function to hide all extension elements
function hideExtensionElements() {
  pet.style.display = 'none';
  todoContainer.style.display = 'none';
  stopPetMovement();
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
pet.style.width = '200px';
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

// Apply extension state on load
if (!isExtensionEnabled) {
  hideExtensionElements();
}
