const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let onlineUsers = 0;
const messagesStore = []; // Mesajları saklamak için dizi

// HTML içeriği doğrudan burada tanımlanıyor
const indexHTML = `
<!DOCTYPE html>
<html>
<head>
<title>Socket.IO chat</title>
<link rel="stylesheet" href="/style.css">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
<style>
  /* CSS içeriği doğrudan burada tanımlanacak */
</style>
</head>
<body>
  <i id="theme-toggle" class="fas fa-moon"></i>
  <div id="user-count"></div>
  <ul id="messages"></ul>
  <form id="form" action="">
    <input id="input" autocomplete="off" /><button>Gönder</button>
  </form>

  <audio id="notification-sound" src="/notification.mp3" preload="auto"></audio> <!-- Bildirim sesi elementi -->

  <script src="/socket.io/socket.io.js"></script>
  <script>
    // JavaScript içeriği doğrudan burada tanımlanacak
  </script>
</body>
</html>
`;

// CSS içeriği doğrudan burada tanımlanıyor
const styleCSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font: 16px 'Helvetica Neue', sans-serif; background-color: #e5ddd5; display: flex; flex-direction: column; height: 100vh; } /* Daha modern font ve arka plan rengi */

#user-count {
  text-align: center;
  padding: 10px;
  background-color: #dcdcdc;
  color: #333;
  font-size: 0.9em;
}

#messages {
  list-style: none;
  margin: 0;
  padding: 10px;
  flex-grow: 1;
  overflow-y: auto;
  padding-bottom: 80px; /* Formun yüksekliği kadar boşluk */
}

#messages li {
  display: flex;
  margin-bottom: 10px;
  word-wrap: break-word;
  position: relative; /* İkonlar için */
}

#messages li .message-content {
  max-width: 80%; /* Mesaj baloncuğu genişliği */
  padding: 8px 12px;
  border-radius: 18px; /* Yuvarlak köşeler */
  position: relative;
  font-size: 0.9em;
}

#messages li .message-meta {
  font-size: 0.7em;
  color: rgba(0, 0, 0, 0.5);
  margin-top: 2px;
}

.my-message {
  justify-content: flex-end; /* Kendi mesajlarımı sağa hizala */
}

.my-message .message-content {
  background-color: #dcf8c6; /* Kendi mesaj baloncuğu rengi */
  margin-right: 5px;
}

.other-message {
  justify-content: flex-start; /* Diğer kullanıcıların mesajlarını sola hizala */
}

.other-message .message-content {
  /* background-color: #fff; */ /* Renk JavaScript tarafından atanacak */
  margin-left: 5px;
}

/* Mesaj baloncuğu okları (isteğe bağlı, daha karmaşık CSS gerektirir) */
/* Şimdilik basit tutalım */

.message-actions {
  position: absolute;
  top: 5px;
  /* display: none; */ /* Başlangıçta gizli - JavaScript ile yönetilecek */
  opacity: 0; /* Başlangıçta şeffaf */
  transition: opacity 0.2s ease-in-out; /* Geçiş efekti */
}

.my-message .message-actions {
  left: -30px; /* Kendi mesajlarımda solda */
}

.other-message .message-actions {
  right: -30px; /* Diğer mesajlarda sağda */
}

/* #messages li:hover .message-actions {
  display: flex;
  align-items: center;
} */ /* Hover stilini kaldır */

.message-actions.visible {
  opacity: 1; /* Görünür olunca tam opaklık */
  display: flex; /* Görünür olunca flex olarak göster */
  align-items: center;
}


.message-actions i {
  margin: 0 3px;
  cursor: pointer;
  font-size: 0.8em;
  color: #888;
}


form {
  background: #f0f0f0;
  padding: 10px;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  display: flex;
  align-items: center;
  box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
}

form input {
  border: 1px solid #ccc;
  padding: 10px;
  flex-grow: 1;
  margin-right: 10px;
  border-radius: 20px; /* Daha yuvarlak input */
  height: 45px; /* Biraz daha yüksek input */
  font-size: 1em;
}

form button {
  background: #128c7e; /* WhatsApp yeşili */
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 20px; /* Daha yuvarlak buton */
  cursor: pointer;
  height: 45px;
  font-size: 1em;
}

form button:hover {
  background: #075e54;
}

.typing-indicator {
  font-style: italic;
  color: #888;
  padding: 10px;
  text-align: center;
}

#theme-toggle {
  position: absolute;
  top: 10px;
  right: 10px;
  cursor: pointer;
  z-index: 1000;
  font-size: 1.5em;
  color: #333;
}

body.dark-mode {
  background-color: #121212;
  color: #eee;
}

body.dark-mode #user-count {
  background-color: #222;
  color: #eee;
}

body.dark-mode #messages li .message-content {
  background-color: #333;
  color: #eee;
}

body.dark-mode .my-message .message-content {
  background-color: #0056b3;
}

body.dark-mode .message-meta {
  color: rgba(255, 255, 255, 0.6);
}

body.dark-mode form {
  background: #222;
  box-shadow: 0 -2px 5px rgba(255,255,255,0.1);
}

body.dark-mode form input {
  background-color: #444;
  border-color: #555;
  color: #eee;
}

body.dark-mode form button {
  background: #007bff;
}

body.dark-mode form button:hover {
  background: #0056b3;
}

body.dark-mode #theme-toggle {
  color: #eee;
}
`;

// JavaScript içeriği doğrudan burada tanımlanıyor
const scriptJS = `
var socket = io(); // Aynı porttan bağlanacak

var form = document.getElementById('form');
var input = document.getElementById('input');
var messages = document.getElementById('messages');
var userCount = document.getElementById('user-count'); // HTML'de oluşturuldu
var themeToggle = document.getElementById('theme-toggle'); // HTML'de oluşturuldu
var notificationSound = document.getElementById('notification-sound'); // Bildirim sesi elementi
var sendButton = form.querySelector('button'); // Gönder butonu

var typing = false;
var timeout = undefined;
var editingMessageId = null; // Düzenlenen mesajın kimliği
const userColors = {}; // Kullanıcı kimliklerine renk atamak için obje
const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFA1', '#FF8D33', '#338DFF', '#8D33FF', '#33FF8D']; // Kullanılacak renkler
let colorIndex = 0;

function getUserColor(userId) {
  if (!userColors[userId]) {
    userColors[userId] = colors[colorIndex % colors.length];
    colorIndex++;
  }
  return userColors[userId];
}


function timeoutFunction(){
  typing = false;
  socket.emit('typing', false);
}

input.addEventListener('input', function() {
  if (typing == false) {
    typing = true;
    socket.emit('typing', true);
    timeout = setTimeout(timeoutFunction, 3000);
  } else {
    clearTimeout(timeout);
    timeout = setTimeout(timeoutFunction, 3000);
  }
});

form.addEventListener('submit', function(e) {
  e.preventDefault();
  if (input.value) {
    if (editingMessageId) {
      // Mesaj düzenleniyor
      socket.emit('edit message', { id: editingMessageId, newText: input.value });
      editingMessageId = null;
      sendButton.textContent = 'Send'; // Buton metnini geri değiştir
    } else {
      // Yeni mesaj gönderiliyor
      socket.emit('chat message', input.value);
    }
    input.value = '';
  }
});

socket.on('user count', function(count) {
  userCount.textContent = 'Online Kullanıcı: ' + count;
});

socket.on('chat message', function(msg) {
  addMessageToDOM(msg);
  saveMessageToLocalStorage(msg);
  // Kendi mesajımız değilse sesi çal
  if (msg.userId !== socket.id) { // userId kullanıyoruz
    notificationSound.play();
  }
});

socket.on('message deleted', function(id) {
  removeMessageFromDOM(id);
  removeMessageFromLocalStorage(id);
});

socket.on('message edited', function(msg) {
  updateMessageInDOM(msg);
  updateMessageInLocalStorage(msg);
});

socket.on('load messages', function(messages) {
  messages.forEach(msg => {
    addMessageToDOM(msg);
  });
});


var typingIndicator = document.createElement('div');
typingIndicator.id = 'typing-indicator';
messages.parentNode.insertBefore(typingIndicator, messages.nextSibling); // Mesaj listesinin altına ekle

socket.on('typing', function(data) {
  if (data.isTyping) {
    typingIndicator.textContent = 'Biri yazıyor...';
  } else {
    typingIndicator.textContent = '';
  }
});

// Mesajı DOM'a ekleme fonksiyonu
function addMessageToDOM(msg) {
  var item = document.createElement('li');
  item.setAttribute('data-id', msg.id); // Mesaj kimliğini veri özniteliği olarak ekle
  
  // Mesaj içeriği ve zaman damgası için ayrı divler
  item.innerHTML = \`<div class="message-content">\${msg.text}<div class="message-meta">\${msg.timestamp}</div></div>\`;
  item.setAttribute('data-user-id', msg.userId); // Kullanıcı kimliğini veri özniteliği olarak ekle

  if (msg.userId === socket.id) {
    item.classList.add('my-message');
    // Silme ve düzeltme ikonlarını ekle
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('message-actions');
    actionsDiv.innerHTML = \`<i class="fas fa-edit edit-message"></i><i class="fas fa-trash-alt delete-message"></i>\`;
    item.appendChild(actionsDiv);

    // Olay dinleyicilerini ekle
    actionsDiv.querySelector('.delete-message').addEventListener('click', function(event) {
      event.stopPropagation(); // Mesaj tıklama olayının tetiklenmesini engelle
      socket.emit('delete message', msg.id);
    });
    actionsDiv.querySelector('.edit-message').addEventListener('click', function(event) {
      event.stopPropagation(); // Mesaj tıklama olayının tetiklenmesini engelle
      startEditingMessage(msg.id, msg.text);
    });

    // Mesaj balonuna tıklama olayı dinleyicisi
    item.addEventListener('click', function() {
      // Diğer tüm aksiyon ikonlarını gizle
      document.querySelectorAll('.message-actions.visible').forEach(action => {
        action.classList.remove('visible');
      });
      // Bu mesajın aksiyon ikonlarını göster/gizle
      actionsDiv.classList.toggle('visible');
    });


  } else {
    item.classList.add('other-message');
    // Diğer kullanıcıların mesajları için renk ata
    const userColor = getUserColor(msg.userId);
    item.querySelector('.message-content').style.backgroundColor = userColor;
  }

  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
}

// Mesajı DOM'dan kaldırma fonksiyonu
function removeMessageFromDOM(id) {
  const messageElement = messages.querySelector(\`li[data-id="\${id}"]\`);
  if (messageElement) {
    messageElement.remove();
  }
}

// Mesajı DOM'da güncelleme fonksiyonu
function updateMessageInDOM(msg) {
  const messageElement = messages.querySelector(\`li[data-id="\${msg.id}"] .message-content\`);
  if (messageElement) {
    messageElement.innerHTML = \`\${msg.text}<div class="message-meta">\${msg.timestamp}</div>\`;
  }
}

// Mesajı düzenleme moduna alma
function startEditingMessage(id, text) {
  editingMessageId = id;
  input.value = text;
  sendButton.textContent = 'Save';
  input.focus();
}


// Mesajı yerel depolamaya kaydetme fonksiyonu
function saveMessageToLocalStorage(msg) {
  let messages = JSON.parse(localStorage.getItem('chatMessages') || '[]');
  messages.push(msg);
  localStorage.setItem('chatMessages', JSON.stringify(messages));
}

// Mesajı yerel depolamadan kaldırma fonksiyonu
function removeMessageFromLocalStorage(id) {
  let messages = JSON.parse(localStorage.getItem('chatMessages') || '[]');
  messages = messages.filter(msg => msg.id !== id);
  localStorage.setItem('chatMessages', JSON.stringify(messages));
}

// Mesajı yerel depolamada güncelleme fonksiyonu
function updateMessageInLocalStorage(msg) {
  let messages = JSON.parse(localStorage.getItem('chatMessages') || '[]');
  const index = messages.findIndex(m => m.id === msg.id);
  if (index !== -1) {
    messages[index] = msg;
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }
}


// Tema uygulama fonksiyonu
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.classList.remove('fa-moon');
    themeToggle.classList.add('fa-sun');
  } else {
    document.body.classList.remove('dark-mode');
    themeToggle.classList.remove('fa-sun');
    themeToggle.classList.add('fa-moon');
  }
}

// Sayfa yüklendiğinde yerel depolamadan mesajları yükleme ve tema uygulama
window.addEventListener('load', function() {
  let messages = JSON.parse(localStorage.getItem('chatMessages') || '[]');
  messages.forEach(msg => {
    addMessageToDOM(msg);
  });

  // Tema tercihini yükle ve uygula
  const savedTheme = localStorage.getItem('theme') || 'light'; // Varsayılan tema: light
  applyTheme(savedTheme);
});

// Tema değiştirme ikonu olay dinleyicisi
themeToggle.addEventListener('click', function() {
  const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  localStorage.setItem('theme', newTheme);
});
`;


app.get('/', (req, res) => {
  // HTML içeriğini CSS ve JavaScript ile birlikte gönder
  const fullHTML = indexHTML.replace('<style>\n  /* CSS içeriği doğrudan burada tanımlanacak */\n</style>', `<style>${styleCSS}</style>`).replace('<script>\n    // JavaScript içeriği doğrudan burada tanımlanacak\n  </script>', `<script>${scriptJS}</script>`);
  res.send(fullHTML);
});

// Statik dosyaları sunmak için express.static kullanın
app.use(express.static(path.join(__dirname)));


io.on('connection', (socket) => {
  console.log('a user connected');
  onlineUsers++;
  io.emit('user count', onlineUsers);

  // Yeni bağlanan kullanıcıya mevcut mesajları gönder
  socket.emit('load messages', messagesStore);

  socket.on('chat message', (msg) => {
    const messageData = {
      id: Date.now() + Math.random(), // Benzersiz mesaj kimliği
      text: msg,
      timestamp: new Date().toLocaleTimeString(),
      userId: socket.id // Kullanıcı kimliğini ekleyelim
    };
    messagesStore.push(messageData); // Mesajı sunucu tarafında sakla
    io.emit('chat message', messageData);
  });

  socket.on('delete message', (id) => {
    const index = messagesStore.findIndex(msg => msg.id === id);
    if (index !== -1) {
      // Mesajı sadece gönderen silebilir (isteğe bağlı kontrol)
      // if (messagesStore[index].userId === socket.id) {
        messagesStore.splice(index, 1); // Diziden mesajı sil
        io.emit('message deleted', id); // Tüm istemcilere silindiğini bildir
      // }
    }
  });

  socket.on('edit message', (data) => {
    const index = messagesStore.findIndex(msg => msg.id === data.id);
    if (index !== -1) {
       // Mesajı sadece gönderen düzeltebilir (isteğe bağlı kontrol)
      // if (messagesStore[index].userId === socket.id) {
        messagesStore[index].text = data.newText; // Mesajı güncelle
        messagesStore[index].timestamp = new Date().toLocaleTimeString() + ' (edited)'; // Zaman damgasını güncelle
        io.emit('message edited', messagesStore[index]); // Tüm istemcilere güncellendiğini bildir
      // }
    }
  });


  socket.on('typing', (isTyping) => {
    socket.broadcast.emit('typing', { userId: socket.id, isTyping: isTyping });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    onlineUsers--;
    io.emit('user count', onlineUsers);
  });
});

const PORT = process.env.PORT || 3000; // Portu tekrar 3000'e ayarlayalım
server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
